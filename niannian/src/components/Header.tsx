'use client';

import Link from 'next/link';
import Image from 'next/image';

interface HeaderProps {
  minimal?: boolean;
  /** 深色页面（电影页）— 浅色 Logo + 影院风 Header */
  dark?: boolean;
}

/** 二级页面统一品牌 Header — 透明抠图 Logo 嵌入页面背景 */
export default function Header({ minimal = false, dark = false }: HeaderProps) {
  return (
    <header className={`brand-header sticky top-0 z-50${dark ? ' brand-header--dark' : ''}`}>
      <div className="brand-header__inner">
        <Link href="/" className="brand-header__logo-link" aria-label="念念年年首页">
          <span className="brand-header__logo-wrap">
            <Image
              src={dark ? '/niannian/brand-banner-dark.png' : '/niannian/brand-banner.png'}
              alt="NianNian · 岁岁年年，念念不忘"
              width={875}
              height={288}
              priority
              unoptimized
              className="brand-header__logo"
            />
          </span>
        </Link>
        {!minimal && (
          <nav className="brand-header__nav hidden sm:flex items-center gap-6 text-sm">
            <Link href="/" className="brand-header__nav-link">
              首页
            </Link>
            <Link href="/create" className="brand-header__nav-link">
              创建家庭记忆
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
