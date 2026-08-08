'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FamilySectionTabs from '@/components/FamilySectionTabs';

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
    fetchFamilies();
  }, []);

  const fetchFamilies = async () => {
    try {
      const res = await fetch('/api/family');
      const data = await res.json();
      setFamilies(data.families || []);
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F4ED]">
      <main className="flex-1 px-6 pt-6 pb-24">
        <FamilySectionTabs />

        <div className="text-center mb-8">
          <h1 className="text-2xl font-serif text-[#4B3B2F] mb-2">我的主题</h1>
          <p className="text-sm text-[#B8A898]">管理你的记忆主题空间</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#D98A45]/30 border-t-[#D98A45] rounded-full animate-spin" />
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
                <div
                  key={family.id}
                  onClick={() => router.push(`/family/${family.id}`)}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-[#E8DCC8] cursor-pointer hover:shadow-md hover:border-[#D98A45]/30 transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-serif text-[#4B3B2F] font-medium">
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
                    <span>📷 {family.photo_count || 0} 张照片</span>
                    <span>📖 {family.story_count || 0} 个故事</span>
                  </div>
                </div>
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
      </main>
    </div>
  );
}
