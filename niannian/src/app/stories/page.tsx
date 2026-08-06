'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

interface Story {
  id: string;
  family_id: string;
  title: string;
  description: string;
  family_name?: string;
  created_at: string;
  photos?: string[];
  connection_action?: string;
}

export default function StoriesPage() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      // 先获取所有家庭
      const familyRes = await fetch('/api/family');
      const familyData = await familyRes.json();
      const families = familyData.families || [];

      // 获取每个家庭的故事
      const allStories: Story[] = [];
      for (const family of families) {
        const storyRes = await fetch(`/api/story?family_id=${family.id}`);
        const storyData = await storyRes.json();
        for (const s of (storyData.stories || [])) {
          allStories.push({ ...s, family_name: family.name });
        }
      }
      setStories(allStories);
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  };

  // 演示故事数据
  const demoStories: Story[] = [
    {
      id: 'demo_s1',
      family_id: 'demo_1',
      title: '从牵着你的手，到看你独立成长',
      description: '这些照片记录的不只是公园，而是一家人陪伴彼此成长的过程。每一张照片背后，都是无法重来的珍贵时光。',
      family_name: '李家的故事',
      created_at: '2024-06-20',
      connection_action: '这些照片已经过去了很久，不妨分享给爷爷和孩子，一起重温那些温暖的时刻。',
    },
    {
      id: 'demo_s2',
      family_id: 'demo_1',
      title: '我们一起走过的四季',
      description: '从春天教骑车，到夏天海边玩沙子，再到秋天公园散步、冬天春节团聚——一年四季都有家人的陪伴。',
      family_name: '李家的故事',
      created_at: '2024-06-18',
      connection_action: '可以把这组"四季"照片发给全家人，看看大家还记得哪些细节。',
    },
  ];

  const displayStories = stories.length > 0 ? stories : demoStories;

  const shareStory = (story: Story) => {
    const url = `${window.location.origin}/share/${story.id}`;
    if (navigator.share) {
      navigator.share({ title: story.title, text: story.description, url });
    } else {
      navigator.clipboard.writeText(url);
      alert('链接已复制到剪贴板，分享给家人吧！');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F4ED]">
      <Header />
      <main className="flex-1 px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-serif text-[#4B3B2F] mb-2">家庭故事</h1>
          <p className="text-sm text-[#B8A898]">AI 为你整理的家庭记忆</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#D98A45]/30 border-t-[#D98A45] rounded-full animate-spin" />
          </div>
        ) : displayStories.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">📖</p>
            <p className="text-[#B8A898] mb-2">还没有故事</p>
            <p className="text-sm text-[#D8CCB8]">上传照片后，AI 会帮你整理家庭故事</p>
            <button
              onClick={() => router.push('/')}
              className="mt-6 px-6 py-3 rounded-2xl bg-[#D98A45] text-white text-sm font-medium hover:bg-[#C47A3A] transition-all"
            >
              去上传照片
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {displayStories.map((story) => (
              <div
                key={story.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-[#E8DCC8]"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-xs text-[#D98A45] mb-1">
                      {story.family_name}
                    </p>
                    <h3 className="text-lg font-serif text-[#4B3B2F] font-medium leading-snug">
                      {story.title}
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-[#8B7355] leading-relaxed mb-3">
                  {story.description}
                </p>
                {story.connection_action && (
                  <div className="bg-[#FFF8F0] rounded-xl p-3 text-xs text-[#8B7355] mb-3">
                    💡 {story.connection_action}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => shareStory(story)}
                    className="px-4 py-2 rounded-xl bg-[#D98A45] text-white text-sm font-medium hover:bg-[#C47A3A] transition-all"
                  >
                    分享给家人
                  </button>
                  <span className="text-xs text-[#D8CCB8]">
                    {story.created_at?.slice(0, 10)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
