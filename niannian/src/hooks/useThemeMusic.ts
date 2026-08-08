'use client';

import { useEffect, useRef } from 'react';
import { getMusicForTheme, getMusicSrc } from '@/lib/theme-music';

interface UseThemeMusicOptions {
  theme?: string;
  enabled: boolean;
  /** 用户已交互（满足浏览器自动播放策略） */
  unlocked: boolean;
  /** 旁白播放时压低 BGM 音量 */
  duck?: boolean;
}

export function useThemeMusic({ theme, enabled, unlocked, duck = false }: UseThemeMusicOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentSrcRef = useRef<string>('');

  useEffect(() => {
    if (!enabled || !unlocked || !theme) {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
      }
      return;
    }

    const track = getMusicForTheme(theme);
    const src = getMusicSrc(theme);

    if (currentSrcRef.current === src && audioRef.current) {
      const audio = audioRef.current;
      if (audio.paused) {
        audio.play().catch(() => {});
      }
      return;
    }

    const prev = audioRef.current;
    if (prev) {
      prev.pause();
    }

    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = duck ? track.volume * 0.25 : track.volume;
    audioRef.current = audio;
    currentSrcRef.current = src;

    audio.play().catch(() => {
      // 浏览器可能仍阻止播放，需用户再次交互
    });

    return () => {
      audio.pause();
    };
  }, [theme, enabled, unlocked, duck]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !theme) return;
    const track = getMusicForTheme(theme);
    audio.volume = duck ? track.volume * 0.25 : track.volume;
  }, [duck, theme]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      currentSrcRef.current = '';
    };
  }, []);
}
