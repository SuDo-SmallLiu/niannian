'use client';

import { useState, useRef, useCallback } from 'react';
import { isGooglePhotosJsonFile, isImageFile } from '@/lib/google-photos-metadata';

interface PhotoUploaderProps {
  onUploadComplete: (result: {
    photos: Array<{ id: string; url: string; name: string }>;
    totalCount: number;
    metadata?: { jsonFiles: number; matched: number };
  }) => void;
  familyId: string;
}

export default function PhotoUploader({ onUploadComplete, familyId }: PhotoUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Array<{ url: string; isJson: boolean }>>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
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

      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        const isJson = isGooglePhotosJsonFile(file.name);
        const isImage = isImageFile(file.name);
        if (!isJson && !isImage) continue;
        if (!isJson && file.size > 20 * 1024 * 1024) continue;

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

      setFiles((prev) => [...prev, ...validFiles]);
      setPreviews((prev) => [...prev, ...validPreviews]);
      setError('');
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

    const formData = new FormData();
    formData.append('familyId', familyId);
    files.forEach((file) => formData.append('photos', file));

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '上传失败');
        return;
      }

      const uploaded = Array.isArray(data.photos) ? data.photos.length : 0;
      if (uploaded !== imageCount) {
        setError(`上传完成 ${uploaded}/${imageCount} 张，部分照片可能未成功，请到记忆卡页查看`);
      }

      setProgress(100);
      onUploadComplete(data);
    } catch {
      setError('网络错误，请重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div
        className={`rounded-2xl border-2 border-dashed border-[#E8DCC8] p-10 text-center cursor-pointer transition-all ${
          dragOver ? 'bg-[#FFFBF5] border-[#D98A45]/40' : 'bg-white hover:bg-[#FFFBF5] hover:border-[#D98A45]/40'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
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

        <div className="text-4xl mb-3">📸</div>
        <p className="text-[#4B3B2F] font-medium mb-1">点击或拖拽上传照片</p>
        <p className="text-sm text-[#B8A898] mb-2">
          支持 JPG / PNG / HEIC，建议 10–50 张，单张不超过 20MB
        </p>
        <p className="text-xs text-[#D98A45]">
          📦 Google Photos 导出包：请同时选中照片 + .json 侧车文件
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
                previews.forEach((p) => { if (p.url) URL.revokeObjectURL(p.url); });
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
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
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
                上传中... {progress}%
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
