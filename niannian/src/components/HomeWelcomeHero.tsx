'use client';

import Image from 'next/image';
import NianNianAvatar from '@/components/NianNianAvatar';

interface HomeWelcomeHeroProps {
  onOpenHelp: () => void;
  compact?: boolean;
}

export default function HomeWelcomeHero({
  onOpenHelp,
  compact = false,
}: HomeWelcomeHeroProps) {
  const mascotSize = compact ? 200 : 272;

  return (
    <div className={`home-hero relative flex flex-col z-[1] ${compact ? 'home-hero--compact' : ''}`}>
      <header className="home-brand-header relative z-10 shrink-0">
        <Image
          src="/niannian/brand-banner.png"
          alt="NianNian · 岁岁年年，念念不忘"
          width={220}
          height={96}
          priority
          unoptimized
          className="home-brand-banner"
        />
      </header>

      <div className={`relative z-10 flex-1 min-h-0 ${compact ? 'home-hero__stage--compact' : 'home-hero__stage'}`}>
        <div className="home-speech-bubble home-speech-bubble--left">
          <p className="text-[14px] leading-[1.55]">
            <span className="text-[#4A3326]">我是你的记忆助手</span>
            <span className="text-[#DF8B3A] font-medium">念念</span>
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenHelp}
          className="home-hero__mascot bg-transparent border-0 p-0 active:scale-[0.98] transition-transform"
          aria-label="打开念念帮助台"
          style={{ width: mascotSize, height: Math.round(mascotSize * 0.96) }}
        >
          <NianNianAvatar variant="hero" size={mascotSize} animate edgeSoft />
        </button>

        <div className="home-speech-bubble home-speech-bubble--right">
          <p className="text-[14px] leading-[1.55]">
            <span className="text-[#4A3326]">别看我软乎乎的，我们海兔可是诺贝尔奖研究里的</span>
            <span className="text-[#DF8B3A] font-medium">「记忆专家」</span>
            <span className="text-[#4A3326]">哦~</span>
          </p>
        </div>
      </div>
    </div>
  );
}
