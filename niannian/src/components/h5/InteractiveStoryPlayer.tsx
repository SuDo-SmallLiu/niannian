'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { H5Slide } from '@/lib/h5-story-slides';
import { getMusicFromSlide } from '@/lib/theme-music';
import { estimateNarrationMs, getSlideNarrationText } from '@/lib/slide-narration';
import { useThemeMusic } from '@/hooks/useThemeMusic';
import { useNarration } from '@/hooks/useNarration';
import { ChevronLeft, Mic, MicOff, Pause, Play, Share2, Volume2, VolumeX, X } from 'lucide-react';

interface InteractiveStoryPlayerProps {
  slides: H5Slide[];
  onClose?: () => void;
  onShare?: () => void;
  autoPlayMs?: number;
  showClose?: boolean;
  enableMusic?: boolean;
  enableNarration?: boolean;
  appreciateMode?: boolean;
  /** 用户点击开始后自动播放（电影/故事播放页） */
  autoStart?: boolean;
  /** 人生电影 ID，用于 MeloTTS 旁白缓存 */
  movieId?: string;
}

export default function InteractiveStoryPlayer({
  slides,
  onClose,
  onShare,
  autoPlayMs = 6000,
  showClose = true,
  enableMusic = true,
  enableNarration = false,
  appreciateMode = false,
  autoStart = false,
  movieId,
}: InteractiveStoryPlayerProps) {
  const [index, setIndex] = useState(0);
  /** 必须用户点击「开始播放」后才自动翻页，避免无声快闪 */
  const [autoPlay, setAutoPlay] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [narrationOn, setNarrationOn] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [progressKey, setProgressKey] = useState(0);
  const [narrationKey, setNarrationKey] = useState(0);
  const [narrationDurationMs, setNarrationDurationMs] = useState<number | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const total = slides.length;
  const slide = slides[index];

  const narrationText = useMemo(() => {
    if (!enableNarration || !slide) return null;
    return getSlideNarrationText(slide);
  }, [enableNarration, slide]);

  const slideDurationMs = useMemo(() => {
    if (enableNarration && narrationOn && narrationText) {
      const ms =
        slide?.narrationDurationMs ||
        narrationDurationMs ||
        estimateNarrationMs(narrationText);
      return Math.max(ms, 3500);
    }
    return autoPlayMs;
  }, [
    enableNarration,
    narrationOn,
    narrationText,
    autoPlayMs,
    slide?.narrationDurationMs,
    narrationDurationMs,
  ]);

  useEffect(() => {
    setNarrationDurationMs(null);
  }, [index, narrationKey]);

  const activeMusic = useMemo(() => getMusicFromSlide(slide), [slide]);

  const { prime: primeMusic } = useThemeMusic({
    src: activeMusic.file,
    volume: activeMusic.volume,
    enabled: enableMusic && musicOn,
    unlocked: audioUnlocked,
    duck: enableNarration && narrationOn && Boolean(narrationText),
  });

  const unlockAudio = useCallback(() => {
    setAudioUnlocked(true);
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.getVoices();
      const probe = new Audio(
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=='
      );
      probe.volume = 0.01;
      void probe.play().then(() => probe.pause()).catch(() => {});
    }
  }, []);

  const handleStartPlayback = useCallback(() => {
    unlockAudio();
    primeMusic();
    setAutoPlay(true);
    setProgressKey((k) => k + 1);
    setNarrationKey((k) => k + 1);
  }, [unlockAudio, primeMusic]);

  const goNext = useCallback(() => {
    unlockAudio();
    primeMusic();
    setIndex((i) => {
      if (i >= total - 1) return i;
      setAnimKey((k) => k + 1);
      setProgressKey((k) => k + 1);
      setNarrationKey((k) => k + 1);
      return i + 1;
    });
  }, [total, unlockAudio, primeMusic]);

  const goPrev = useCallback(() => {
    unlockAudio();
    primeMusic();
    setIndex((i) => {
      if (i <= 0) return i;
      setAnimKey((k) => k + 1);
      setProgressKey((k) => k + 1);
      setNarrationKey((k) => k + 1);
      return i - 1;
    });
  }, [unlockAudio]);

  const handleNarrationEnd = useCallback(() => {
    if (autoPlay && index < total - 1) {
      goNext();
    }
  }, [autoPlay, index, total, goNext]);

  useNarration({
    text: narrationText,
    enabled: enableNarration && narrationOn,
    unlocked: audioUnlocked,
    speakKey: `${index}-${narrationKey}`,
    slideId: slide?.id,
    movieId,
    audioUrl: slide?.narrationUrl,
    onEnd: handleNarrationEnd,
    onDurationKnown: setNarrationDurationMs,
  });

  const toggleAutoPlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    unlockAudio();
    setAutoPlay((v) => {
      if (!v) {
        setProgressKey((k) => k + 1);
        setNarrationKey((k) => k + 1);
      }
      return !v;
    });
  }, [unlockAudio, primeMusic]);

  const toggleMusic = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    unlockAudio();
    setMusicOn((v) => {
      const next = !v;
      if (next) {
        primeMusic(true);
      }
      return next;
    });
  }, [unlockAudio, primeMusic]);

  const toggleNarration = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    unlockAudio();
    setNarrationOn((v) => {
      if (!v) setNarrationKey((k) => k + 1);
      return !v;
    });
  }, [unlockAudio]);

  useEffect(() => {
    if (!autoPlay || index >= total - 1) return;
    if (!audioUnlocked) return;
    // 旁白模式下由旁白结束驱动翻页，不用定时器
    if (enableNarration && narrationOn && narrationText) return;

    const timer = setTimeout(goNext, slideDurationMs);
    return () => clearTimeout(timer);
  }, [
    autoPlay,
    index,
    total,
    slideDurationMs,
    goNext,
    progressKey,
    enableNarration,
    narrationOn,
    narrationText,
    audioUnlocked,
  ]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (side: 'prev' | 'next') => (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNext();
      else goPrev();
      return;
    }
    if (side === 'prev') goPrev();
    else goNext();
  };

  if (!slide) return null;

  const waitingForStart = !audioUnlocked && (autoStart || appreciateMode || enableMusic || enableNarration);

  return (
    <div
      className="fixed inset-0 z-[200] bg-black text-white select-none overflow-hidden"
      onTouchStart={handleTouchStart}
    >
      {waitingForStart && (
        <button
          type="button"
          onClick={handleStartPlayback}
          className="absolute inset-0 z-[250] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm touch-manipulation"
          aria-label="开始播放"
        >
          <span className="w-20 h-20 rounded-full bg-[#D98A45] flex items-center justify-center mb-6 shadow-lg shadow-[#D98A45]/40 animate-soft-pulse">
            <Play className="w-10 h-10 ml-1" />
          </span>
          <p className="text-xl font-serif font-medium mb-2">点击开始播放</p>
          <p className="text-sm text-white/60">
            {enableMusic && enableNarration
              ? '配乐 · 旁白 · 自动翻页'
              : enableNarration
                ? '旁白 · 自动翻页'
                : '自动翻页'}
          </p>
        </button>
      )}
      {/* 进度条 */}
      <div className="absolute top-0 left-0 right-0 z-40 flex gap-1 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pointer-events-none">
        {slides.map((s, i) => (
          <div key={s.id} className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden">
            <div
              key={i === index ? `progress-${progressKey}` : s.id}
              className={`h-full bg-white rounded-full ${
                i < index
                  ? 'w-full'
                  : i === index && autoPlay
                    ? 'h5-progress-active w-0'
                    : i === index
                      ? 'w-full'
                      : 'w-0'
              }`}
              style={
                i === index && autoPlay
                  ? ({ '--progress-ms': `${slideDurationMs}ms` } as React.CSSProperties)
                  : undefined
              }
            />
          </div>
        ))}
      </div>

      {/* 顶栏控制 */}
      <div className="absolute top-[max(2rem,env(safe-area-inset-top))] left-0 right-0 z-40 flex items-center justify-between px-4 pointer-events-none">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          disabled={index === 0}
          className="pointer-events-auto w-11 h-11 rounded-full bg-black/40 flex items-center justify-center disabled:opacity-30 touch-manipulation"
          aria-label="上一页"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2 pointer-events-auto">
          {!appreciateMode && (
            <>
              {enableNarration && (
                <button
                  type="button"
                  onClick={toggleNarration}
                  className={`w-11 h-11 rounded-full flex items-center justify-center touch-manipulation ${
                    narrationOn ? 'bg-[#D98A45]/80 text-white' : 'bg-black/40 text-white/60'
                  }`}
                  aria-label={narrationOn ? '关闭旁白' : '开启旁白'}
                >
                  {narrationOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
              )}
              {enableMusic && (
                <button
                  type="button"
                  onClick={toggleMusic}
                  className={`w-11 h-11 rounded-full flex items-center justify-center touch-manipulation ${
                    musicOn ? 'bg-[#D98A45]/80 text-white' : 'bg-black/40 text-white/60'
                  }`}
                  aria-label={musicOn ? '关闭音乐' : '开启音乐'}
                >
                  {musicOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              )}
              <button
                type="button"
                onClick={toggleAutoPlay}
                className={`h-11 px-4 rounded-full flex items-center gap-1.5 text-sm touch-manipulation ${
                  autoPlay ? 'bg-[#D98A45] text-white' : 'bg-black/40 text-white'
                }`}
              >
                {autoPlay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {autoPlay ? '暂停' : '自动播放'}
              </button>
              {onShare && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    unlockAudio();
                    onShare();
                  }}
                  className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center touch-manipulation"
                  aria-label="分享"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
          {showClose && onClose && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="w-11 h-11 rounded-full bg-black/40 flex items-center justify-center touch-manipulation"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 左右点击区（不与顶栏重叠） */}
      <button
        type="button"
        aria-label="上一页"
        className="absolute left-0 top-24 bottom-24 w-[35%] z-30 touch-manipulation"
        onClick={(e) => {
          e.stopPropagation();
          goPrev();
        }}
        onTouchEnd={handleTouchEnd('prev')}
      />
      <button
        type="button"
        aria-label="下一页"
        className="absolute right-0 top-24 bottom-24 w-[65%] z-30 touch-manipulation"
        onClick={(e) => {
          e.stopPropagation();
          goNext();
        }}
        onTouchEnd={handleTouchEnd('next')}
      />

      {/* 幻灯片内容 */}
      <div key={animKey} className="absolute inset-0 h5-slide-enter pointer-events-none">
        <SlideContent slide={slide} />
      </div>

      {/* 底部提示 */}
      {index < total - 1 && !autoPlay && !appreciateMode && (
        <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-0 right-0 z-40 text-center pointer-events-none">
          <p className="text-white/60 text-sm animate-soft-pulse">
            {index === 0 ? '点击或左滑继续 →' : '← 点击左右切换 →'}
          </p>
        </div>
      )}

      {autoPlay && index < total - 1 && (
        <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-0 right-0 z-40 text-center pointer-events-none">
          <p className="text-[#D98A45] text-sm">自动播放中…</p>
        </div>
      )}

      {index === total - 1 && onClose && (
        <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-0 right-0 z-40 flex justify-center px-6 pointer-events-none">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="pointer-events-auto h-12 px-8 rounded-full bg-white text-[#4B3B2F] font-medium text-base touch-manipulation"
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
