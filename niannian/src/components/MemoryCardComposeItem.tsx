'use client';

import { getMemoryCardComposeHints } from '@/lib/memory-card-compose-hints';
import type { MemoryCardComposeHints } from '@/lib/memory-card-compose-hints';

interface MemoryCardComposeItemProps {
  photoUrl: string;
  hints: MemoryCardComposeHints;
  selected: boolean;
  order?: number;
  compact?: boolean;
  onClick?: () => void;
}

export function MemoryCardComposeHintsView({
  hints,
  compact = false,
}: {
  hints: MemoryCardComposeHints;
  compact?: boolean;
}) {
  if (!hints.aiHint && !hints.action && hints.tags.length === 0) {
    return (
      <p className={`text-[#B8A898] ${compact ? 'text-[10px]' : 'text-xs'}`}>
        暂无 AI 提示，建议先重新解析
      </p>
    );
  }

  return (
    <div className={compact ? 'space-y-0.5' : 'space-y-1.5'}>
      {hints.metaLine && (
        <p className={`text-[#B8A898] ${compact ? 'text-[10px] line-clamp-1' : 'text-xs'}`}>
          {hints.metaLine}
        </p>
      )}
      {hints.action && !compact && (
        <p className="text-sm text-[#4B3B2F] font-medium line-clamp-1">{hints.action}</p>
      )}
      {hints.aiHint && (
        <p
          className={`text-[#8B7355] leading-snug ${
            compact ? 'text-[10px] line-clamp-2' : 'text-xs line-clamp-2'
          }`}
        >
          <span className="text-[#D98A45]">AI · </span>
          {hints.aiHint}
        </p>
      )}
      {hints.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {hints.tags.map((tag) => (
            <span
              key={tag}
              className={`px-1.5 py-0.5 rounded-full bg-[#FFF8F0] text-[#8B7355] border border-[#F0DCC8] ${
                compact ? 'text-[9px]' : 'text-[10px]'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MemoryCardComposeItem({
  photoUrl,
  hints,
  selected,
  order,
  compact = false,
  onClick,
}: MemoryCardComposeItemProps) {
  if (compact) {
    return (
      <div className="shrink-0 w-[88px]">
        <div className="relative rounded-lg overflow-hidden aspect-square mb-1 border border-[#E8DCC8]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="" className="w-full h-full object-cover" />
        </div>
        <MemoryCardComposeHintsView hints={hints} compact />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex gap-3 p-3 rounded-2xl border-2 transition-all ${
        selected
          ? 'border-[#D98A45] bg-[#FFF8F0] ring-1 ring-[#D98A45]/20'
          : 'border-[#E8DCC8] bg-white hover:border-[#D98A45]/30'
      }`}
    >
      <div className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-[#F0E8D8]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl} alt="" className="w-full h-full object-cover" />
        {selected && order !== undefined && (
          <span className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[#D98A45] text-white text-xs font-medium flex items-center justify-center">
            {order}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <MemoryCardComposeHintsView hints={hints} />
      </div>
    </button>
  );
}

export { getMemoryCardComposeHints };
