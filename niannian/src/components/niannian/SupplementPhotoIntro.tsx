'use client';

import Image from 'next/image';
import { SUPPLEMENT_PHOTO_INTRO } from '@/lib/supplement-chat';

interface SupplementPhotoIntroProps {
  photoUrl: string;
  photoName?: string;
}

export default function SupplementPhotoIntro({ photoUrl, photoName }: SupplementPhotoIntroProps) {
  return (
    <div className="flex items-end gap-2">
      <span className="shrink-0 w-9 h-9 rounded-full overflow-hidden bg-[#FFF3E0] flex items-center justify-center text-sm font-medium text-[#DF8B3A]">
        念
      </span>
      <div className="max-w-[85%]">
        <div className="rounded-2xl rounded-tl-sm bg-[#FFF8E7] border border-[#F5E6C8] px-3.5 py-2.5 shadow-sm">
          <p className="text-[15px] leading-relaxed text-[#4A3326] whitespace-pre-wrap">
            {SUPPLEMENT_PHOTO_INTRO}
          </p>
          <p className="text-xs text-[#B8A898] mt-2">基于 1 张照片解析</p>
          <div className="mt-2 relative w-[88px] h-[88px] rounded-xl overflow-hidden border border-[#E8DCC8]">
            <Image
              src={photoUrl}
              alt={photoName || '上传的照片'}
              fill
              className="object-cover"
              sizes="88px"
              unoptimized
            />
          </div>
        </div>
      </div>
    </div>
  );
}
