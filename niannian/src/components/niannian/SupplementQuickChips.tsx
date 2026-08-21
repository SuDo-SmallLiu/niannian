'use client';

import { getQuickRepliesForStep } from '@/lib/supplement-quick-replies';

export function SupplementQuickChips({
  stepIndex,
  onPick,
  disabled,
}: {
  stepIndex: number;
  onPick: (text: string) => void;
  disabled?: boolean;
}) {
  const chips = getQuickRepliesForStep(stepIndex);
  if (chips.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          disabled={disabled}
          onClick={() => onPick(chip)}
          className="shrink-0 px-3 py-1.5 rounded-full text-xs bg-[#FFF8F0] text-[#8B7355] border border-[#F0E6D8] disabled:opacity-40 active:scale-[0.98]"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
