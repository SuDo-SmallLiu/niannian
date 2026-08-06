'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { PosterInput } from '@/lib/share-poster';

export type SharePosterCardProps = Pick<
  PosterInput,
  'type' | 'title' | 'subtitle' | 'summary' | 'familyName' | 'photoUrls' | 'shareUrl'
> & {
  showQr?: boolean;
  className?: string;
};

function PhotoGrid({
  type,
  photoUrls,
}: {
  type: 'story' | 'memory';
  photoUrls: string[];
}) {
  const urls = photoUrls.filter(Boolean);
  const photoH = type === 'memory' ? 'aspect-[3/4]' : 'aspect-[4/3]';

  if (urls.length >= 4 && type === 'story') {
    return (
      <div className="grid grid-cols-2 gap-0.5 bg-[#E8DCC8]">
        {urls.slice(0, 4).map((url, i) => (
          <div key={i} className="aspect-square bg-[#F0E8D8] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    );
  }

  if (urls.length >= 2 && type === 'story') {
    return (
      <div className="grid grid-cols-2 gap-0.5 bg-[#E8DCC8]">
        {urls.slice(0, 2).map((url, i) => (
          <div key={i} className={`${photoH} bg-[#F0E8D8] overflow-hidden`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    );
  }

  if (urls.length > 0) {
    return (
      <div className={`${photoH} bg-[#F0E8D8] overflow-hidden`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[0]} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`${photoH} bg-[#F0E8D8] flex items-center justify-center`}>
      <span className="text-4xl opacity-40">📷</span>
    </div>
  );
}

/** 与 canvas 海报一致的 React 排版 — 故事库 / 家庭故事页 / 分享落地页复用 */
export default function SharePosterCard({
  type,
  title,
  subtitle,
  summary,
  familyName,
  photoUrls,
  shareUrl,
  showQr = false,
  className = '',
}: SharePosterCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!showQr || !shareUrl) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(shareUrl, {
      width: 140,
      margin: 1,
      color: { dark: '#4B3B2F', light: '#FFFFFF' },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [showQr, shareUrl]);

  return (
    <article
      className={`bg-gradient-to-b from-[#FFF8F0] to-[#F8F4ED] rounded-3xl overflow-hidden border-2 border-[#E8DCC8] shadow-sm ${className}`}
    >
      <div className="pt-6 pb-3 text-center">
        <p className="text-[#D98A45] font-serif text-base font-medium">念念年年</p>
        <p className="text-[#B8A898] text-xs mt-1">
          {type === 'story' ? '家庭记忆故事' : '家庭记忆卡'}
        </p>
      </div>

      <div className="mx-6 rounded-3xl overflow-hidden border-2 border-[#E8DCC8]">
        <PhotoGrid type={type} photoUrls={photoUrls} />
      </div>

      <div className="px-6 pt-5 pb-4">
        {familyName && (
          <p className="text-[#D98A45] text-sm mb-2">{familyName}</p>
        )}
        <h2 className="text-[#4B3B2F] font-serif font-bold text-xl leading-snug line-clamp-2">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[#8B7355] text-sm mt-2 line-clamp-1">{subtitle}</p>
        )}
        {summary && (
          <p className="text-[#8B7355] text-[15px] leading-relaxed mt-3 line-clamp-3">
            {summary}
          </p>
        )}
      </div>

      {showQr && shareUrl && (
        <div className="px-6 pb-4 flex items-end justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[#4B3B2F] text-sm font-medium">扫码查看完整内容</p>
            <p className="text-[#B8A898] text-xs mt-1">长按保存海报 · 发送到微信</p>
            <p className="text-[#B8A898] text-xs mt-0.5">分享给家人一起回忆</p>
          </div>
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="二维码" className="w-[72px] h-[72px] shrink-0 rounded-lg" />
          ) : (
            <div className="w-[72px] h-[72px] shrink-0 bg-white rounded-lg border border-[#E8DCC8]" />
          )}
        </div>
      )}

      <p className="text-center text-[#D8CCB8] text-xs pb-5">
        让照片重新成为家人的连接
      </p>
    </article>
  );
}
