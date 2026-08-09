'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { useAppreciateMode } from '@/components/providers/appreciate-mode-provider';
import { useAuth } from '@/components/providers/auth-provider';

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
      <nav className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-[#F0E8D8] safe-bottom z-50">
        <div className="flex items-center justify-around h-20 px-2">
          <AppreciateNavItem icon="🃏" label="照片" href="/family/memories?appreciate=1" pathname={pathname} />
          <AppreciateNavItem icon="📖" label="故事" href="/stories?appreciate=1" pathname={pathname} />
          <AppreciateNavItem icon="🎬" label="电影" href="/movies?appreciate=1" pathname={pathname} />
        </div>
      </nav>
    );
  }

  return <BottomNav />;
}

function AppreciateNavItem({
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
  const base = href.split('?')[0];
  const isActive = pathname.startsWith(base);

  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
        isActive ? 'text-[#D98A45]' : 'text-[#8B7355]'
      }`}
    >
      <span className="text-3xl">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
