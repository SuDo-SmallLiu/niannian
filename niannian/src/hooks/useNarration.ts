'use client';

import { useCallback, useEffect, useRef } from 'react';
import { estimateNarrationMs } from '@/lib/slide-narration';

interface UseNarrationOptions {
  text: string | null;
  enabled: boolean;
  unlocked: boolean;
  speakKey?: number | string;
  slideId?: string;
  movieId?: string;
  audioUrl?: string | null;
  onEnd?: () => void;
  onDurationKnown?: (ms: number) => void;
}

function configureMobileAudio(audio: HTMLAudioElement) {
  audio.setAttribute('playsinline', 'true');
  audio.setAttribute('webkit-playsinline', 'true');
  audio.preload = 'auto';
}

const MIN_NARRATION_MS = 3500;

function pickChineseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'zh-CN') ||
    voices.find((v) => v.lang.startsWith('zh')) ||
    voices.find((v) => /chinese|mandarin|中文/i.test(v.name)) ||
    null
  );
}

function speakWithBrowserTts(
  text: string,
  onEnd: () => void,
  onDurationKnown?: (ms: number) => void
): () => void {
  const estimated = Math.max(estimateNarrationMs(text), MIN_NARRATION_MS);
  onDurationKnown?.(estimated);

  if (typeof window === 'undefined' || !window.speechSynthesis) {
    const timer = setTimeout(onEnd, estimated);
    return () => clearTimeout(timer);
  }

  let cancelled = false;
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  let startedAt = Date.now();

  const finish = () => {
    if (cancelled) return;
    const elapsed = Date.now() - startedAt;
    const remain = Math.max(0, MIN_NARRATION_MS - elapsed);
    if (remain > 0) {
      setTimeout(onEnd, remain);
      return;
    }
    if (fallbackTimer) clearTimeout(fallbackTimer);
    onEnd();
  };

  const speak = () => {
    if (cancelled) return;
    startedAt = Date.now();
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.88;
    utterance.pitch = 1;
    utterance.volume = 1;
    const voice = pickChineseVoice();
    if (voice) utterance.voice = voice;
    utterance.onend = finish;
    utterance.onerror = () => {
      if (cancelled) return;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      fallbackTimer = setTimeout(finish, estimated);
    };

    fallbackTimer = setTimeout(finish, estimated + 2000);
    window.speechSynthesis.speak(utterance);
  };

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    const onVoicesChanged = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      speak();
    };
    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
    return () => {
      cancelled = true;
      window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      window.speechSynthesis.cancel();
    };
  }

  speak();
  return () => {
    cancelled = true;
    if (fallbackTimer) clearTimeout(fallbackTimer);
    window.speechSynthesis.cancel();
  };
}

export function useNarration({
  text,
  enabled,
  unlocked,
  speakKey = 0,
  slideId,
  movieId,
  audioUrl,
  onEnd,
  onDurationKnown,
}: UseNarrationOptions) {
  const onEndRef = useRef(onEnd);
  const onDurationRef = useRef(onDurationKnown);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    onDurationRef.current = onDurationKnown;
  }, [onDurationKnown]);

  const cancel = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => {
    cancel();

    if (!enabled || !unlocked || !text) return;

    let cancelled = false;
    let cleanupBrowser: (() => void) | undefined;
    let startedAt = Date.now();

    const finish = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startedAt;
      const remain = Math.max(0, MIN_NARRATION_MS - elapsed);
      if (remain > 0) {
        setTimeout(() => onEndRef.current?.(), remain);
        return;
      }
      onEndRef.current?.();
    };

    const playUrl = (url: string) => {
      startedAt = Date.now();
      const audio = new Audio(url);
      configureMobileAudio(audio);
      audio.volume = 1;
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        if (cancelled) return;
        const ms = Math.max(
          Math.round((audio.duration || 0) * 1000),
          MIN_NARRATION_MS
        );
        if (audio.duration && Number.isFinite(audio.duration)) {
          onDurationRef.current?.(ms);
        }
      };

      audio.onended = finish;
      audio.onerror = () => {
        if (cancelled) return;
        requestSynthesize();
      };

      audio.play().catch(() => {
        if (cancelled) return;
        requestSynthesize();
      });
    };

    const requestSynthesize = () => {
      void fetch('/api/speech/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, slideId, movieId }),
      })
        .then(async (res) => {
          if (cancelled) return;
          const data = await res.json();
          if (res.ok && data.url) {
            playUrl(data.url);
          } else {
            cleanupBrowser = speakWithBrowserTts(text, finish, onDurationRef.current);
          }
        })
        .catch(() => {
          if (cancelled) return;
          cleanupBrowser = speakWithBrowserTts(text, finish, onDurationRef.current);
        });
    };

    // 优先播放已生成的旁白文件，失败再走服务端合成
    if (audioUrl) {
      playUrl(audioUrl);
    } else if (movieId && slideId && text) {
      requestSynthesize();
    } else {
      requestSynthesize();
    }

    return () => {
      cancelled = true;
      cleanupBrowser?.();
      cancel();
    };
  }, [text, enabled, unlocked, speakKey, slideId, movieId, audioUrl, cancel]);

  useEffect(() => cancel, [cancel]);

  return { cancel };
}
