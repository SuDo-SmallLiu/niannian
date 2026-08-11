'use client';

import {
  CameraIcon,
  NavMemoryIcon,
  NavMovieIcon,
  NavStoryIcon,
  type NianNianIconProps,
} from '@/components/icons/NianNianIcons';
import type { ComponentType } from 'react';

const STEPS: Array<{ Icon: ComponentType<NianNianIconProps>; label: string }> = [
  { Icon: CameraIcon, label: '照片' },
  { Icon: NavMemoryIcon, label: '记忆卡' },
  { Icon: NavStoryIcon, label: '故事' },
  { Icon: NavMovieIcon, label: '电影' },
];

interface PipelineStepsProps {
  active?: 0 | 1 | 2 | 3;
  compact?: boolean;
  dark?: boolean;
  className?: string;
}

export default function PipelineSteps({ active = 1, compact, dark, className = '' }: PipelineStepsProps) {
  return (
    <div
      className={`flex items-center justify-center gap-1 ${compact ? 'text-[10px]' : 'text-xs'} ${
        dark ? 'text-white/50' : 'text-[#B8A898]'
      } ${className}`}
    >
      {STEPS.map((step, i) => (
        <span key={step.label} className="flex items-center gap-1">
          {i > 0 && <span className="text-[#E8DCC8]">→</span>}
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full transition-colors ${
              i === active
                ? dark
                  ? 'bg-white/10 text-[#DF8B3A] font-medium'
                  : 'bg-[#FFF8F0] text-[#DF8B3A] font-medium'
                : i < active
                  ? dark
                    ? 'text-white/70'
                    : 'text-[#8E7B6B]'
                  : ''
            }`}
          >
            <step.Icon size={compact ? 14 : 16} />
            {!compact && <span>{step.label}</span>}
          </span>
        </span>
      ))}
    </div>
  );
}
