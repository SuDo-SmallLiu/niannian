'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import SupplementPhotoCarousel, {
  type SupplementCarouselPhoto,
} from '@/components/niannian/SupplementPhotoCarousel';
import NianNianSupplementChat, {
  type NianNianSupplementChatHandle,
} from '@/components/niannian/NianNianSupplementChat';
import type { AiQuestion } from '@/lib/supplement-chat';
import {
  getSupplementProgressPercent,
  getAnswerForItem,
  buildQuestionQueue,
} from '@/lib/supplement-chat';

export interface SupplementBatchPhoto {
  id: string;
  url: string;
  name: string;
  notes: string;
  questions: AiQuestion[];
}

interface NianNianSupplementBatchChatProps {
  familyId: string;
  photos: SupplementBatchPhoto[];
  initialPhotoId?: string;
  onBack?: () => void;
}

function photoProgress(photo: SupplementBatchPhoto): number {
  const queue = buildQuestionQueue(photo.questions);
  const fixedAnswers = photo.notes.trim() ? photo.notes.trim().split('\n') : [];
  let answered = 0;
  for (let i = 0; i < queue.length; i++) {
    const ans = getAnswerForItem(queue[i], fixedAnswers, photo.questions);
    if (ans) answered = i + 1;
    else break;
  }
  return getSupplementProgressPercent(answered, queue.length);
}

export default function NianNianSupplementBatchChat({
  familyId,
  photos,
  initialPhotoId,
  onBack,
}: NianNianSupplementBatchChatProps) {
  const router = useRouter();
  const initialIndex = useMemo(() => {
    if (!initialPhotoId) return 0;
    const idx = photos.findIndex((p) => p.id === initialPhotoId);
    return idx >= 0 ? idx : 0;
  }, [photos, initialPhotoId]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [doneIds, setDoneIds] = useState<Set<string>>(() => new Set());
  const [photoData, setPhotoData] = useState(photos);
  const switchingRef = useRef(false);
  const chatRef = useRef<NianNianSupplementChatHandle>(null);

  const carouselPhotos: SupplementCarouselPhoto[] = useMemo(
    () =>
      photoData.map((p) => ({
        id: p.id,
        url: p.url,
        name: p.name,
        progress: photoProgress(p),
        done: doneIds.has(p.id),
      })),
    [photoData, doneIds]
  );

  const current = photoData[currentIndex];

  const updatePhotoData = useCallback((photoId: string, patch: Partial<SupplementBatchPhoto>) => {
    setPhotoData((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, ...patch } : p))
    );
  }, []);

  const goToIndex = useCallback(
    async (nextIndex: number) => {
      if (switchingRef.current) return;
      if (nextIndex === currentIndex) return;
      if (nextIndex < 0 || nextIndex >= photoData.length) return;
      switchingRef.current = true;
      await chatRef.current?.saveIfNeeded();
      setCurrentIndex(nextIndex);
      switchingRef.current = false;
    },
    [currentIndex, photoData.length]
  );

  const handleSaveAndNext = useCallback(async () => {
    if (!current) return;
    setDoneIds((prev) => new Set(prev).add(current.id));

    if (currentIndex < photoData.length - 1) {
      await goToIndex(currentIndex + 1);
      return;
    }

    router.push(`/family/${familyId}/photos?generateStory=1`);
  }, [current, currentIndex, photoData.length, familyId, goToIndex, router]);

  if (!current) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F8F4ED] px-6 text-center">
        <p className="text-[#8B7355]">没有待补充的记忆卡</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F8F4ED]">
      <SupplementPhotoCarousel
        photos={carouselPhotos}
        currentIndex={currentIndex}
        onIndexChange={goToIndex}
      />

      <NianNianSupplementChat
        ref={chatRef}
        key={current.id}
        photoId={current.id}
        photoUrl={current.url}
        photoName={current.name}
        initialNotes={current.notes}
        initialQuestions={current.questions}
        photoIndex={currentIndex}
        photoTotal={photoData.length}
        onBack={onBack}
        onSaveAndNext={photoData.length > 1 ? handleSaveAndNext : undefined}
        onSaved={(data) => {
          updatePhotoData(current.id, {
            notes: data.user_notes,
            questions: data.ai_questions,
          });
        }}
      />
    </div>
  );
}
