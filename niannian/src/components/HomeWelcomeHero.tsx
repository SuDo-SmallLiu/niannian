'use client';

import { useState } from 'react';
import Image from 'next/image';
import NianNianAvatar from '@/components/NianNianAvatar';
import TypewriterText from '@/components/TypewriterText';

const LEFT_TEXT =
  '你终于找到我啦～我是你的记忆助手念念📷\n别看我软乎乎的，我可是拿过诺贝尔奖研究的「记忆专家」海兔哦～';

const RIGHT_TEXT =
  '我或许游得不快，但我天生擅长把瞬间变成永恒。\n\n今天，我们的镜头要对准哪里呢？';

interface HomeWelcomeHeroProps {
  onOpenHelp: () => void;
  compact?: boolean;
}

export default function HomeWelcomeHero({ onOpenHelp, compact = false }: HomeWelcomeHeroProps) {
  const [rightStart, setRightStart] = useState(false);

  return (
    <div className="w-full flex flex-col">
      {/* Banner 抠图 */}
      <div className="w-full flex justify-center pt-2 pb-1 px-4">
        <Image
          src="/niannian/brand-banner.png"
          alt="NianNian"
          width={1024}
          height={422}
          priority
          className="w-full max-w-[280px] sm:max-w-[320px] h-auto"
        />
      </div>

      {/* 念念 + 上下气泡（应用为 max-w-md 手机壳，统一用纵向布局） */}
      <div
        className={`relative w-full flex flex-col items-center justify-center px-3 py-4 ${
          compact ? 'min-h-[28vh]' : 'min-h-[48vh]'
        }`}
      >
        <div className="w-full max-w-sm flex flex-col items-center gap-3">
          <div className="niannian-bubble-soft w-full rounded-2xl rounded-bl-sm px-4 py-3 text-left text-sm text-[#4B3B2F] leading-relaxed">
            <TypewriterText
              text={LEFT_TEXT}
              speed={28}
              className="whitespace-pre-line"
              onComplete={() => setRightStart(true)}
            />
          </div>

          <button
            type="button"
            onClick={onOpenHelp}
            className="bg-transparent border-0 p-0 active:scale-[0.98] transition-transform"
            aria-label="打开念念帮助台"
          >
            <NianNianAvatar variant="hero" size={168} animate edgeSoft />
          </button>

          <div className="niannian-bubble-soft w-full rounded-2xl rounded-tr-sm px-4 py-3 text-left text-sm text-[#4B3B2F] leading-relaxed min-h-[4.5rem]">
            {rightStart ? (
              <TypewriterText text={RIGHT_TEXT} speed={28} delay={200} className="whitespace-pre-line" />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
