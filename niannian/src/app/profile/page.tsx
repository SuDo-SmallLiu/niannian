'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import PipelineSteps from '@/components/PipelineSteps';

export default function ProfilePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F4ED]">
      <Header />
      <main className="flex-1 px-6 py-8 pb-28">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-serif text-[#4B3B2F] mb-2">我的</h1>
          <p className="text-sm text-[#B8A898] mb-4">记忆、故事与电影的入口</p>
          <PipelineSteps active={1} compact />
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E8DCC8] mb-4 text-center">
          <div className="w-20 h-20 rounded-full bg-[#FFF8F0] flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">✨</span>
          </div>
          <h3 className="text-lg font-serif text-[#4B3B2F]">家庭记忆守护者</h3>
          <p className="text-sm text-[#B8A898] mt-1">念念不忘，岁岁年年</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <QuickLink href="/family/memories" icon="🃏" label="我的记忆" />
          <QuickLink href="/stories" icon="📖" label="我的故事" />
          <QuickLink href="/movies" icon="🎬" label="我的电影" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#E8DCC8] overflow-hidden mb-4">
          <MenuItem
            icon="🏷️"
            title="我的主题"
            subtitle="按春节、旅行等主题管理记忆"
            href="/family"
          />
          <Divider />
          <MenuItem
            icon="🌸"
            title="欣赏模式"
            subtitle="大字号浏览，适合与家人一起看"
            href="/appreciate"
          />
          <Divider />
          <MenuItem icon="🔔" title="提醒设置" subtitle="纪念日与家庭助手" subtitle2="即将上线" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#E8DCC8] overflow-hidden">
          <MenuItem icon="ℹ️" title="关于念念年年" subtitle="MVP V3 · 家庭故事流水线" />
          <Divider />
          <MenuItem
            icon="❤️"
            title="让每一张照片都成为回家的理由"
            subtitle="Photo → Memory → Story → Movie"
          />
        </div>

        <p className="text-center text-xs text-[#D8CCB8] mt-8">NIAN NIAN — 家庭记忆连接器</p>
      </main>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-white border border-[#E8DCC8] active:scale-[0.98] transition-transform"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs text-[#4B3B2F] font-medium">{label}</span>
    </Link>
  );
}

function MenuItem({
  icon,
  title,
  subtitle,
  subtitle2,
  href,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  subtitle2?: string;
  href?: string;
}) {
  const inner = (
    <>
      <span className="text-xl">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-[#4B3B2F]">{title}</p>
        <p className="text-xs text-[#B8A898]">{subtitle}</p>
        {subtitle2 && (
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#F0E8D8] text-[10px] text-[#B8A898]">
            {subtitle2}
          </span>
        )}
      </div>
      {href && <span className="text-[#D8CCB8] text-sm">→</span>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex items-center gap-4 px-5 py-4 hover:bg-[#FFF8F0] active:bg-[#F0DCC8] transition-colors"
      >
        {inner}
      </Link>
    );
  }

  return <div className="flex items-center gap-4 px-5 py-4">{inner}</div>;
}

function Divider() {
  return <div className="border-t border-[#F0E8D8] mx-5" />;
}
