'use client';

import { useRouter, useParams } from 'next/navigation';
import PhotoUploader from '@/components/PhotoUploader';
import PipelineSteps from '@/components/PipelineSteps';

export default function UploadPage() {
  const router = useRouter();
  const params = useParams();
  const familyId = params.id as string;

  const handleUploadComplete = (result: {
    photos: Array<{ id: string; url: string; name: string }>;
    totalCount: number;
  }) => {
    if (result.photos.length === 0) return;
    router.push(`/family/${familyId}/analyze?uploaded=${result.photos.length}`);
  };

  return (
    <div className="min-h-screen px-6 pt-8 pb-28 bg-[#F8F4ED]">
      <button
        onClick={() => router.back()}
        className="text-[#B8A898] hover:text-[#8B7355] text-sm mb-6 transition-colors"
      >
        ← 返回
      </button>

      <div className="text-center mb-4 animate-fade-in-up">
        <p className="text-xs tracking-[0.2em] text-[#D98A45] mb-2">上传照片</p>
        <p className="text-2xl font-serif text-[#4B3B2F] mb-1">挑选有故事的瞬间</p>
        <p className="text-sm text-[#B8A898]">建议 5–20 张 · 上传后自动念念解析</p>
      </div>

      <PipelineSteps active={0} compact className="mb-6" />

      <div className="animate-fade-in-up delay-100">
        <PhotoUploader familyId={familyId} onUploadComplete={handleUploadComplete} />
      </div>
    </div>
  );
}
