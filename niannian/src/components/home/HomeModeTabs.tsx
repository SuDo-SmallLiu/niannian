'use client';

import Link from 'next/link';

interface HomeModeTabsProps {
  mode: 'create' | 'appreciate';
  onModeChange: (mode: 'create' | 'appreciate') => void;
}

export default function HomeModeTabs({ mode, onModeChange }: HomeModeTabsProps) {
  return (
    <div className="home-mode-tabs flex gap-2 px-4 pb-3 max-w-[390px] mx-auto w-full">
      <button
        type="button"
        onClick={() => onModeChange('create')}
        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
          mode === 'create'
            ? 'bg-[#DF8B3A] text-white shadow-sm'
            : 'bg-white/80 text-[#8B7355] border border-[#E8DCC8]'
        }`}
      >
        我要创造
      </button>
      <Link
        href="/appreciate"
        className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-center transition-colors ${
          mode === 'appreciate'
            ? 'bg-[#5A8F6B] text-white shadow-sm'
            : 'bg-white/80 text-[#8B7355] border border-[#E8DCC8]'
        }`}
        onClick={() => onModeChange('appreciate')}
      >
        我要欣赏
      </Link>
    </div>
  );
}
