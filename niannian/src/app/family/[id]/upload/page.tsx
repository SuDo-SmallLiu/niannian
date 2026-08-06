'use client';

import { useRouter, useParams } from 'next/navigation';
import PhotoUploader from '@/components/PhotoUploader';

export default function UploadPage() {
  const router = useRouter();
  const params = useParams();
  const familyId = params.id as string;

  const handleUploadComplete = () => {
    router.push(`/family/${familyId}/analyze`);
  };

  return (
    <div className="min-h-screen px-6 pt-8 pb-24 bg-[#F8F4ED]">
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

      <div className="animate-fade-in-up delay-100">
        <PhotoUploader familyId={familyId} onUploadComplete={handleUploadComplete} />
      </div>
    </div>
  );
}
