'use client';

import type { ComponentType } from 'react';
import {
  CameraIcon,
  NavStoryIcon,
  PersonIcon,
  type NianNianIconProps,
} from '@/components/icons/NianNianIcons';

interface LoadingSpinnerProps {
  text?: string;
  subtext?: string;
}

export default function LoadingSpinner({
  text = '念念正在分析你的家庭记忆...',
  subtext = '这可能需要30秒到1分钟',
}: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative w-20 h-20 mb-8">
        <div className="absolute inset-0 rounded-full border-4 border-[#f0ebe4]" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#d4786e] animate-spin" />
        <div
          className="absolute inset-2 rounded-full border-4 border-transparent border-t-[#e8b4a0] animate-spin animation-delay-200"
          style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}
        />
      </div>

      <p className="text-lg font-medium text-[#2d2a26] mb-2">{text}</p>
      <p className="text-sm text-[#8b8178]">{subtext}</p>

      <div className="mt-10 space-y-3 w-64">
        <StepItem Icon={CameraIcon} text="分析照片内容" delay="animation-delay-100" active />
        <StepItem Icon={PersonIcon} text="建立人物关系" delay="animation-delay-300" />
        <StepItem Icon={NavStoryIcon} text="生成家庭故事" delay="animation-delay-500" />
      </div>
    </div>
  );
}

function StepItem({
  Icon,
  text,
  delay,
  active = false,
}: {
  Icon: ComponentType<NianNianIconProps>;
  text: string;
  delay: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg bg-white border border-[#e8e0d8] animate-fade-in-up ${delay}`}
    >
      <Icon size={18} className="text-[#d4786e]" />
      <span className={`text-sm ${active ? 'text-[#2d2a26] font-medium' : 'text-[#8b8178]'}`}>
        {text}
      </span>
      {active && (
        <span className="ml-auto w-2 h-2 rounded-full bg-[#d4786e] animate-pulse" />
      )}
    </div>
  );
}
