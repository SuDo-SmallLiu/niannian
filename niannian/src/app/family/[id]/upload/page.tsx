'use client';

import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import PhotoUploader from '@/components/PhotoUploader';
import PipelineSteps from '@/components/PipelineSteps';

function UploadPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const familyId = params.id as string;
  const isOcrMode = searchParams.get('mode') === 'ocr';

  const handleUploadComplete = (result: {
    photos: Array<{ id: string; url: string; name: string }>;
    totalCount: number;
  }) => {
    if (result.photos.length === 0) return;
    const ids = result.photos.map((p) => p.id).join(',');
    if (isOcrMode) {
      router.push(
        `/family/${familyId}/analyze?ocr=1&photoIds=${encodeURIComponent(ids)}`
      );
      return;
    }
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
        <p className="text-xs tracking-[0.2em] text-[#D98A45] mb-2">
          {isOcrMode ? '智能识别 · OCR' : '上传照片'}
        </p>
        <p className="text-2xl font-serif text-[#4B3B2F] mb-1">
          {isOcrMode ? '扫描老照片' : '挑选有故事的瞬间'}
        </p>
        <p className="text-sm text-[#B8A898]">
          {isOcrMode
            ? '识别图中文字 + 场景内容 · 适合泛黄老照片'
            : '建议 5–20 张 · 上传后自动念念解析'}
        </p>
      </div>

      <PipelineSteps active={0} compact className="mb-6" />

      <div className="animate-fade-in-up delay-100">
        <PhotoUploader
          familyId={familyId}
          mode={isOcrMode ? 'ocr' : 'default'}
          onUploadComplete={handleUploadComplete}
        />
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F4ED]">
          <div className="w-8 h-8 border-2 border-[#D98A45]/30 border-t-[#D98A45] rounded-full animate-spin" />
        </div>
      }
    >
      <UploadPageContent />
    </Suspense>
  );
}
