'use client';

import { useCallback, useRef, useState } from 'react';
import { ChevronLeft, Pause, Play, Share2, Volume2, VolumeX, X } from 'lucide-react';

interface MovieVideoPlayerProps {
  mediaUrl: string;
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  onShare?: () => void;
  shareLoading?: boolean;
  showClose?: boolean;
  appreciateMode?: boolean;
}

export default function MovieVideoPlayer({
  mediaUrl,
  title,
  subtitle,
  onClose,
  onShare,
  shareLoading = false,
  showClose = true,
  appreciateMode = false,
}: MovieVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
      setStarted(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, []);

  const handleStart = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setStarted(true);
    void v.play().then(() => setPlaying(true)).catch(() => {});
  }, []);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <video
        ref={videoRef}
        src={mediaUrl}
        className="flex-1 w-full h-full object-contain bg-black"
        playsInline
        preload="metadata"
        muted={muted}
        onEnded={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {!started && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 px-8">
          {title && (
            <h1 className="text-white font-serif text-2xl text-center mb-2">{title}</h1>
          )}
          {subtitle && <p className="text-white/70 text-sm text-center mb-8">{subtitle}</p>}
          <button
            type="button"
            onClick={handleStart}
            className="px-10 py-4 rounded-full bg-[#D98A45] text-white font-medium text-lg shadow-lg active:scale-95 transition-transform"
          >
            ▶ 开始播放
          </button>
          <p className="text-white/40 text-xs mt-4">已混音完整版 · 含 BGM 与旁白</p>
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
        {showClose && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white"
            aria-label={muted ? '取消静音' : '静音'}
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          {!appreciateMode && onShare && (
            <button
              type="button"
              onClick={onShare}
              disabled={shareLoading}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white disabled:opacity-50 touch-manipulation"
              aria-label="分享"
            >
              {shareLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Share2 className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {started && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent flex justify-center">
          <button
            type="button"
            onClick={togglePlay}
            className="w-14 h-14 flex items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm active:scale-95 transition-transform"
            aria-label={playing ? '暂停' : '播放'}
          >
            {playing ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
          </button>
        </div>
      )}
    </div>
  );
}
