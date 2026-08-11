'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  NAV_ICONS,
  NavHomeIcon,
  NavMemoryIcon,
  NavMovieIcon,
  NavProfileIcon,
  NavStoryIcon,
  type NianNianIconProps,
} from '@/components/icons/NianNianIcons';
import type { ComponentType } from 'react';

const NAV_ITEMS: Array<{
  label: string;
  href: string;
  icon: ComponentType<NianNianIconProps>;
}> = [
  { label: '首页', href: '/', icon: NavHomeIcon },
  { label: '记忆', href: '/family/memories', icon: NavMemoryIcon },
  { label: '故事', href: '/stories', icon: NavStoryIcon },
  { label: '电影', href: '/movies', icon: NavMovieIcon },
  { label: '我的', href: '/profile', icon: NavProfileIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="home-bottom-nav sticky bottom-0 z-[60] safe-bottom">
      <div className="home-bottom-nav__inner flex items-center justify-around h-16 px-1">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  icon: Icon,
  label,
  href,
  pathname,
}: {
  icon: ComponentType<NianNianIconProps>;
  label: string;
  href: string;
  pathname: string;
}) {
  const isActive =
    href === '/'
      ? pathname === '/'
      : href === '/family/memories'
        ? pathname.startsWith('/family')
        : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`home-bottom-nav__item flex flex-col items-center gap-0.5 px-2 py-1 min-w-[3.25rem] transition-all ${
        isActive ? 'home-bottom-nav__item--active' : ''
      }`}
    >
      <Icon
        size={24}
        className={`transition-transform ${isActive ? 'scale-105 text-[#DF8B3A]' : 'text-[#8E7B6B]'}`}
      />
      <span className="text-[10px] leading-tight">{label}</span>
    </Link>
  );
}

export { NAV_ICONS };
