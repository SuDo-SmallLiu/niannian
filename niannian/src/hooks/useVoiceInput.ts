'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type VoiceInputState = 'idle' | 'recording' | 'transcribing';

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function micErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return '请允许浏览器使用麦克风';
    if (error.name === 'NotFoundError') return '未检测到麦克风设备';
    if (error.name === 'NotSupportedError') return '当前浏览器不支持录音';
  }
  return '无法启动录音，请重试';
}

export function useVoiceInput() {
  const [state, setState] = useState<VoiceInputState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const onResultRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' &&
        !!window.isSecureContext &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== 'undefined' &&
        !!pickMimeType()
    );
  }, []);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const transcribe = useCallback(async (blob: Blob) => {
    setState('transcribing');
    try {
      const formData = new FormData();
      formData.append('audio', blob, blob.type.includes('mp4') ? 'voice.m4a' : 'voice.webm');

      const res = await fetch('/api/speech/transcribe', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '语音识别失败');

      const text = String(data.text || '').trim();
      if (!text) throw new Error('没有识别到内容，请再试一次');

      onResultRef.current?.(text);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '语音识别失败');
    } finally {
      setState('idle');
      cleanupStream();
    }
  }, [cleanupStream]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.stop();
  }, []);

  const start = useCallback(
    async (onResult: (text: string) => void) => {
      onResultRef.current = onResult;
      setError(null);

      if (state === 'recording') {
        stopRecording();
        return;
      }

      if (state === 'transcribing') return;

      if (!supported) {
        setError(
          window.isSecureContext
            ? '当前浏览器不支持语音输入，请改用文字输入'
            : '语音输入需要 HTTPS 安全连接'
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        chunksRef.current = [];

        const mimeType = pickMimeType();
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };

        recorder.onerror = () => {
          setError('录音出错，请重试');
          setState('idle');
          cleanupStream();
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, {
            type: mimeType || chunksRef.current[0]?.type || 'audio/webm',
          });
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          mediaRecorderRef.current = null;

          if (blob.size < 800) {
            setError('录音太短，请按住多说几句');
            setState('idle');
            return;
          }

          void transcribe(blob);
        };

        mediaRecorderRef.current = recorder;
        recorder.start();
        setState('recording');
      } catch (err) {
        setError(micErrorMessage(err));
        setState('idle');
        cleanupStream();
      }
    },
    [state, supported, stopRecording, transcribe, cleanupStream]
  );

  const cancel = useCallback(() => {
    if (state === 'recording') {
      chunksRef.current = [];
      mediaRecorderRef.current?.stop();
    }
    cleanupStream();
    setState('idle');
  }, [state, cleanupStream]);

  useEffect(() => {
    return () => cleanupStream();
  }, [cleanupStream]);

  return {
    state,
    supported,
    error,
    isRecording: state === 'recording',
    isTranscribing: state === 'transcribing',
    start,
    stop: stopRecording,
    cancel,
  };
}
