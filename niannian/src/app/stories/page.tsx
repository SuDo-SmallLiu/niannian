'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import SharePosterCard from '@/components/SharePosterCard';
import { useSharePoster } from '@/hooks/useSharePoster';

interface Story {
  id: string;
  family_id: string;
  title: string;
  description: string;
  summary?: string;
  family_name?: string;
  created_at: string;
  photos?: string[];
}

export default function StoriesPage() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [photoUrlsByStory, setPhotoUrlsByStory] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const { openSharePoster, modal: shareModal } = useSharePoster();

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const familyRes = await fetch('/api/family');
      const familyData = await familyRes.json();
      const families = familyData.families || [];

      const allStories: Story[] = [];
      const urlsMap: Record<string, string[]> = {};

      for (const family of families) {
        const [storyRes, photosRes] = await Promise.all([
          fetch(`/api/story?familyId=${family.id}`),
          fetch(`/api/photos?familyId=${family.id}`),
        ]);
        const storyData = await storyRes.json();
        const photosData = await photosRes.json();
        const photoMap = new Map(
          (photosData.photos || []).map((p: { id: string; url: string }) => [p.id, p.url])
        );

        for (const s of storyData.stories || []) {
          allStories.push({ ...s, family_name: family.name });
          urlsMap[s.id] = (s.photos || [])
            .map((id: string) => photoMap.get(id))
            .filter(Boolean) as string[];
        }
      }
      setStories(allStories);
      setPhotoUrlsByStory(urlsMap);
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (story: Story) => {
    setSharingId(story.id);
    try {
      let photoUrls = photoUrlsByStory[story.id] || [];
      if (photoUrls.length === 0) {
        try {
          const res = await fetch(`/api/story?storyId=${story.id}`);
          const data = await res.json();
          if (res.ok && data.story?.photos_detail) {
            photoUrls = data.story.photos_detail.map((p: { url: string }) => p.url);
          }
        } catch {
          // ignore
        }
      }

      await openSharePoster({
        type: 'story',
        storyId: story.id,
        title: story.title,
        summary: story.summary || story.description,
        familyName: story.family_name || '',
        photoUrls,
      });
    } finally {
      setSharingId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F4ED]">
      {shareModal}
      <Header />
      <main className="flex-1 px-6 py-8 pb-24">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-serif text-[#4B3B2F] mb-2">家庭故事</h1>
          <p className="text-sm text-[#B8A898]">AI 为你整理的家庭记忆</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#D98A45]/30 border-t-[#D98A45] rounded-full animate-spin" />
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">📖</p>
            <p className="text-[#B8A898] mb-2">还没有故事</p>
            <p className="text-sm text-[#D8CCB8]">上传照片后，AI 会帮你整理家庭故事</p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="mt-6 px-6 py-3 rounded-2xl bg-[#D98A45] text-white text-sm font-medium hover:bg-[#C47A3A] transition-all"
            >
              去上传照片
            </button>
          </div>
        ) : (
          <div className="space-y-8 max-w-md mx-auto">
            {stories.map((story) => (
              <div key={story.id}>
                <SharePosterCard
                  type="story"
                  title={story.title}
                  summary={story.summary || story.description}
                  familyName={story.family_name || ''}
                  photoUrls={photoUrlsByStory[story.id] || []}
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/stories/${story.id}/play`)}
                    className="flex-1 min-w-[140px] py-3 rounded-2xl bg-[#D98A45] text-white text-sm font-medium hover:bg-[#C47A3A] transition-all"
                  >
                    ▶ 沉浸体验
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShare(story)}
                    disabled={sharingId === story.id}
                    className="flex-1 min-w-[120px] py-3 rounded-2xl bg-[#07C160] text-white text-sm font-medium hover:bg-[#06AD56] disabled:opacity-50 transition-all"
                  >
                    {sharingId === story.id ? '生成中…' : '💬 分享'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/stories/${story.id}`)}
                    className="px-4 py-3 rounded-2xl border border-[#E8DCC8] text-[#8B7355] text-sm hover:border-[#D98A45]/40 transition-all"
                  >
                    章节详情
                  </button>
                </div>
                <p className="text-xs text-[#D8CCB8] text-center mt-2">
                  {story.created_at?.slice(0, 10)}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
