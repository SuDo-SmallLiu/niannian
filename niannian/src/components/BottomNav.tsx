'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-[#F0E8D8] safe-bottom z-50">
      <div className="flex items-center justify-around h-16 px-2">
        <NavItem icon="🏠" label="首页" href="/" pathname={pathname} />
        <NavItem icon="📖" label="故事" href="/stories" pathname={pathname} />
        <NavItem icon="🎬" label="电影" href="/movies" pathname={pathname} />
        <NavItem icon="👨‍👩‍👧" label="家庭" href="/family" pathname={pathname} />
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
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
        isActive ? 'text-[#D98A45]' : 'text-[#B8A898] hover:text-[#8B7355]'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className={`text-[10px] ${isActive ? 'font-medium' : ''}`}>{label}</span>
    </Link>
  );
}
