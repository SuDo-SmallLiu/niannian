'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import NianNianSupplementBatchChat, {
  type SupplementBatchPhoto,
} from '@/components/niannian/NianNianSupplementBatchChat';
import { getMemoryCardStatus, computeMemoryCardCompletion } from '@/lib/memory-card-completion';
import type { AiQuestion } from '@/lib/supplement-chat';

function FamilySupplementPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const familyId = params.id as string;
  const initialPhotoId = searchParams.get('photoId') ?? undefined;

  const [photos, setPhotos] = useState<SupplementBatchPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/photos?familyId=${encodeURIComponent(familyId)}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || '加载失败');
          return;
        }

        const list = (data.photos || [])
          .filter(
            (p: {
              memoryCard?: {
                analysis_status?: string;
                user_notes?: string;
                voice_transcript?: string;
                ai_questions?: AiQuestion[];
              } | null;
            }) =>
              p.memoryCard &&
              (getMemoryCardStatus(p.memoryCard) === 'needs_supplement' ||
                computeMemoryCardCompletion(p.memoryCard) < 70)
          )
          .map(
            (p: {
              id: string;
              url: string;
              original_name: string;
              memoryCard: {
                user_notes?: string;
                ai_questions?: AiQuestion[];
              };
            }) => ({
              id: p.id,
              url: p.url,
              name: p.original_name,
              notes: p.memoryCard?.user_notes || '',
              questions: p.memoryCard?.ai_questions || [],
            })
          );

        if (!cancelled) {
          setPhotos(list);
          if (list.length === 0) setError('暂无待补充的记忆卡');
        }
      } catch {
        if (!cancelled) setError('网络错误，请重试');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [familyId]);

  const sortedPhotos = useMemo(() => {
    if (!initialPhotoId) return photos;
    const idx = photos.findIndex((p) => p.id === initialPhotoId);
    if (idx <= 0) return photos;
    return [...photos.slice(idx), ...photos.slice(0, idx)];
  }, [photos, initialPhotoId]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F8F4ED]">
        <div className="w-8 h-8 border-2 border-[#D98A45]/30 border-t-[#D98A45] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || sortedPhotos.length === 0) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#F8F4ED] px-6">
        <p className="text-[#8B7355] mb-4">{error || '暂无待补充的记忆卡'}</p>
        <button
          type="button"
          onClick={() => router.push(`/family/${familyId}/photos`)}
          className="text-[#D98A45] text-sm"
        >
          返回记忆卡列表
        </button>
      </div>
    );
  }

  return (
    <NianNianSupplementBatchChat
      familyId={familyId}
      photos={sortedPhotos}
      initialPhotoId={sortedPhotos[0]?.id}
      onBack={() => router.push(`/family/${familyId}/photos`)}
    />
  );
}

export default function FamilySupplementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center bg-[#F8F4ED]">
          <div className="w-8 h-8 border-2 border-[#D98A45]/30 border-t-[#D98A45] rounded-full animate-spin" />
        </div>
      }
    >
      <FamilySupplementPageContent />
    </Suspense>
  );
}
