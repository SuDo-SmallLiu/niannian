'use client';

import { useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function UploadPage() {
  const router = useRouter();
  const params = useParams();
  const familyId = params.id as string;

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const valid: File[] = [];
    const validPreviews: string[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      if (!newFiles[i].type.match(/^image\//)) continue;
      if (newFiles[i].size > 20 * 1024 * 1024) continue;
      valid.push(newFiles[i]);
      validPreviews.push(URL.createObjectURL(newFiles[i]));
    }
    if (valid.length + files.length > 50) {
      setError('最多上传 50 张照片');
      return;
    }
    setFiles((prev) => [...prev, ...valid]);
    setPreviews((prev) => [...prev, ...validPreviews]);
    setError('');
  };

  const removeFile = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('请先选择照片');
      return;
    }
    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('familyId', familyId);
    files.forEach((f) => formData.append('photos', f));

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '上传失败');
        setUploading(false);
        return;
      }
      // 跳转到分析页
      router.push(`/family/${familyId}/analyze`);
    } catch {
      setError('网络错误，请重试');
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen px-6 pt-8 pb-24">
      {/* 返回 */}
      <button
        onClick={() => router.back()}
        className="text-[#B8A898] hover:text-[#8B7355] text-sm mb-6 transition-colors"
      >
        ← 返回
      </button>

      <div className="text-center mb-8 animate-fade-in-up">
        <p className="text-2xl font-serif text-[#4B3B2F] mb-1">挑选照片</p>
        <p className="text-sm text-[#B8A898]">选择那些和家有关的瞬间</p>
      </div>

      {/* 上传区域 */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="animate-fade-in-up delay-100 mb-6 rounded-2xl border-2 border-dashed border-[#E8DCC8] bg-white p-10 text-center cursor-pointer hover:border-[#D98A45]/40 hover:bg-[#FFFBF5] transition-all"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="text-3xl mb-3">📸</div>
        <p className="text-[#8B7355] font-medium mb-1">点击选择照片</p>
        <p className="text-xs text-[#D8CCB8]">支持 JPG / PNG，单张不超过 20MB</p>
      </div>

      {/* 预览 */}
      {previews.length > 0 && (
        <div className="animate-fade-in-up delay-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-[#8B7355]">
              已选 <span className="font-medium text-[#4B3B2F]">{files.length}</span> 张
            </p>
            <button
              onClick={() => {
                previews.forEach((p) => URL.revokeObjectURL(p));
                setFiles([]);
                setPreviews([]);
              }}
              className="text-xs text-[#B8A898] hover:text-[#D98A45]"
            >
              清空
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {previews.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-[#F0E8D8] group">
                <img src={p} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/40 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-[#FFF8F0] text-[#C04040] text-sm text-center">
          {error}
        </div>
      )}

      {/* 底部上传按钮 */}
      {files.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-6 z-40">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full py-4 rounded-2xl bg-[#D98A45] text-white font-serif text-lg hover:bg-[#C47A3A] disabled:opacity-50 transition-all shadow-lg shadow-[#D98A45]/20 active:scale-[0.98]"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  上传中...
                </span>
              ) : (
                `上传 ${files.length} 张照片`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
