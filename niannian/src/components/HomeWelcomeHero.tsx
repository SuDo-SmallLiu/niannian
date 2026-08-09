'use client';

import Image from 'next/image';
import NianNianAvatar from '@/components/NianNianAvatar';

const LEFT_BUBBLE = `我是你的记忆助手念念📷
别看我软乎乎的，我们海兔可是诺贝尔奖级记忆研究里的「记忆专家」哦～`;

const RIGHT_BUBBLE = `或许游得不快，
但我擅长留住记忆。`;

interface HomeWelcomeHeroProps {
  onOpenHelp: () => void;
  compact?: boolean;
  /** 是否显示主标题与功能卡之间的引导标题 */
  showGuideTitle?: boolean;
}

export default function HomeWelcomeHero({
  onOpenHelp,
  compact = false,
  showGuideTitle = true,
}: HomeWelcomeHeroProps) {
  const mascotSize = compact ? 200 : 308;

  return (
    <div className={`home-hero relative flex flex-col z-[1] ${compact ? 'home-hero--compact' : ''}`}>

      {/* 顶部 Logo — 透明抠图，含「岁岁年年，念念不忘」 */}
      <header className="relative z-10 flex justify-center pt-2.5 pb-0 px-4 shrink-0">
        <Image
          src="/niannian/brand-banner.png"
          alt="NianNian · 岁岁年年，念念不忘"
          width={875}
          height={288}
          priority
          className={`home-brand-banner w-auto ${compact ? 'max-w-[132px]' : 'max-w-[168px]'}`}
        />
      </header>

      {/* 念念 + 左右不对称气泡 */}
      <div className={`relative z-10 flex-1 min-h-0 ${compact ? 'home-hero__stage--compact' : 'home-hero__stage'}`}>
        {/* 左侧大气泡 — 念念左上方 */}
        <div className="home-speech-bubble home-speech-bubble--left">
          <p className="whitespace-pre-line">{LEFT_BUBBLE}</p>
        </div>

        {/* 念念主体 — 视觉中心 */}
        <button
          type="button"
          onClick={onOpenHelp}
          className="home-hero__mascot bg-transparent border-0 p-0 active:scale-[0.98] transition-transform"
          aria-label="打开念念帮助台"
          style={{ width: mascotSize, height: Math.round(mascotSize * 0.96) }}
        >
          <NianNianAvatar variant="hero" size={mascotSize} animate edgeSoft />
        </button>

        {/* 右侧小气泡 — 念念右下 */}
        <div className="home-speech-bubble home-speech-bubble--right">
          <p className="whitespace-pre-line">{RIGHT_BUBBLE}</p>
        </div>
      </div>

      {/* 引导主标题 */}
      {showGuideTitle && (
        <h2 className="home-guide-title relative z-10 shrink-0">
          今天，我们的镜头要对准哪里呢？
        </h2>
      )}
    </div>
  );
}
