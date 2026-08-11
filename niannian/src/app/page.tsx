'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PRESET_MEMBERS } from '@/lib/family-members';
import HomeWelcomeHero from '@/components/HomeWelcomeHero';
import HomeFeatureCards from '@/components/HomeFeatureCards';
import HomeBackgroundDecor from '@/components/HomeBackgroundDecor';
import HomeLoginPanel from '@/components/HomeLoginPanel';
import NianNianHelpDesk from '@/components/NianNianHelpDesk';
import { useAuth } from '@/components/providers/auth-provider';

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F4ED]">
          <div className="w-8 h-8 border-2 border-[#D98A45]/30 border-t-[#D98A45] rounded-full animate-spin" />
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<'welcome' | 'create'>('welcome');
  const [familyName, setFamilyName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [customMember, setCustomMember] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);

  const redirect = searchParams.get('redirect') || '/';

  useEffect(() => {
    if (searchParams.get('create') === '1' && user) {
      setMode('create');
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (user && redirect !== '/') {
      router.replace(redirect);
    }
  }, [user, redirect, router]);

  const allMembers = [
    ...selectedMembers,
    ...(customMember.trim() ? [customMember.trim()] : []),
  ];

  const toggleMember = (m: string) => {
    setSelectedMembers((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const addCustomMember = () => {
    if (customMember.trim() && !selectedMembers.includes(customMember.trim())) {
      setSelectedMembers((prev) => [...prev, customMember.trim()]);
      setCustomMember('');
    }
  };

  const handleCreate = async () => {
    setError('');
    if (!familyName.trim()) {
      setError('请为你的家庭起个名字');
      return;
    }
    if (allMembers.length === 0) {
      setError('请选择至少一位家庭成员');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: familyName.trim(), members: allMembers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '创建失败');
        return;
      }
      router.push(`/family/${data.id}/upload`);
    } catch {
      setError('网络错误，请重试');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F4ED]">
        <div className="w-8 h-8 border-2 border-[#D98A45]/30 border-t-[#D98A45] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="home-page min-h-[100dvh] flex flex-col bg-[#F8F4ED] overflow-hidden relative">
        <HomeBackgroundDecor />
        <HomeWelcomeHero onOpenHelp={() => setHelpOpen(true)} compact />
        <NianNianHelpDesk open={helpOpen} onClose={() => setHelpOpen(false)} pipeline={null} />
        <div className="relative z-10 w-full max-w-sm mx-auto px-5 pb-6 shrink-0">
          {redirect !== '/' && (
            <p className="text-center text-sm text-[#8B7355] mb-3 bg-[#FFF8F0]/90 border border-[#E8DCC8] rounded-xl py-2.5">
              登录后继续访问
            </p>
          )}
          <div className="bg-white/95 rounded-3xl border border-[#E8DCC8] shadow-[0_4px_24px_rgba(75,59,47,0.06)] p-1 backdrop-blur-sm">
            <HomeLoginPanel redirect={redirect} compact />
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="min-h-screen px-6 pt-12 pb-28 bg-[#F8F4ED] animate-fade-in">
        <button
          onClick={() => setMode('welcome')}
          className="text-[#B8A898] hover:text-[#8B7355] transition-colors text-sm mb-6"
        >
          ← 返回首页
        </button>

        <div className="text-center mb-6">
          <p className="text-xs tracking-[0.25em] text-[#D98A45] mb-2">我要创造</p>
          <p className="text-2xl font-serif font-bold text-[#4B3B2F] mb-1">创建家庭记忆</p>
          <p className="text-sm text-[#B8A898]">先建主题，再上传 5–20 张有故事的照片</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm text-[#8B7355] mb-2 font-medium">家庭主题</label>
          <input
            type="text"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="例如：爸爸退休 / 2024 春节 / 一家去云南"
            maxLength={24}
            className="w-full px-5 py-3.5 rounded-2xl bg-white border border-[#E8DCC8] text-[#4B3B2F] placeholder:text-[#D8CCB8] text-base font-serif focus:outline-none focus:ring-2 focus:ring-[#D98A45]/20 focus:border-[#D98A45]"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm text-[#8B7355] mb-3 font-medium">家庭成员</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESET_MEMBERS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => toggleMember(m)}
                className={`px-4 py-2.5 rounded-xl text-sm transition-all ${
                  selectedMembers.includes(m)
                    ? 'bg-[#D98A45] text-white'
                    : 'bg-white text-[#8B7355] border border-[#E8DCC8]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customMember}
              onChange={(e) => setCustomMember(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomMember()}
              placeholder="自定义成员…"
              className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-[#E8DCC8] text-sm placeholder:text-[#D8CCB8] focus:outline-none focus:ring-2 focus:ring-[#D98A45]/20"
            />
            <button
              type="button"
              onClick={addCustomMember}
              disabled={!customMember.trim()}
              className="px-4 py-2.5 rounded-xl bg-[#FFF8F0] text-[#8B7355] text-sm disabled:opacity-30"
            >
              添加
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-[#FFF8F0] text-[#C04040] text-sm text-center">{error}</div>
        )}

        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="w-full py-4 rounded-2xl bg-[#D98A45] text-white font-serif text-lg hover:bg-[#C47A3A] disabled:opacity-50 active:scale-[0.98]"
        >
          {creating ? '创建中…' : '下一步：上传照片'}
        </button>
      </div>
    );
  }

  return (
    <div className="home-page h-[calc(100dvh-4rem)] max-h-[calc(844px-4rem)] flex flex-col bg-[#F8F4ED] overflow-hidden relative">
      <HomeBackgroundDecor />
      <NianNianHelpDesk open={helpOpen} onClose={() => setHelpOpen(false)} pipeline={null} />

      <HomeWelcomeHero onOpenHelp={() => setHelpOpen(true)} />

      <HomeFeatureCards onCreate={() => setMode('create')} />
    </div>
  );
}
