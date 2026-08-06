'use client';

import { useState, useRef, useCallback } from 'react';

interface PhotoUploaderProps {
  onUploadComplete: (result: { photos: Array<{ id: string; url: string; name: string }>; totalCount: number }) => void;
  familyId: string;
}

export default function PhotoUploader({ onUploadComplete, familyId }: PhotoUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles) return;

      const validFiles: File[] = [];
      const validPreviews: string[] = [];

      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        // 验证文件类型
        if (!file.type.match(/^image\/(jpeg|png|heic|heif|webp)$/)) {
          continue;
        }
        // 验证文件大小 (20MB)
        if (file.size > 20 * 1024 * 1024) {
          continue;
        }
        validFiles.push(file);
        validPreviews.push(URL.createObjectURL(file));
      }

      if (validFiles.length + files.length > 50) {
        setError('最多上传50张照片');
        return;
      }

      setFiles((prev) => [...prev, ...validFiles]);
      setPreviews((prev) => [...prev, ...validPreviews]);
      setError('');
    },
    [files.length]
  );

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('请先选择照片');
      return;
    }

    if (files.length < 10) {
      setError('建议上传至少10张照片以获得更好的故事效果');
      // 不阻止上传，只提示
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('familyId', familyId);
    files.forEach((file) => formData.append('photos', file));

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '上传失败');
        return;
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
      {/* 上传区域 */}
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
          accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="text-4xl mb-3">📸</div>
        <p className="text-[#4B3B2F] font-medium mb-1">点击或拖拽上传照片</p>
        <p className="text-sm text-[#B8A898]">
          支持 JPG / PNG / HEIC，建议 10-50 张，单张不超过 20MB
        </p>
      </div>

      {/* 照片预览 */}
      {previews.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-[#8B7355]">
              已选择 <span className="text-[#4B3B2F] font-medium">{files.length}</span> 张照片
            </p>
            <button
              onClick={() => {
                previews.forEach((p) => URL.revokeObjectURL(p));
                setFiles([]);
                setPreviews([]);
              }}
              className="text-sm text-[#B8A898] hover:text-[#D98A45] transition-colors"
            >
              清空全部
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {previews.map((preview, i) => (
              <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-[#E8DCC8]">
                <img
                  src={preview}
                  alt={`照片 ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  ×
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs py-1 px-2 truncate">
                  {files[i]?.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-sm">
          {error}
        </div>
      )}

      {/* 上传按钮 */}
      {files.length > 0 && (
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
              `上传 ${files.length} 张照片`
            )}
          </button>
        </div>
      )}
    </div>
  );
}
