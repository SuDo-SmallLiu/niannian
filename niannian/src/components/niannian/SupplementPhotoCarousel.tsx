'use client';

import { useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SupplementCarouselPhoto {
  id: string;
  url: string;
  name?: string;
  /** 0–100 */
  progress?: number;
  done?: boolean;
}

interface SupplementPhotoCarouselProps {
  photos: SupplementCarouselPhoto[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  className?: string;
}

export default function SupplementPhotoCarousel({
  photos,
  currentIndex,
  onIndexChange,
  className,
}: SupplementPhotoCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      const el = scrollerRef.current;
      if (!el || photos.length === 0) return;
      const clamped = Math.max(0, Math.min(index, photos.length - 1));
      const child = el.children[clamped] as HTMLElement | undefined;
      child?.scrollIntoView({ behavior, inline: 'center', block: 'nearest' });
    },
    [photos.length]
  );

  useEffect(() => {
    scrollToIndex(currentIndex, 'auto');
  }, [currentIndex, scrollToIndex]);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el || photos.length === 0) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let closest = 0;
    let minDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const node = child as HTMLElement;
      const nodeCenter = node.offsetLeft + node.offsetWidth / 2;
      const dist = Math.abs(nodeCenter - center);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    if (closest !== currentIndex) onIndexChange(closest);
  };

  if (photos.length === 0) return null;

  const current = photos[currentIndex];

  return (
    <div className={cn('shrink-0 bg-[#FFFBF7] border-b border-[#E8DCC8]', className)}>
      <div className="relative px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-[#8B7355]">
            第 <span className="font-semibold text-[#DF8B3A]">{currentIndex + 1}</span> /{' '}
            {photos.length} 张 · 左右滑动切换
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="上一张"
              disabled={currentIndex <= 0}
              onClick={() => onIndexChange(currentIndex - 1)}
              className="w-8 h-8 rounded-full border border-[#E8DCC8] bg-white flex items-center justify-center disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4 text-[#8B7355]" />
            </button>
            <button
              type="button"
              aria-label="下一张"
              disabled={currentIndex >= photos.length - 1}
              onClick={() => onIndexChange(currentIndex + 1)}
              className="w-8 h-8 rounded-full border border-[#E8DCC8] bg-white flex items-center justify-center disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4 text-[#8B7355]" />
            </button>
          </div>
        </div>

        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? 0;
          }}
          onTouchEnd={(e) => {
            const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
            if (Math.abs(dx) < 40) return;
            if (dx < 0 && currentIndex < photos.length - 1) onIndexChange(currentIndex + 1);
            if (dx > 0 && currentIndex > 0) onIndexChange(currentIndex - 1);
          }}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-1 px-1"
        >
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => onIndexChange(i)}
              className={cn(
                'relative shrink-0 snap-center rounded-2xl overflow-hidden border-2 transition-all',
                i === currentIndex
                  ? 'w-[200px] h-[200px] border-[#DF8B3A] shadow-md'
                  : 'w-[120px] h-[120px] border-[#E8DCC8] opacity-80'
              )}
            >
              <Image
                src={photo.url}
                alt={photo.name || '照片'}
                fill
                className="object-cover"
                sizes={i === currentIndex ? '200px' : '120px'}
                unoptimized
              />
              {photo.done && (
                <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#5A8F6B] text-white text-[10px] flex items-center justify-center">
                  ✓
                </span>
              )}
              {typeof photo.progress === 'number' && !photo.done && (
                <span className="absolute bottom-0 inset-x-0 bg-black/45 text-white text-[10px] py-0.5 text-center">
                  {photo.progress}%
                </span>
              )}
            </button>
          ))}
        </div>

        {current && (
          <p className="text-[11px] text-[#B8A898] text-center mt-1 truncate px-2">
            {current.name || `照片 ${currentIndex + 1}`}
          </p>
        )}
      </div>
    </div>
  );
}
