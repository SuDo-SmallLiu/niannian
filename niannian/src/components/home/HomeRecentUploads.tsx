'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface RecentPhoto {
  id: string;
  url: string;
  original_name: string;
  family_id: string;
}

interface HomeRecentUploadsProps {
  familyId: string | null;
}

export default function HomeRecentUploads({ familyId }: HomeRecentUploadsProps) {
  const [photos, setPhotos] = useState<RecentPhoto[]>([]);

  useEffect(() => {
    if (!familyId) {
      setPhotos([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/photos?familyId=${encodeURIComponent(familyId)}`);
        const data = await res.json();
        if (!res.ok || cancelled) return;
        const list = (data.photos || []) as RecentPhoto[];
        setPhotos(list.slice(-8).reverse());
      } catch {
        if (!cancelled) setPhotos([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [familyId]);

  if (!familyId) return null;

  return (
    <section className="home-recent-uploads px-4 pb-3 max-w-[390px] mx-auto w-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-[#4A3326]">最近上传</h2>
        <Link
          href={`/family/${familyId}/photos`}
          className="text-xs text-[#DF8B3A] font-medium"
        >
          查看全部
        </Link>
      </div>

      {photos.length === 0 ? (
        <p className="text-xs text-[#B8A898] py-4 text-center rounded-xl bg-white/60 border border-dashed border-[#E8DCC8]">
          还没有照片，点「上传照片」开始吧
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {photos.map((photo) => (
            <Link
              key={photo.id}
              href={`/family/${familyId}/photos/${photo.id}`}
              className="shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden border border-[#E8DCC8] bg-[#FFF8F0] relative"
            >
              <Image
                src={photo.url}
                alt={photo.original_name}
                fill
                className="object-cover"
                sizes="72px"
                unoptimized
              />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
