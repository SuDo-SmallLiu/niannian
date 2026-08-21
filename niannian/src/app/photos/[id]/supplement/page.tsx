'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SupplementPageProps {
  params: Promise<{ id: string }>;
}

/** 单张入口 → 重定向到家庭批量补充对话（可左右滑动） */
export default function SupplementPage({ params }: SupplementPageProps) {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const resolved = await params;
      const photoId = resolved.id;
      try {
        const res = await fetch(`/api/memory-card?photoId=${encodeURIComponent(photoId)}`);
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(data.error || '加载失败');
          return;
        }
        const familyId = data.photo?.family_id;
        if (!familyId) {
          if (!cancelled) setError('无法定位照片所属家庭');
          return;
        }
        if (!cancelled) {
          router.replace(
            `/family/${familyId}/supplement?photoId=${encodeURIComponent(photoId)}`
          );
        }
      } catch {
        if (!cancelled) setError('网络错误，请重试');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  if (error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#F8F4ED] px-6">
        <p className="text-[#C04040] mb-4">{error}</p>
        <button type="button" onClick={() => router.back()} className="text-[#D98A45] text-sm">
          返回
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#F8F4ED]">
      <div className="w-8 h-8 border-2 border-[#D98A45]/30 border-t-[#D98A45] rounded-full animate-spin" />
    </div>
  );
}
