'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ChapterCard from '@/components/ChapterCard';

interface StoryItem {
  id: string;
  title: string;
  description: string;
  connection_action: string;
  timeline: Array<{ year: string; event: string }>;
  photos: string[];
  created_at: string;
}

export default function StoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const familyId = params.id as string;
  const storyId = searchParams.get('storyId');

  const [stories, setStories] = useState<StoryItem[]>([]);
  const [familyName, setFamilyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sharingStoryId, setSharingStoryId] = useState<string | null>(null);
  const [shareUrls, setShareUrls] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    try {
      if (storyId) {
        const res = await fetch(`/api/story?storyId=${storyId}`);
        const data = await res.json();
        if (res.ok && data.story) {
          setStories([data.story]);
          setFamilyName(data.family?.name || '');
        }
      } else {
        const res = await fetch(`/api/story?familyId=${familyId}`);
        const data = await res.json();
        if (res.ok && data.stories) {
          setStories(data.stories);
        }
      }
    } catch {
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  }, [familyId, storyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleShare = async (id: string) => {
    setSharingStoryId(id);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        setShareUrls((prev) => ({ ...prev, [id]: data.shareUrl }));
      }
    } catch {
      // ignore
    } finally {
      setSharingStoryId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#E8DCC8] border-t-[#D98A45] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || stories.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center">
        <div className="text-5xl mb-4">📭</div>
        <p className="text-[#8B7355] mb-6">
          {error || '还没有故事，先上传一些照片吧'}
        </p>
        <Link
          href={`/family/${familyId}/upload`}
          className="px-6 py-3 rounded-2xl bg-[#D98A45] text-white text-sm hover:bg-[#C47A3A] transition-colors"
        >
          上传照片
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 pt-8 pb-24">
      {/* 顶部 */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/" className="text-[#B8A898] hover:text-[#8B7355] text-sm transition-colors">
          ← 返回
        </Link>
        {familyName && (
          <p className="text-xs text-[#D8CCB8]">{familyName}</p>
        )}
        <div className="w-10" />
      </div>

      {/* 标题 */}
      <div className="text-center mb-10 animate-fade-in-up">
        <p className="text-xs tracking-[0.3em] text-[#D98A45] font-medium mb-3">
          家庭记忆
        </p>
        <h1 className="text-2xl font-serif font-bold text-[#4B3B2F] leading-snug">
          {familyName ? `${familyName}的故事` : '我们的故事'}
        </h1>
        <p className="mt-3 text-sm text-[#B8A898]">
          AI 从 {stories[0]?.photos?.length || 0} 张照片中发现
        </p>
      </div>

      {/* 章节列表 */}
      <div>
        {stories.map((story, index) => (
          <ChapterCard
            key={story.id}
            chapter={index + 1}
            title={story.title}
            summary={story.description}
            timeline={story.timeline || []}
            connectionAction={story.connection_action || ''}
            photoCount={story.photos?.length || 0}
            shareUrl={shareUrls[story.id] || null}
            sharing={sharingStoryId === story.id}
            onShare={() => handleShare(story.id)}
          />
        ))}
      </div>

      {/* 底部 */}
      {stories.length === 1 && (
        <div className="text-center mt-6 mb-4">
          <Link
            href={`/family/${familyId}/upload`}
            className="inline-flex items-center gap-1.5 text-sm text-[#B8A898] hover:text-[#D98A45] transition-colors"
          >
            <span>📷</span>
            上传更多，发现更多故事
          </Link>
        </div>
      )}
    </div>
  );
}
