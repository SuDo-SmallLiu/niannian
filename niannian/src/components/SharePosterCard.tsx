'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import type { PosterInput } from '@/lib/share-poster';
import { buildInfoItems, workTypeLabel } from '@/lib/poster-design-tokens';

export type SharePosterCardProps = Pick<
  PosterInput,
  'type' | 'title' | 'subtitle' | 'summary' | 'familyName' | 'photoUrls' | 'infoItems'
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
  const minH = type === 'memory' ? 'min-h-[280px]' : 'min-h-[240px]';

  if (urls.length === 0) {
    return (
      <div className={`${minH} bg-[#F5EBDD] rounded-[22px] flex items-center justify-center`}>
        <span className="text-[#B8A999] text-sm">暂无照片</span>
      </div>
    );
  }

  if (urls.length === 1) {
    return (
      <div className={`relative ${minH} flex items-center justify-center`}>
        <div className="relative w-[88%] rotate-[-1deg] shadow-md">
          <div className="p-1.5 bg-[#FFFDF9] rounded-[20px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urls[0]} alt="" className="w-full aspect-[4/5] object-cover rounded-[16px]" />
          </div>
        </div>
        <span className="absolute top-2 right-6 text-[#F6B51B] opacity-60 text-xs">✦</span>
      </div>
    );
  }

  const gridClass =
    urls.length >= 4
      ? 'grid grid-cols-2 gap-2'
      : 'grid grid-cols-2 gap-3';

  return (
    <div className={`relative ${minH} ${gridClass} px-1`}>
      {urls.map((url, i) => (
        <div
          key={url}
          className={`relative shadow-md ${PHOTO_TRANSFORMS[i % PHOTO_TRANSFORMS.length]}`}
        >
          <div className="p-1 bg-[#FFFDF9] rounded-[18px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full aspect-square object-cover rounded-[14px]" />
          </div>
        </div>
      ))}
      <div className="absolute top-0 right-4 w-10 h-4 bg-[rgba(223,139,58,0.35)] rounded-sm rotate-6 opacity-70" />
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
  shareUrl,
  showQr = false,
  className = '',
  onClick,
}: SharePosterCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

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
      width: 120,
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
      className={`bg-[#FFF9F0] rounded-[28px] overflow-hidden border border-[rgba(223,139,58,0.14)] shadow-[0_8px_28px_rgba(74,51,38,0.06)] ${interactive ? 'cursor-pointer active:scale-[0.99] transition-transform touch-manipulation' : ''} ${className}`}
    >
      {/* ① 品牌 */}
      <div className="pt-5 pb-2 text-center">
        <Image
          src="/niannian/brand-logo.png"
          alt="NianNian"
          width={88}
          height={88}
          unoptimized
          className="mx-auto h-[72px] w-auto object-contain"
        />
        <p className="font-serif font-bold text-[#4A3326] text-xl mt-2">念念年年</p>
        <p className="text-[#DF8B3A] text-sm mt-0.5">{workTypeLabel(type)}</p>
      </div>

      {/* ③ 照片主视觉 */}
      <div className="px-5 pb-4">
        <PhotoCollage type={type} photoUrls={photoUrls} />
      </div>

      {/* ④⑤ 标题 + 信息 + 摘要 */}
      <div className="px-6 pb-4">
        <h2 className="text-[#4A3326] font-serif font-bold text-2xl leading-snug line-clamp-2">
          {title}
        </h2>

        {info.length > 0 && (
          <div className="flex items-start justify-between gap-1 mt-3 text-[#8E7B6B] text-[15px]">
            {info.map((item, i) => (
              <div
                key={item}
                className={`flex-1 text-center px-1 leading-snug ${i > 0 ? 'border-l border-[rgba(184,169,153,0.45)]' : ''}`}
              >
                {item}
              </div>
            ))}
          </div>
        )}

        {summary && (
          <p className="text-[#8E7B6B] text-[15px] leading-relaxed mt-3 line-clamp-3">{summary}</p>
        )}
      </div>

      {/* ⑥ 分享区 */}
      {showQr && shareUrl && (
        <div className="mx-5 mb-4 rounded-[24px] bg-[rgba(246,181,27,0.12)] border border-[rgba(246,181,27,0.22)] p-4 flex gap-3 items-start">
          <Image
            src="/niannian/mascot-wave.poster.png"
            alt="念念"
            width={72}
            height={72}
            unoptimized
            className="w-[60px] h-[60px] shrink-0 object-contain"
          />
          <div className="flex-1 min-w-0">
            <div className="bg-[#FFFDF9] rounded-2xl px-3 py-2 border border-[rgba(125,92,57,0.12)] mb-2">
              <p className="text-[#4A3326] text-[13px] leading-relaxed">
                把照片留下，把故事留下，把记忆留下。
              </p>
            </div>
            <p className="text-[#4A3326] text-xs font-semibold">扫码查看完整内容</p>
            <p className="text-[#B8A999] text-[11px] mt-0.5 leading-relaxed">
              长按保存海报
              <br />
              分享转发
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
      )}

      {/* ⑦ 品牌收尾 */}
      <p className="text-center text-[#B8A999] text-xs pb-5 px-4">
        让每一张照片都成为回家的理由
      </p>
    </article>
  );
}
