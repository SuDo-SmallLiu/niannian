'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: '全部记忆', href: '/family/memories' },
  { label: '我的主题', href: '/family' },
] as const;

export default function FamilySectionTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 p-1 rounded-2xl bg-white border border-[#E8DCC8] mb-6">
      {TABS.map((tab) => {
        const active =
          tab.href === '/family'
            ? pathname === '/family'
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch
            className={`relative z-10 flex-1 py-2.5 rounded-xl text-sm text-center transition-all ${
              active
                ? 'bg-[#D98A45] text-white font-medium shadow-sm'
                : 'text-[#8B7355] hover:bg-[#FFF8F0]'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
