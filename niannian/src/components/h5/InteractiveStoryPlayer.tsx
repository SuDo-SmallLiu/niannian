'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { H5Slide } from '@/lib/h5-story-slides';
import { ChevronLeft, Pause, Play, X } from 'lucide-react';

interface InteractiveStoryPlayerProps {
  slides: H5Slide[];
  onClose?: () => void;
  autoPlayMs?: number;
  showClose?: boolean;
}

export default function InteractiveStoryPlayer({
  slides,
  onClose,
  autoPlayMs = 6000,
  showClose = true,
}: InteractiveStoryPlayerProps) {
  const [index, setIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const total = slides.length;
  const slide = slides[index];

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (i >= total - 1) return i;
      setAnimKey((k) => k + 1);
      return i + 1;
    });
  }, [total]);

  const goPrev = useCallback(() => {
    setIndex((i) => {
      if (i <= 0) return i;
      setAnimKey((k) => k + 1);
      return i - 1;
    });
  }, []);

  useEffect(() => {
    if (!autoPlay || index >= total - 1) return;
    const timer = setTimeout(goNext, autoPlayMs);
    return () => clearTimeout(timer);
  }, [autoPlay, index, total, autoPlayMs, goNext]);

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.35) goPrev();
    else goNext();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < -40) goNext();
    else if (dx > 40) goPrev();
  };

  if (!slide) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black text-white select-none overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 进度条 */}
      <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {slides.map((s, i) => (
          <div key={s.id} className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: i <= index ? '100%' : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* 顶栏控制 */}
      <div className="absolute top-[max(2rem,env(safe-area-inset-top))] left-0 right-0 z-30 flex items-center justify-between px-4">
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center disabled:opacity-30"
          aria-label="上一页"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoPlay((v) => !v)}
            className="h-10 px-3 rounded-full bg-black/30 flex items-center gap-1.5 text-sm"
          >
            {autoPlay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {autoPlay ? '暂停' : '自动播放'}
          </button>
          {showClose && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 点击区域 */}
      <div className="absolute inset-0 z-20" onClick={handleTap} role="presentation" />

      {/* 幻灯片内容 */}
      <div key={animKey} className="absolute inset-0 h5-slide-enter">
        <SlideContent slide={slide} />
      </div>

      {/* 底部提示 */}
      {index < total - 1 && (
        <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-0 right-0 z-30 text-center pointer-events-none">
          <p className="text-white/60 text-sm animate-soft-pulse">
            {index === 0 ? '点击或左滑继续 →' : '← 点击左右切换 →'}
          </p>
        </div>
      )}

      {index === total - 1 && (
        <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-0 right-0 z-30 flex justify-center px-6">
          <button
            type="button"
            onClick={onClose}
            className="pointer-events-auto h-12 px-8 rounded-full bg-white text-[#4B3B2F] font-medium text-base"
          >
            返回
          </button>
        </div>
      )}
    </div>
  );
}

function SlideContent({ slide }: { slide: H5Slide }) {
  if (slide.type === 'cover') {
    return (
      <div className="relative w-full h-full">
        {slide.coverUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover h5-ken-burns" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
          </>
        )}
        {!slide.coverUrl && <div className="absolute inset-0 bg-gradient-to-br from-[#4B3B2F] to-[#8B7355]" />}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-28 px-8 text-center">
          {slide.familyName && (
            <p className="text-sm tracking-[0.25em] text-[#F0DCC8] mb-3 h5-text-enter">{slide.familyName}</p>
          )}
          {slide.theme && (
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/15 text-sm mb-4 h5-text-enter h5-delay-1">
              {slide.theme}
            </span>
          )}
          <h1 className="text-3xl font-serif font-bold leading-snug mb-4 h5-text-enter h5-delay-2">
            {slide.title}
          </h1>
          {slide.summary && (
            <p className="text-base text-white/80 leading-relaxed font-serif max-w-sm h5-text-enter h5-delay-3">
              {slide.summary}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (slide.type === 'interstitial') {
    return (
      <div className="relative w-full h-full">
        {slide.coverUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover h5-ken-burns" />
            <div className="absolute inset-0 bg-black/70" />
          </>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <p className="text-sm tracking-[0.3em] text-[#D98A45] mb-4 h5-text-enter">
            Chapter {String(slide.interstitialIndex).padStart(2, '0')} / {slide.interstitialTotal}
          </p>
          {slide.interstitialTheme && (
            <span className="text-sm text-white/60 mb-3 h5-text-enter h5-delay-1">{slide.interstitialTheme}</span>
          )}
          <h2 className="text-2xl font-serif font-bold h5-text-enter h5-delay-2">{slide.interstitialTitle}</h2>
        </div>
      </div>
    );
  }

  if (slide.type === 'chapter') {
    return (
      <div className="relative w-full h-full bg-[#1a1612]">
        {slide.photoUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.photoUrl} alt="" className="absolute inset-0 w-full h-full object-cover h5-ken-burns" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          </>
        )}
        <div className="absolute top-[max(4.5rem,env(safe-area-inset-top))] left-0 right-0 text-center z-10">
          <p className="text-xs tracking-[0.35em] text-white/50">
            {String(slide.chapterIndex).padStart(2, '0')} / {String(slide.chapterTotal).padStart(2, '0')}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-28">
          {(slide.meta?.taken_at || slide.meta?.location) && (
            <div className="flex flex-wrap gap-2 mb-3 h5-text-enter">
              {slide.meta.taken_at && (
                <span className="px-3 py-1 rounded-full bg-white/15 text-xs">{slide.meta.taken_at}</span>
              )}
              {slide.meta.location && (
                <span className="px-3 py-1 rounded-full bg-white/15 text-xs">{slide.meta.location}</span>
              )}
            </div>
          )}
          {slide.memorySnippet && (
            <p className="text-xs text-white/50 mb-2 h5-text-enter h5-delay-1">{slide.memorySnippet}</p>
          )}
          {slide.narrative && (
            <p className="text-lg font-serif leading-relaxed text-white h5-text-enter h5-delay-2">
              {slide.narrative}
            </p>
          )}
        </div>
      </div>
    );
  }

  // outro
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-[#4B3B2F] via-[#6B5A48] to-[#D98A45] flex flex-col items-center justify-center px-8 text-center">
      <p className="text-4xl mb-6 h5-text-enter">✦</p>
      <h2 className="text-2xl font-serif font-bold mb-4 h5-text-enter h5-delay-1">{slide.title}</h2>
      {slide.summary && (
        <p className="text-base text-white/80 mb-6 h5-text-enter h5-delay-2">{slide.summary}</p>
      )}
      {slide.connectionAction && (
        <div className="bg-white/10 rounded-2xl p-5 max-w-sm h5-text-enter h5-delay-3">
          <p className="text-sm leading-relaxed text-white/90">💡 {slide.connectionAction}</p>
        </div>
      )}
      {slide.familyName && (
        <p className="text-sm text-white/50 mt-8 h5-text-enter h5-delay-4">— {slide.familyName} —</p>
      )}
    </div>
  );
}
