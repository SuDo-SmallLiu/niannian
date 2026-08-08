'use client';

import { useCallback, useEffect, useRef } from 'react';
import { estimateNarrationMs } from '@/lib/slide-narration';

interface UseNarrationOptions {
  text: string | null;
  enabled: boolean;
  unlocked: boolean;
  /** 变化时重新朗读（切页、重开自动播放等） */
  speakKey?: number | string;
  onEnd?: () => void;
}

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

export function useNarration({ text, enabled, unlocked, speakKey = 0, onEnd }: UseNarrationOptions) {
  const onEndRef = useRef(onEnd);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  const cancel = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    cancel();

    if (!enabled || !unlocked || !text) {
      return;
    }

    let cancelled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const speak = () => {
      if (cancelled) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.92;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voice = pickChineseVoice();
      if (voice) utterance.voice = voice;

      utterance.onend = () => {
        if (cancelled) return;
        if (fallbackTimer) clearTimeout(fallbackTimer);
        utteranceRef.current = null;
        onEndRef.current?.();
      };

      utterance.onerror = () => {
        if (cancelled) return;
        if (fallbackTimer) clearTimeout(fallbackTimer);
        utteranceRef.current = null;
        onEndRef.current?.();
      };

      utteranceRef.current = utterance;

      fallbackTimer = setTimeout(() => {
        if (cancelled) return;
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
        onEndRef.current?.();
      }, estimateNarrationMs(text) + 1500);

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
        cancel();
      };
    }

    speak();

    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      cancel();
    };
  }, [text, enabled, unlocked, speakKey, cancel]);

  useEffect(() => cancel, [cancel]);

  return { cancel };
}
