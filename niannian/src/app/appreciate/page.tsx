'use client';

import Link from 'next/link';
import { NianNianIconBox, NavMemoryIcon, NavMovieIcon, NavStoryIcon, type NianNianIconProps } from '@/components/icons/NianNianIcons';
import type { ComponentType } from 'react';

const ITEMS: Array<{
  href: string;
  Icon: ComponentType<NianNianIconProps>;
  title: string;
  desc: string;
  color: string;
}> = [
  {
    href: '/family/memories?appreciate=1',
    Icon: NavMemoryIcon,
    title: '照片记忆',
    desc: '浏览所有 Memory Card',
    color: 'from-[#FFF8F0] to-[#F0E8D8]',
  },
  {
    href: '/stories?appreciate=1',
    Icon: NavStoryIcon,
    title: '家庭故事',
    desc: '图文与故事电影',
    color: 'from-[#FFFBF5] to-[#F0E8D8]',
  },
  {
    href: '/movies?appreciate=1',
    Icon: NavMovieIcon,
    title: '人生电影',
    desc: '配乐旁白，自动播放',
    color: 'from-[#FFF8F0] to-[#E8DCC8]',
  },
];

export default function AppreciatePage() {
  return (
    <div className="min-h-screen bg-[#F8F4ED] px-6 pt-10 pb-28">
      <Link href="/" className="text-[#B8A898] text-sm mb-8 inline-block">
        ← 返回首页
      </Link>

      <div className="text-center mb-10">
        <p className="text-xs tracking-[0.25em] text-[#D98A45] mb-3">欣赏模式</p>
        <h1 className="text-3xl font-serif font-bold text-[#4B3B2F] mb-3">慢慢看，细细想</h1>
        <p className="text-base text-[#8B7355] leading-relaxed">大字号、简洁操作，适合与家人一起回顾</p>
      </div>

      <div className="space-y-5 max-w-md mx-auto">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-3xl p-8 bg-gradient-to-br ${item.color} border border-[#E8DCC8] active:scale-[0.98] transition-transform shadow-sm`}
          >
            <NianNianIconBox icon={item.Icon} className="mb-4" />
            <h2 className="text-2xl font-serif font-bold text-[#4B3B2F] mb-2">{item.title}</h2>
            <p className="text-base text-[#8B7355]">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
