'use client';

import NianNianAvatar from '@/components/NianNianAvatar';

interface SupplementProgressHeaderProps {
  dialogProgress: number;
  photoIndex?: number;
  photoTotal?: number;
}

export default function SupplementProgressHeader({
  dialogProgress,
  photoIndex,
  photoTotal,
}: SupplementProgressHeaderProps) {
  const batchLabel =
    photoTotal && photoTotal > 1 && photoIndex !== undefined
      ? ` · 第 ${photoIndex + 1}/${photoTotal} 张`
      : '';

  return (
    <header className="shrink-0 border-b border-[#E8DCC8] bg-[#FFFBF7]/95 backdrop-blur-sm px-4 pt-safe pb-3">
      <div className="flex items-center gap-3 mb-3">
        <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-[#FFF3E0]">
          <NianNianAvatar variant="small" size={40} />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-[#4A3326] leading-tight">
            补充记忆卡 · 引导式提问{batchLabel}
          </p>
          <p className="text-xs text-[#8E7B6B] mt-0.5">左右滑动换照片，对话一键补充</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="text-xs font-medium text-[#8B7355]">记忆卡完成度</span>
        <span className="text-sm font-semibold text-[#DF8B3A]">{dialogProgress}%</span>
      </div>
      <div className="h-2 rounded-full bg-[#F0E8D8] overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#F6B51B] to-[#DF8B3A] rounded-full transition-all duration-500"
          style={{ width: `${dialogProgress}%` }}
        />
      </div>
    </header>
  );
}
