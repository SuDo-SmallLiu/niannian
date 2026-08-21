'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SupplementChatBubbleProps {
  role: 'assistant' | 'user';
  content: string;
  read?: boolean;
}

export default function SupplementChatBubble({
  role,
  content,
  read = false,
}: SupplementChatBubbleProps) {
  const isAssistant = role === 'assistant';

  return (
    <div
      className={cn('flex items-end gap-2', isAssistant ? 'flex-row' : 'flex-row-reverse')}
    >
      {isAssistant ? (
        <span className="shrink-0 w-9 h-9 rounded-full bg-[#FFF3E0] text-[#DF8B3A] text-sm font-medium flex items-center justify-center">
          念
        </span>
      ) : (
        <span className="shrink-0 w-9 h-9 rounded-full bg-[#4B3B2F] text-white text-xs flex items-center justify-center">
          我
        </span>
      )}
      <div
        className={cn(
          'max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed shadow-sm',
          isAssistant
            ? 'bg-[#FFF8E7] text-[#4A3326] rounded-tl-sm border border-[#F5E6C8]'
            : 'bg-[#E8F4FF] text-[#1a1a1a] rounded-tr-sm border border-[#C5E3FF]'
        )}
      >
        <p className="whitespace-pre-wrap">{content}</p>
        {!isAssistant && read && (
          <p className="text-[10px] text-[#7EB8E8] text-right mt-1 flex items-center justify-end gap-0.5">
            <Check className="w-3 h-3" aria-hidden />
            已读
          </p>
        )}
      </div>
    </div>
  );
}
