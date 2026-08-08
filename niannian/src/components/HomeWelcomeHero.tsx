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
}

export default function HomeWelcomeHero({ onOpenHelp }: HomeWelcomeHeroProps) {
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

      {/* 念念 + 左右气泡 ≈ 半屏 */}
      <div className="relative w-full min-h-[48vh] sm:min-h-[50vh] flex flex-col items-center justify-center px-3 py-4">
        {/* 桌面：左气泡 | 念念 | 右气泡 */}
        <div className="hidden sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-3 w-full max-w-2xl mx-auto">
          <div className="niannian-bubble-soft rounded-2xl rounded-tr-sm px-3.5 py-3 text-left text-xs text-[#4B3B2F] leading-relaxed min-h-[120px]">
            <TypewriterText
              text={LEFT_TEXT}
              speed={32}
              className="whitespace-pre-line"
              onComplete={() => setRightStart(true)}
            />
          </div>

          <button
            type="button"
            onClick={onOpenHelp}
            className="shrink-0 bg-transparent border-0 p-0 active:scale-[0.98] transition-transform"
            aria-label="打开念念帮助台"
          >
            <NianNianAvatar variant="hero" size={200} animate edgeSoft />
          </button>

          <div className="niannian-bubble-soft rounded-2xl rounded-tl-sm px-3.5 py-3 text-left text-xs text-[#4B3B2F] leading-relaxed min-h-[120px]">
            {rightStart ? (
              <TypewriterText text={RIGHT_TEXT} speed={32} delay={200} className="whitespace-pre-line" />
            ) : (
              <span className="text-[#D8CCB8]">…</span>
            )}
          </div>
        </div>

        {/* 手机：念念居中，气泡上下 */}
        <div className="sm:hidden w-full max-w-sm flex flex-col items-center gap-3">
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
