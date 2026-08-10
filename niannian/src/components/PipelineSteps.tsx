'use client';

const STEPS = [
  { icon: '📷', label: '照片' },
  { icon: '🃏', label: '记忆卡' },
  { icon: '📖', label: '故事' },
  { icon: '🎬', label: '电影' },
] as const;

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
            className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-full transition-colors ${
              i === active
                ? dark
                  ? 'bg-white/10 text-[#D98A45] font-medium'
                  : 'bg-[#FFF8F0] text-[#D98A45] font-medium'
                : i < active
                  ? dark
                    ? 'text-white/70'
                    : 'text-[#8B7355]'
                  : ''
            }`}
          >
            <span>{step.icon}</span>
            {!compact && <span>{step.label}</span>}
          </span>
        </span>
      ))}
    </div>
  );
}
