'use client';

import { useCallback, useEffect, useRef } from 'react';

interface UseThemeMusicOptions {
  /** 直接指定音频 URL（情动选曲结果） */
  src?: string;
  volume?: number;
  /** @deprecated 仅当未提供 src 时使用 */
  theme?: string;
  /** @deprecated 与 theme 配合，优先使用 src */
  getSrc?: () => string;
  getVolume?: () => number;
  enabled: boolean;
  unlocked: boolean;
  duck?: boolean;
}

function resolveSrc(src?: string, getSrc?: () => string): string {
  return src || getSrc?.() || '';
}

function configureBgmAudio(audio: HTMLAudioElement) {
  audio.loop = true;
  audio.preload = 'auto';
  audio.setAttribute('playsinline', 'true');
  audio.setAttribute('webkit-playsinline', 'true');
}

/** 在用户手势回调中同步调用，绕过移动端 autoplay 限制 */
export function useThemeMusic({
  src,
  volume = 0.32,
  theme,
  getSrc,
  getVolume,
  enabled,
  unlocked,
  duck = false,
}: UseThemeMusicOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentSrcRef = useRef('');
  const primedRef = useRef(false);

  const getBaseVolume = useCallback(() => getVolume?.() ?? volume, [getVolume, volume]);

  const applyVolume = useCallback(
    (audio: HTMLAudioElement) => {
      const base = getBaseVolume();
      audio.volume = duck ? base * 0.35 : base;
    },
    [duck, getBaseVolume]
  );

  const ensureAudio = useCallback((resolvedSrc: string) => {
    if (!audioRef.current) {
      const audio = new Audio();
      configureBgmAudio(audio);
      audioRef.current = audio;
    }

    const audio = audioRef.current;
    if (currentSrcRef.current !== resolvedSrc) {
      currentSrcRef.current = resolvedSrc;
      audio.src = resolvedSrc;
      audio.load();
    }

    return audio;
  }, []);

  const tryPlay = useCallback(
    (audio: HTMLAudioElement) => {
      applyVolume(audio);
      if (audio.paused) {
        void audio.play().catch(() => {
          setTimeout(() => {
            void audio.play().catch(() => {});
          }, 300);
        });
      }
    },
    [applyVolume]
  );

  /** 在用户点击/触摸回调中同步调用；force 用于 musicOn 尚未翻转时 */
  const prime = useCallback(
    (force = false) => {
      const resolvedSrc = resolveSrc(src, getSrc);
      if (!resolvedSrc) return;

      primedRef.current = true;
      if (!enabled && !force) return;

      const audio = ensureAudio(resolvedSrc);
      tryPlay(audio);
    },
    [src, getSrc, enabled, ensureAudio, tryPlay]
  );

  useEffect(() => {
    const resolvedSrc = resolveSrc(src, getSrc);

    if (!enabled || !resolvedSrc) {
      audioRef.current?.pause();
      return;
    }

    if (!unlocked && !primedRef.current) return;

    const audio = ensureAudio(resolvedSrc);
    applyVolume(audio);

    if (unlocked || primedRef.current) {
      tryPlay(audio);
    }
  }, [src, getSrc, enabled, unlocked, ensureAudio, applyVolume, tryPlay]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      currentSrcRef.current = '';
      primedRef.current = false;
    };
  }, []);

  return { prime };
}
