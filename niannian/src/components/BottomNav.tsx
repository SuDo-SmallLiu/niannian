'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="home-bottom-nav sticky bottom-0 z-50 safe-bottom">
      <div className="home-bottom-nav__inner flex items-center justify-around h-16 px-1">
        <NavItem icon="🏠" label="首页" href="/" pathname={pathname} />
        <NavItem icon="🃏" label="记忆" href="/family/memories" pathname={pathname} />
        <NavItem icon="📖" label="故事" href="/stories" pathname={pathname} />
        <NavItem icon="🎬" label="电影" href="/movies" pathname={pathname} />
        <NavItem icon="👤" label="我的" href="/profile" pathname={pathname} />
      </div>
    </nav>
  );
}

function NavItem({
  icon,
  label,
  href,
  pathname,
}: {
  icon: string;
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
      <span className={`text-xl leading-none ${isActive ? 'scale-110' : 'opacity-80'}`}>{icon}</span>
      <span className="text-[10px] leading-tight">{label}</span>
    </Link>
  );
}
