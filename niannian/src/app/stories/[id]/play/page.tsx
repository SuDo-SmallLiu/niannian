'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import InteractiveStoryPlayer from '@/components/h5/InteractiveStoryPlayer';
import { buildStorySlides, type StoryH5Input } from '@/lib/h5-story-slides';

export default function StoryPlayPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.id as string;

  const [story, setStory] = useState<StoryH5Input | null>(null);
  const [familyName, setFamilyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/story?storyId=${storyId}`);
        const data = await res.json();
        if (!res.ok || !data.story) {
          setError(data.error || '故事不存在');
          return;
        }
        const s = data.story;
        setStory({
          id: s.id,
          title: s.title,
          summary: s.summary || s.description,
          theme: s.theme,
          connectionAction: s.connection_action,
          segments: s.segments || [],
          photosDetail: s.photos_detail || [],
        });
        setFamilyName(data.family?.name || '');
      } catch {
        setError('加载失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [storyId]);

  const slides = useMemo(() => {
    if (!story) return [];
    return buildStorySlides({ ...story, familyName });
  }, [story, familyName]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !story || slides.length === 0) {
    return (
      <div className="fixed inset-0 z-[200] bg-[#F8F4ED] flex flex-col items-center justify-center px-8">
        <p className="text-[#8B7355] mb-4">{error || '无法播放故事'}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 rounded-2xl bg-[#D98A45] text-white"
        >
          返回
        </button>
      </div>
    );
  }

  return (
    <InteractiveStoryPlayer
      slides={slides}
      onClose={() => router.push(`/stories/${storyId}`)}
      autoPlayMs={7000}
      enableMusic
      enableNarration
    />
  );
}
