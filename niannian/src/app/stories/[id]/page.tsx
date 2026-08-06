'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import StoryChapterTimeline from '@/components/StoryChapterTimeline';
import { useSharePoster } from '@/hooks/useSharePoster';

interface StorySegment {
  photoId: string;
  memorySnippet: string;
  narrative: string;
  meta?: {
    people: string[];
    location: string;
    taken_at: string;
    action: string;
  };
}

interface PhotoDetail {
  id: string;
  url: string;
  people?: string[];
  location?: string;
  taken_at?: string;
  action?: string;
  significance?: string;
}

interface StoryDetail {
  id: string;
  family_id: string;
  title: string;
  description: string;
  summary: string;
  theme: string;
  connection_action: string;
  timeline: Array<{ year: string; event: string }>;
  segments: StorySegment[];
  photos_detail: PhotoDetail[];
}

export default function StoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.id as string;

  const [story, setStory] = useState<StoryDetail | null>(null);
  const [familyName, setFamilyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);
  const { openSharePoster, modal: shareModal } = useSharePoster();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/story?storyId=${storyId}`);
        const data = await res.json();
        if (!res.ok || !data.story) {
          setError(data.error || '故事不存在');
          return;
        }
        setStory(data.story);
        setFamilyName(data.family?.name || '');
      } catch {
        setError('加载失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [storyId]);

  const handleShare = async () => {
    if (!story) return;
    setSharing(true);
    try {
      await openSharePoster({
        type: 'story',
        storyId: story.id,
        title: story.title,
        summary: story.summary || story.description,
        familyName,
        photoUrls: (story.photos_detail || []).map((p) => p.url),
      });
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F4ED]">
        <div className="w-8 h-8 border-2 border-[#E8DCC8] border-t-[#D98A45] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F4ED] px-8">
        <p className="text-[#8B7355] mb-4">{error || '故事不存在'}</p>
        <button
          type="button"
          onClick={() => router.push('/stories')}
          className="text-sm text-[#D98A45] underline underline-offset-2"
        >
          返回故事库
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F4ED] px-6 pt-8 pb-28">
      {shareModal}

      <div className="max-w-md mx-auto flex items-center justify-between mb-8">
        <Link
          href="/stories"
          className="text-[#B8A898] hover:text-[#8B7355] text-sm transition-colors"
        >
          ← 故事库
        </Link>
        <button
          type="button"
          onClick={handleShare}
          disabled={sharing}
          className="px-4 py-2 rounded-xl bg-[#07C160] text-white text-sm font-medium disabled:opacity-50"
        >
          {sharing ? '生成中…' : '💬 分享'}
        </button>
      </div>

      <StoryChapterTimeline
        title={story.title}
        summary={story.summary || story.description}
        theme={story.theme}
        familyName={familyName}
        timeline={story.timeline || []}
        segments={story.segments || []}
        photosDetail={story.photos_detail || []}
        connectionAction={story.connection_action}
      />
    </div>
  );
}
