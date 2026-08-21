'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { Crown } from 'lucide-react';

export default function HomeAgentHeader() {
  const { user } = useAuth();
  const avatar = user?.avatar?.trim();
  const initial = (user?.name || user?.phoneMasked || '念').slice(0, 1);

  return (
    <header className="home-agent-header shrink-0 flex items-center justify-between px-4 pt-3 pb-2">
      <Link
        href="/profile"
        className="flex items-center gap-2 min-w-0"
        aria-label="个人中心"
      >
        <span className="relative w-10 h-10 rounded-full overflow-hidden bg-[#FFF3E0] border border-[#F0E6D8] flex items-center justify-center shrink-0">
          {avatar ? (
            <Image src={avatar} alt="" fill className="object-cover" unoptimized />
          ) : (
            <span className="text-sm font-semibold text-[#DF8B3A]">{initial}</span>
          )}
        </span>
      </Link>

      <button
        type="button"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white bg-gradient-to-r from-[#F6B51B] to-[#DF8B3A] shadow-sm"
        onClick={() => {
          /* premium placeholder */
        }}
      >
        <Crown className="w-3.5 h-3.5" aria-hidden />
        Try premium
      </button>
    </header>
  );
}
