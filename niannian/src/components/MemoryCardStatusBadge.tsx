'use client';

import {
  getMemoryCardStatus,
  getMemoryCardStatusLabel,
  type MemoryCardCompletionInput,
} from '@/lib/memory-card-completion';

const STATUS_STYLES = {
  pending: 'bg-black/40 text-white',
  analyzed: 'bg-[#8B7355] text-white',
  needs_supplement: 'bg-[#D98A45] text-white',
  completed: 'bg-[#5A8F6B] text-white',
} as const;

interface MemoryCardStatusBadgeProps {
  card: MemoryCardCompletionInput | null | undefined;
  className?: string;
}

export default function MemoryCardStatusBadge({ card, className = '' }: MemoryCardStatusBadgeProps) {
  const status = getMemoryCardStatus(card);
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] ${STATUS_STYLES[status]} ${className}`}
    >
      {getMemoryCardStatusLabel(status)}
    </span>
  );
}
