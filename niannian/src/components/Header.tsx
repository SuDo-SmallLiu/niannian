'use client';

import Link from 'next/link';

export default function Header({ minimal = false }: { minimal?: boolean }) {
  return (
    <header className="w-full border-b border-[#e8e0d8] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl">🏠</span>
          <span className="text-xl font-medium tracking-wide text-[#2d2a26] group-hover:text-[#d4786e] transition-colors">
            念念年年
          </span>
        </Link>
        {!minimal && (
          <nav className="hidden sm:flex items-center gap-6 text-sm text-[#8b8178]">
            <Link href="/" className="hover:text-[#2d2a26] transition-colors">
              首页
            </Link>
            <Link href="/create" className="hover:text-[#2d2a26] transition-colors">
              创建家庭记忆
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
