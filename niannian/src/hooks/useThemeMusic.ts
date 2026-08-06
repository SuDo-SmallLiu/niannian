'use client';

import { useEffect, useRef } from 'react';
import { getMusicForTheme, getMusicSrc } from '@/lib/theme-music';

interface UseThemeMusicOptions {
  theme?: string;
  enabled: boolean;
  /** 用户已交互（满足浏览器自动播放策略） */
  unlocked: boolean;
}

export function useThemeMusic({ theme, enabled, unlocked }: UseThemeMusicOptions) {
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
    audio.volume = track.volume;
    audioRef.current = audio;
    currentSrcRef.current = src;

    audio.play().catch(() => {
      // 浏览器可能仍阻止播放，需用户再次交互
    });

    return () => {
      audio.pause();
    };
  }, [theme, enabled, unlocked]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      currentSrcRef.current = '';
    };
  }, []);
}
