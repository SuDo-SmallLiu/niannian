'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  applyNianNianChromaKey,
  detectNianNianRenderMode,
  type NianNianRenderMode,
} from '@/lib/niannian-media';

type NianNianAvatarVariant = 'hero' | 'wave' | 'small';

const VARIANTS: Record<
  NianNianAvatarVariant,
  {
    webm: string;
    mp4: string;
    poster: string;
    width: number;
    height: number;
  }
> = {
  hero: {
    webm: '/niannian/mascot-hero.webm',
    mp4: '/niannian/mascot-hero.mp4',
    poster: '/niannian/mascot-hero-poster.png',
    width: 280,
    height: 280,
  },
  wave: {
    webm: '/niannian/mascot-wave.webm',
    mp4: '/niannian/mascot-wave.mp4',
    poster: '/niannian/mascot-wave-poster.png',
    width: 266,
    height: 266,
  },
  small: {
    webm: '/niannian/mascot-small.webm',
    mp4: '/niannian/mascot-small.mp4',
    poster: '/niannian/mascot-small-poster.png',
    width: 112,
    height: 112,
  },
};

interface NianNianAvatarProps {
  variant?: NianNianAvatarVariant;
  size?: number;
  className?: string;
  animate?: boolean;
  edgeSoft?: boolean;
}

export default function NianNianAvatar({
  variant = 'wave',
  size,
  className = '',
  animate = false,
  edgeSoft = false,
}: NianNianAvatarProps) {
  const config = VARIANTS[variant];
  const displaySize = size ?? (variant === 'hero' ? 120 : variant === 'small' ? 48 : 56);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [renderMode, setRenderMode] = useState<NianNianRenderMode | null>(null);
  const [useCanvas, setUseCanvas] = useState(false);
  const [showPoster, setShowPoster] = useState(false);

  useEffect(() => {
    const mode = detectNianNianRenderMode();
    setRenderMode(mode);
    setUseCanvas(mode === 'canvas-chroma');
    setShowPoster(false);
  }, [variant]);

  // Canvas 抠像循环（兼容 iOS / 微信 / 各页不同底色）
  useEffect(() => {
    if (!useCanvas || showPoster) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let raf = 0;
    let cancelled = false;
    let lastDraw = 0;
    const FRAME_MS = 1000 / 24;

    const draw = (now: number) => {
      if (cancelled) return;
      if (now - lastDraw >= FRAME_MS && video.readyState >= 2) {
        lastDraw = now;
        ctx.clearRect(0, 0, displaySize, displaySize);
        ctx.drawImage(video, 0, 0, displaySize, displaySize);
        try {
          const frame = ctx.getImageData(0, 0, displaySize, displaySize);
          applyNianNianChromaKey(frame);
          ctx.putImageData(frame, 0, 0);
        } catch {
          /* ignore tainted canvas */
        }
      }
      raf = requestAnimationFrame(draw);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        video.pause();
      } else {
        void video.play().catch(() => setShowPoster(true));
      }
    };

    const start = () => {
      video.muted = true;
      video.playsInline = true;
      video.loop = true;
      void video.play().then(() => {
        lastDraw = 0;
        raf = requestAnimationFrame(draw);
      }).catch(() => setShowPoster(true));
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    if (video.readyState >= 2) start();
    else video.addEventListener('loadeddata', start, { once: true });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      video.pause();
    };
  }, [useCanvas, showPoster, displaySize, variant]);

  // WebM 透明直出
  useEffect(() => {
    if (useCanvas || showPoster || renderMode !== 'webm-alpha') return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    void video.play().catch(() => {
      setUseCanvas(true);
    });
  }, [useCanvas, showPoster, renderMode, variant]);

  const shellClass = [
    'relative shrink-0',
    animate ? 'animate-breathe' : '',
    edgeSoft ? 'niannian-edge-soft' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (renderMode === null || showPoster) {
    return (
      <div className={shellClass} style={{ width: displaySize, height: displaySize }}>
        <Image
          src={config.poster}
          alt="念念"
          width={config.width}
          height={config.height}
          className="w-full h-full object-contain niannian-shadow"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div className={shellClass} style={{ width: displaySize, height: displaySize }}>
      {useCanvas ? (
        <>
          <video
            ref={videoRef}
            key={`${variant}-chroma-src`}
            src={config.mp4}
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden
            className="absolute w-px h-px opacity-0 pointer-events-none"
            onError={() => setShowPoster(true)}
          />
          <canvas
            ref={canvasRef}
            width={displaySize}
            height={displaySize}
            aria-label="念念"
            className="w-full h-full niannian-shadow"
          />
        </>
      ) : (
        <video
          ref={videoRef}
          key={`${variant}-webm`}
          poster={config.poster}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          aria-label="念念"
          className="w-full h-full object-contain niannian-shadow"
          onError={() => setUseCanvas(true)}
          onLoadedData={(e) => {
            void (e.currentTarget as HTMLVideoElement).play().catch(() => setUseCanvas(true));
          }}
        >
          <source src={config.webm} type="video/webm" />
        </video>
      )}
    </div>
  );
}
