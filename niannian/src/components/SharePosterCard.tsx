'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import type { PosterInput } from '@/lib/share-poster';
import {
  MASCOT_SHARE_CARD,
  buildInfoItems,
  buildMovieFeatures,
  buildStoryFeatures,
  type PosterFeatureItem,
  workTypeLabel,
} from '@/lib/poster-design-tokens';

export type SharePosterCardProps = Pick<
  PosterInput,
  | 'type'
  | 'title'
  | 'subtitle'
  | 'summary'
  | 'familyName'
  | 'photoUrls'
  | 'infoItems'
  | 'featureItems'
  | 'chapterCount'
  | 'memoryCount'
> & {
  shareUrl?: string;
  showQr?: boolean;
  className?: string;
  onClick?: () => void;
};

const PHOTO_TRANSFORMS = [
  '-rotate-[2deg] -translate-y-0.5',
  'rotate-[1.5deg] translate-y-1',
  '-rotate-[1deg] translate-x-0.5',
  'rotate-[2deg] -translate-y-1',
];

function PhotoCollage({
  type,
  photoUrls,
}: {
  type: 'story' | 'memory' | 'movie';
  photoUrls: string[];
}) {
  const urls = photoUrls.filter(Boolean).slice(0, 4);
  const minH = type === 'movie' ? 'min-h-[300px]' : type === 'memory' ? 'min-h-[260px]' : 'min-h-[240px]';

  if (urls.length === 0) {
    return (
      <div className={`${minH} bg-[#F3E8D2] rounded-[24px] flex items-center justify-center`}>
        <span className="text-[#8E7B6B] text-sm">暂无照片</span>
      </div>
    );
  }

  if (urls.length === 1) {
    return (
      <div className={`relative ${minH} flex items-center justify-center`}>
        <div className="relative w-[88%] rotate-[-1deg] shadow-lg">
          <div className="p-2 bg-white rounded-[24px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urls[0]} alt="" className="w-full aspect-[4/5] object-cover rounded-[24px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${minH} grid grid-cols-2 gap-3 px-1`}>
      {urls.map((url, i) => (
        <div
          key={url}
          className={`relative shadow-lg ${PHOTO_TRANSFORMS[i % PHOTO_TRANSFORMS.length]}`}
        >
          <div className="p-2 bg-white rounded-[24px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full aspect-square object-cover rounded-[24px]" />
          </div>
        </div>
      ))}
      {urls.length >= 4 && (
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#F6B51B] text-lg">
          ♥
        </span>
      )}
      <div className="absolute top-2 right-6 w-12 h-4 bg-[#EFD9B6] rounded-sm rotate-6 opacity-80" />
    </div>
  );
}

function FeatureGrid({ items }: { items: PosterFeatureItem[] }) {
  return (
    <div className="grid grid-cols-3 gap-2 mt-4 text-center">
      {items.map((item, i) => (
        <div
          key={item.title}
          className={`px-1 ${i > 0 ? 'border-l border-[#E8E1D6]' : ''}`}
        >
          <p className="text-[#4A3326] text-[15px] font-medium leading-snug">{item.title}</p>
          <p className="text-[#8E7B6B] text-xs mt-1 leading-snug">{item.desc}</p>
        </div>
      ))}
    </div>
  );
}

/** 750×1334 海报 React 预览 — 与 canvas 生成器视觉一致 */
export default function SharePosterCard({
  type,
  title,
  subtitle,
  summary,
  familyName,
  photoUrls,
  infoItems,
  featureItems,
  chapterCount,
  memoryCount,
  shareUrl,
  showQr = false,
  className = '',
  onClick,
}: SharePosterCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const features = useMemo(() => {
    if (type === 'movie') {
      return (
        featureItems ??
        buildMovieFeatures({
          chapterCount,
          memoryCount: memoryCount ?? photoUrls.filter(Boolean).length,
        })
      );
    }
    if (type === 'story') {
      return (
        featureItems ??
        buildStoryFeatures({
          memoryCount: memoryCount ?? photoUrls.filter(Boolean).length,
        })
      );
    }
    return [];
  }, [type, featureItems, chapterCount, memoryCount, photoUrls]);

  const info = useMemo(
    () =>
      infoItems ??
      buildInfoItems({
        type,
        subtitle,
        familyName,
        photoCount: photoUrls.filter(Boolean).length,
      }),
    [infoItems, type, subtitle, familyName, photoUrls]
  );

  useEffect(() => {
    if (!showQr || !shareUrl) return;
    let active = true;
    QRCode.toDataURL(shareUrl, {
      width: 112,
      margin: 1,
      color: { dark: '#4A3326', light: '#FFFFFF' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl(null);
      });
    return () => {
      active = false;
    };
  }, [showQr, shareUrl]);

  const interactive = Boolean(onClick);

  return (
    <article
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`bg-[#FFF6E6] rounded-[28px] overflow-hidden border border-[rgba(223,139,58,0.12)] shadow-[0_8px_28px_rgba(125,92,57,0.12)] ${interactive ? 'cursor-pointer active:scale-[0.99] transition-transform touch-manipulation' : ''} ${className}`}
    >
      <div className="pt-5 pb-2 text-center relative">
        <Image
          src="/niannian/brand-banner.png"
          alt="念念年年"
          width={200}
          height={88}
          unoptimized
          className="mx-auto h-[72px] w-auto object-contain"
        />
        <p className="mt-2 text-[#DF8B3A] text-[22px] font-medium inline-flex items-center gap-3">
          <span className="text-[#F6B51B]">♥</span>
          {workTypeLabel(type)}
          <span className="text-[#F6B51B]">♥</span>
        </p>
      </div>

      <div className="px-5 pb-4">
        <PhotoCollage type={type} photoUrls={photoUrls} />
      </div>

      <div className="px-6 pb-4">
        <h2 className="text-[#4A3326] font-serif font-bold text-[28px] leading-[1.35] line-clamp-2">
          {title}
        </h2>

        {summary && (
          <p className="text-[#6B5E4D] text-base leading-relaxed mt-3 line-clamp-2">{summary}</p>
        )}

        {features.length > 0 ? (
          <FeatureGrid items={features} />
        ) : (
          info.length > 0 && (
            <div className="flex items-start justify-between gap-1 mt-3 text-[#8E7B6B] text-sm">
              {info.map((item, i) => (
                <div
                  key={item}
                  className={`flex-1 text-center px-1 leading-snug ${i > 0 ? 'border-l border-[#E8E1D6]' : ''}`}
                >
                  {item}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {showQr && shareUrl && (
        <div className="mx-5 mb-4 rounded-[28px] bg-[#FFF3D6] border border-[rgba(246,181,27,0.18)] p-4 min-h-[220px] flex gap-3 items-stretch">
          <div className="w-[40%] flex items-end justify-center shrink-0">
            <Image
              src={MASCOT_SHARE_CARD}
              alt="念念"
              width={220}
              height={220}
              unoptimized
              className="w-full max-w-[110px] h-auto object-contain object-bottom"
            />
          </div>
          <div className="w-[60%] flex flex-col min-w-0">
            <div className="bg-[#FFFDF9] rounded-2xl px-3 py-2 border border-[rgba(125,92,57,0.1)] mb-2">
              <p className="text-[#4A3326] text-sm leading-relaxed">
                把照片留下，把故事留下，把记忆留下。
              </p>
            </div>
            <div className="flex items-end justify-between gap-2 flex-1">
              <div className="min-w-0">
                <p className="text-[#4A3326] text-sm font-medium">扫码查看完整内容</p>
                <p className="text-[#8E7B6B] text-xs mt-1 leading-relaxed">
                  长按保存海报 · 分享转发
                  <br />
                  和家人一起回忆
                </p>
              </div>
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="二维码"
                  className="w-[88px] h-[88px] shrink-0 rounded-xl bg-white p-1"
                />
              ) : (
                <div className="w-[88px] h-[88px] shrink-0 bg-white rounded-xl border border-[#E8DCC8]" />
              )}
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-[#8E7B6B] text-sm pb-5 px-4 inline-flex items-center justify-center gap-2 w-full">
        <span className="text-[#F6B51B]">♥</span>
        让每一张照片都成为回家的理由
        <span className="text-[#F6B51B]">♥</span>
      </p>
    </article>
  );
}
