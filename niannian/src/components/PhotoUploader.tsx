'use client';

import { useState, useRef, useCallback } from 'react';
import { isGooglePhotosJsonFile, isImageFile, matchJsonToPhoto } from '@/lib/google-photos-metadata';
import { CameraIcon, NianNianIconBox } from '@/components/icons/NianNianIcons';

interface PhotoUploaderProps {
  onUploadComplete: (result: {
    photos: Array<{ id: string; url: string; name: string }>;
    totalCount: number;
    metadata?: { jsonFiles: number; matched: number };
  }) => void;
  familyId: string;
}

const UPLOAD_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 2;
const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}

interface UploadResponse {
  ok: boolean;
  status: number;
  data: {
    error?: string;
    photos?: Array<{ id: string; url: string; name: string }>;
    totalCount?: number;
  };
}

function uploadWithProgress(
  formData: FormData,
  onProgress: (ratio: number) => void,
  timeoutMs = UPLOAD_TIMEOUT_MS
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.timeout = timeoutMs;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(event.loaded / event.total);
      }
    };

    xhr.onload = () => {
      let data: UploadResponse['data'] = {};
      try {
        data = JSON.parse(xhr.responseText || '{}');
      } catch {
        data = {};
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data });
    };

    xhr.onerror = () => reject(new Error('network'));
    xhr.ontimeout = () => reject(new Error('timeout'));
    xhr.send(formData);
  });
}

function isRetryableUploadError(err: unknown, status?: number): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg === 'timeout' || msg === 'network') return true;
  }
  if (status && status >= 500) return true;
  return false;
}

export default function PhotoUploader({ onUploadComplete, familyId }: PhotoUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Array<{ url: string; isJson: boolean }>>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageCount = files.filter((f) => isImageFile(f.name)).length;
  const jsonCount = files.filter((f) => isGooglePhotosJsonFile(f.name)).length;

  const handleFiles = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles) return;

      const validFiles: File[] = [];
      const validPreviews: Array<{ url: string; isJson: boolean }> = [];

      const skippedLarge: string[] = [];

      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        const isJson = isGooglePhotosJsonFile(file.name);
        const isImage = isImageFile(file.name);
        if (!isJson && !isImage) continue;
        if (!isJson && file.size > MAX_PHOTO_BYTES) {
          skippedLarge.push(`${file.name}（${formatFileSize(file.size)}）`);
          continue;
        }

        validFiles.push(file);
        validPreviews.push({
          url: isJson ? '' : URL.createObjectURL(file),
          isJson,
        });
      }

      const newImageCount = validFiles.filter((f) => isImageFile(f.name)).length;
      const existingImageCount = files.filter((f) => isImageFile(f.name)).length;
      if (newImageCount + existingImageCount > 50) {
        setError('最多上传 50 张照片');
        return;
      }

      if (skippedLarge.length > 0) {
        setError(`以下照片超过 20MB，已跳过：${skippedLarge.join('、')}`);
      }

      setFiles((prev) => [...prev, ...validFiles]);
      setPreviews((prev) => [...prev, ...validPreviews]);
      if (skippedLarge.length === 0) setError('');
    },
    [files]
  );

  const removeFile = (index: number) => {
    if (previews[index]?.url) URL.revokeObjectURL(previews[index].url);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (imageCount === 0) {
      setError('请先选择照片');
      return;
    }

    if (imageCount < 10) {
      setError('建议上传至少 10 张照片以获得更好的故事效果');
    }

    setUploading(true);
    setError('');
    setProgress(0);
    setUploadLabel('准备上传…');

    const imageFiles = files.filter((f) => isImageFile(f.name));
    const jsonFiles = files.filter((f) => isGooglePhotosJsonFile(f.name));
    const uploadedPhotos: Array<{ id: string; url: string; name: string }> = [];
    let totalCount = 0;

    const uploadOnce = async (
      formData: FormData,
      onFileProgress: (ratio: number) => void
    ): Promise<UploadResponse> => {
      let lastResult: UploadResponse | undefined;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const result = await uploadWithProgress(formData, onFileProgress);
          if (
            !result.ok &&
            isRetryableUploadError(null, result.status) &&
            attempt < MAX_RETRIES
          ) {
            lastResult = result;
            onFileProgress(0);
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
          return result;
        } catch (err) {
          if (attempt < MAX_RETRIES && isRetryableUploadError(err)) {
            onFileProgress(0);
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
          throw err;
        }
      }

      if (lastResult) return lastResult;
      throw new Error('network');
    };

    try {
      for (let i = 0; i < imageFiles.length; i++) {
        const current = imageFiles[i];
        const matchedJson = jsonFiles.filter((jf) => matchJsonToPhoto(current.name, jf.name));
        const shortName =
          current.name.length > 18 ? `${current.name.slice(0, 15)}…` : current.name;
        setUploadLabel(`正在上传 ${i + 1}/${imageFiles.length} · ${shortName}`);

        const formData = new FormData();
        formData.append('familyId', familyId);
        formData.append('photos', current);
        matchedJson.forEach((file) => formData.append('photos', file));

        const requestBytes = [current, ...matchedJson].reduce((sum, f) => sum + f.size, 0);

        const { ok, status, data } = await uploadOnce(formData, (ratio) => {
          const overall = ((i + ratio) / imageFiles.length) * 100;
          setProgress(Math.min(99, Math.round(overall)));
        });

        if (!ok) {
          if (status === 413) {
            throw new Error(
              `「${current.name}」（${formatFileSize(current.size)}，本次请求 ${formatFileSize(requestBytes)}）上传被拒绝。` +
                `若照片不大仍失败，多半是服务器 nginx 未配置 client_max_body_size，请联系管理员`
            );
          }
          throw new Error(data.error || `「${current.name}」上传失败（${status}）`);
        }

        uploadedPhotos.push(...(data.photos || []));
        totalCount = data.totalCount ?? totalCount;
        setProgress(Math.min(99, Math.round(((i + 1) / imageFiles.length) * 100)));
      }

      if (uploadedPhotos.length !== imageCount) {
        setError(
          `上传完成 ${uploadedPhotos.length}/${imageCount} 张，部分照片可能未成功，请到记忆卡页查看`
        );
      }

      setProgress(100);
      setUploadLabel('上传完成');
      onUploadComplete({
        photos: uploadedPhotos,
        totalCount,
        metadata: jsonFiles.length > 0 ? { jsonFiles: jsonFiles.length, matched: 0 } : undefined,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const lower = msg.toLowerCase();
      if (
        lower.includes('failed to fetch') ||
        lower.includes('networkerror') ||
        lower.includes('load failed') ||
        lower === 'network'
      ) {
        const done = uploadedPhotos.length;
        setError(
          done > 0
            ? `网络连接中断，已成功 ${done}/${imageCount} 张，请检查网络后重试剩余照片`
            : '网络连接中断，请检查网络或换用 Wi-Fi 后重试'
        );
      } else if (lower === 'timeout') {
        const done = uploadedPhotos.length;
        setError(
          done > 0
            ? `上传超时，已成功 ${done}/${imageCount} 张，请重试剩余照片`
            : '上传超时，请检查网络后重试'
        );
      } else {
        setError(msg || '网络错误，请重试');
      }
    } finally {
      setUploading(false);
      setUploadLabel('');
    }
  };

  return (
    <div>
      <div
        className={`rounded-2xl border-2 border-dashed border-[#E8DCC8] p-10 text-center cursor-pointer transition-all ${
          dragOver ? 'bg-[#FFFBF5] border-[#D98A45]/40' : 'bg-white hover:bg-[#FFFBF5] hover:border-[#D98A45]/40'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic,image/heif,image/webp,.json,application/json"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <NianNianIconBox icon={CameraIcon} className="mb-3 mx-auto" />
        <p className="text-[#4B3B2F] font-medium mb-1">点击或拖拽上传照片</p>
        <p className="text-sm text-[#B8A898] mb-2">
          支持 JPG / PNG / HEIC，建议 10–50 张，单张不超过 20MB
        </p>
        <p className="text-xs text-[#D98A45]">
          Google Photos 导出包：请同时选中照片 + .json 侧车文件
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-[#8B7355]">
              已选 <span className="text-[#4B3B2F] font-medium">{imageCount}</span> 张照片
              {jsonCount > 0 && (
                <span className="text-[#D98A45]"> + {jsonCount} 个 JSON 元数据</span>
              )}
            </p>
            <button
              onClick={() => {
                previews.forEach((p) => {
                  if (p.url) URL.revokeObjectURL(p.url);
                });
                setFiles([]);
                setPreviews([]);
              }}
              className="text-sm text-[#B8A898] hover:text-[#D98A45] transition-colors"
            >
              清空全部
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {files.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="relative group aspect-square rounded-xl overflow-hidden border border-[#E8DCC8] bg-[#FFF8F0] flex items-center justify-center"
              >
                {previews[i]?.isJson ? (
                  <div className="text-center p-2">
                    <div className="text-2xl mb-1">📄</div>
                    <p className="text-[10px] text-[#8B7355] leading-tight line-clamp-3">{file.name}</p>
                  </div>
                ) : (
                  <img src={previews[i]?.url} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-sm">
          {error}
        </div>
      )}

      {uploading && (
        <div className="mt-4">
          <div className="h-2 rounded-full bg-[#E8DCC8] overflow-hidden">
            <div
              className="h-full bg-[#D98A45] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {uploadLabel && (
            <p className="text-xs text-[#8B7355] text-center mt-2 truncate">{uploadLabel}</p>
          )}
        </div>
      )}

      {imageCount > 0 && (
        <div className="mt-8">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-4 rounded-2xl bg-[#D98A45] text-white font-serif text-lg hover:bg-[#C47A3A] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#D98A45]/20"
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                上传中… {progress}%
              </span>
            ) : (
              `上传 ${imageCount} 张照片${jsonCount > 0 ? `（含 ${jsonCount} 个 JSON）` : ''}`
            )}
          </button>
        </div>
      )}
    </div>
  );
}
