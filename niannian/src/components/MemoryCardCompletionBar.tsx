'use client';

import { computeMemoryCardCompletion } from '@/lib/memory-card-completion';

interface MemoryCardCompletionBarProps {
  card: Parameters<typeof computeMemoryCardCompletion>[0];
  compact?: boolean;
}

export default function MemoryCardCompletionBar({ card, compact }: MemoryCardCompletionBarProps) {
  const pct = computeMemoryCardCompletion(card);
  const filled = Math.round(pct / 10);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-[#F0E8D8] overflow-hidden">
          <div
            className="h-full bg-[#D98A45] rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] text-[#B8A898] tabular-nums">{pct}%</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-[#B8A898]">完成度</span>
        <span className="text-[10px] text-[#D98A45] font-medium tabular-nums">{pct}%</span>
      </div>
      <div className="font-mono text-[10px] tracking-wider text-[#D98A45] leading-none">
        {'█'.repeat(filled)}
        <span className="text-[#E8DCC8]">{'░'.repeat(10 - filled)}</span>
      </div>
    </div>
  );
}
