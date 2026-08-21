'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NianNianSupplementChat from '@/components/niannian/NianNianSupplementChat';
import type { AiQuestion } from '@/lib/supplement-chat';

interface SupplementPageProps {
  params: Promise<{ id: string }>;
}

export default function SupplementPage({ params }: SupplementPageProps) {
  const router = useRouter();
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [questions, setQuestions] = useState<AiQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const resolved = await params;
      const id = resolved.id;
      if (cancelled) return;
      setPhotoId(id);

      try {
        const res = await fetch(`/api/memory-card?photoId=${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || '加载失败');
          return;
        }
        setPhotoUrl(data.photo?.url || '');
        setPhotoName(data.photo?.original_name || '');
        setFamilyId(data.photo?.family_id ?? null);
        setNotes(data.memoryCard?.user_notes || '');
        setQuestions(data.memoryCard?.ai_questions || []);
      } catch {
        setError('网络错误，请重试');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  if (loading || !photoId) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F8F4ED]">
        <div className="w-8 h-8 border-2 border-[#D98A45]/30 border-t-[#D98A45] rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#F8F4ED] px-6">
        <p className="text-[#C04040] mb-4">{error}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-[#D98A45] text-sm"
        >
          返回
        </button>
      </div>
    );
  }

  return (
    <NianNianSupplementChat
      photoId={photoId}
      photoUrl={photoUrl}
      photoName={photoName}
      initialNotes={notes}
      initialQuestions={questions}
      onBack={() => {
        if (familyId) {
          router.push(`/family/${familyId}/photos/${photoId}`);
        } else {
          router.back();
        }
      }}
    />
  );
}
