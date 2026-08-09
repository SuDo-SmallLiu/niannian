import type { ReactNode } from 'react';

interface PageHeroProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  large?: boolean;
}

/** 二级页顶部标题区 — 与 profile / home 排版一致 */
export default function PageHero({ title, subtitle, children, large = false }: PageHeroProps) {
  return (
    <header className="app-page-hero">
      <h1 className={`app-page-hero__title${large ? ' app-page-hero__title--lg' : ''}`}>
        {title}
      </h1>
      {subtitle && <p className="app-page-hero__subtitle">{subtitle}</p>}
      {children}
    </header>
  );
}
