'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FamilySectionTabs from '@/components/FamilySectionTabs';
import PageShell from '@/components/PageShell';
import PageHero from '@/components/PageHero';
import { NavStoryIcon, PhotoIcon } from '@/components/icons/NianNianIcons';

interface FamilyInfo {
  id: string;
  name: string;
  members: string[];
  created_at: string;
  photo_count?: number;
  story_count?: number;
}

export default function FamilyPage() {
  const router = useRouter();
  const [families, setFamilies] = useState<FamilyInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch('/api/family');
        const data = await res.json();
        if (active) setFamilies(data.families || []);
      } catch {
        // 静默处理
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <PageShell>
      <FamilySectionTabs />

      <PageHero title="我的主题" subtitle="按家庭主题组织记忆卡" />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-6 h-6 border-2 border-[#D98A45]/30 border-t-[#D98A45] rounded-full animate-spin mb-4" />
            <p className="text-sm text-[#B8A898]">正在加载主题…</p>
          </div>
        ) : families.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#B8A898] text-sm mb-6">还没有主题，创建一个吧</p>
            <button
              onClick={() => router.push('/create')}
              className="py-3 px-8 rounded-2xl bg-[#D98A45] text-white font-serif hover:bg-[#C47A3A] transition-all active:scale-[0.98]"
            >
              + 创建新主题
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-8">
              {families.map((family) => (
                <Link
                  key={family.id}
                  href={`/family/${family.id}/photos`}
                  prefetch
                  className="block bg-white rounded-2xl p-5 shadow-sm border border-[#E8DCC8] hover:shadow-md hover:border-[#D98A45]/30 transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-serif font-bold text-[#4B3B2F]">
                      {family.name}
                    </h3>
                    <span className="text-[#D98A45] text-xl">→</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {family.members.map((m) => (
                      <span
                        key={m}
                        className="px-2.5 py-1 rounded-full bg-[#FFF8F0] text-xs text-[#8B7355]"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#B8A898]">
                    <span className="inline-flex items-center gap-1">
                      <PhotoIcon size={14} /> {family.photo_count || 0} 张照片
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <NavStoryIcon size={14} /> {family.story_count || 0} 个故事
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <button
              onClick={() => router.push('/create')}
              className="w-full py-4 rounded-2xl bg-[#D98A45] text-white font-serif text-lg hover:bg-[#C47A3A] transition-all active:scale-[0.98]"
            >
              + 创建新主题
            </button>
          </>
        )}
    </PageShell>
  );
}
