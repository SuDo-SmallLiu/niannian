'use client';

import Link from 'next/link';
import Image from 'next/image';

interface HeaderProps {
  minimal?: boolean;
}

/** 二级页面统一品牌 Header — Logo 左对齐，高度 68px */
export default function Header({ minimal = false }: HeaderProps) {
  return (
    <header className="brand-header sticky top-0 z-50">
      <div className="brand-header__inner">
        <Link href="/" className="brand-header__logo-link" aria-label="念念年年首页">
          <span className="brand-header__logo-wrap">
            <Image
              src="/niannian/brand-banner.png"
              alt="NianNian · 岁岁年年，念念不忘"
              width={875}
              height={288}
              priority
              className="brand-header__logo"
            />
          </span>
        </Link>
        {!minimal && (
          <nav className="brand-header__nav hidden sm:flex items-center gap-6 text-sm text-[#8B7355]">
            <Link href="/" className="hover:text-[#4B3B2F] transition-colors">
              首页
            </Link>
            <Link href="/create" className="hover:text-[#4B3B2F] transition-colors">
              创建家庭记忆
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
