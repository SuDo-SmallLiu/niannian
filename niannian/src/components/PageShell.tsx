'use client';

import type { ReactNode } from 'react';
import Header from '@/components/Header';

interface PageShellProps {
  children: ReactNode;
  /** 深色页面（电影等） */
  dark?: boolean;
  /** 是否显示统一品牌 Header */
  showHeader?: boolean;
  /** Header 仅 Logo，无导航链接 */
  minimalHeader?: boolean;
  /** 内容区额外 class */
  bodyClassName?: string;
  /** 外层额外 class */
  className?: string;
}

/**
 * 二级页面统一壳层 — 对齐首页 / 我的页 390×844 单屏架构。
 * 样式以 globals.css 语义类为主，减少对 Tailwind 运行时 chunk 的依赖。
 */
export default function PageShell({
  children,
  dark = false,
  showHeader = true,
  minimalHeader = false,
  bodyClassName = '',
  className = '',
}: PageShellProps) {
  return (
    <div
      className={[
        'app-page',
        dark ? 'app-page--dark' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showHeader && <Header minimal={minimalHeader} dark={dark} />}
      <div className={['app-page__body', bodyClassName].filter(Boolean).join(' ')}>
        {children}
      </div>
    </div>
  );
}
