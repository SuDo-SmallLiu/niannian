'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import {
  NavMemoryIcon,
  NavMovieIcon,
  NavStoryIcon,
  type NianNianIconProps,
} from '@/components/icons/NianNianIcons';
import { useAppreciateMode } from '@/components/providers/appreciate-mode-provider';
import { useAuth } from '@/components/providers/auth-provider';
import type { ComponentType } from 'react';

export default function NavShell() {
  const appreciate = useAppreciateMode();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (pathname.startsWith('/share/') || pathname.includes('/play')) {
    return null;
  }

  if (pathname === '/' && (loading || !user)) {
    return null;
  }

  if (appreciate) {
    return (
      <nav className="bg-white/95 backdrop-blur-md border-t border-[#F0E8D8] safe-bottom z-50">
        <div className="flex items-center justify-around h-20 px-2">
          <AppreciateNavItem icon={NavMemoryIcon} label="照片" href="/family/memories?appreciate=1" pathname={pathname} />
          <AppreciateNavItem icon={NavStoryIcon} label="故事" href="/stories?appreciate=1" pathname={pathname} />
          <AppreciateNavItem icon={NavMovieIcon} label="电影" href="/movies?appreciate=1" pathname={pathname} />
        </div>
      </nav>
    );
  }

  return <BottomNav />;
}

function AppreciateNavItem({
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
  const base = href.split('?')[0];
  const isActive = pathname.startsWith(base);

  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1.5 px-4 py-2 transition-colors ${
        isActive ? 'text-[#DF8B3A]' : 'text-[#8E7B6B]'
      }`}
    >
      <Icon size={28} />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
