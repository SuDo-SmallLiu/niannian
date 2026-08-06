'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ChapterCard from '@/components/ChapterCard';
import { useSharePoster } from '@/hooks/useSharePoster';

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
  const [photoUrlMap, setPhotoUrlMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sharingStoryId, setSharingStoryId] = useState<string | null>(null);
  const [regeneratingStoryId, setRegeneratingStoryId] = useState<string | null>(null);
  const [regenerateError, setRegenerateError] = useState('');
  const [regenerateSuccess, setRegenerateSuccess] = useState('');
  const [confirmStory, setConfirmStory] = useState<StoryItem | null>(null);
  const { openSharePoster, modal: shareModal } = useSharePoster();

  const fetchData = useCallback(async () => {
    try {
      if (storyId) {
        const res = await fetch(`/api/story?storyId=${storyId}`);
        const data = await res.json();
        if (res.ok && data.story) {
          setStories([data.story]);
          setFamilyName(data.family?.name || '');
          const urls = (data.story.photos_detail || []) as Array<{ id: string; url: string }>;
          const urlMap: Record<string, string> = {};
          for (const p of urls) urlMap[p.id] = p.url;
          setPhotoUrlMap(urlMap);
        }
      } else {
        const [storyRes, familyRes, photosRes] = await Promise.all([
          fetch(`/api/story?familyId=${familyId}`),
          fetch('/api/family'),
          fetch(`/api/photos?familyId=${familyId}`),
        ]);
        const data = await storyRes.json();
        const familyData = await familyRes.json();
        const photosData = await photosRes.json();
        if (storyRes.ok && data.stories) {
          setStories(data.stories);
        }
        const urlMap: Record<string, string> = {};
        for (const p of photosData.photos || []) {
          urlMap[p.id] = p.url;
        }
        setPhotoUrlMap(urlMap);
        const family = (familyData.families || []).find(
          (f: { id: string }) => f.id === familyId
        );
        if (family) setFamilyName(family.name);
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

  const handleRegenerateStory = async (story: StoryItem) => {
    setRegeneratingStoryId(story.id);
    setRegenerateError('');
    setRegenerateSuccess('');
    const startedAt = Date.now();
    try {
      const res = await fetch('/api/story/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: story.id }),
      });
      const data = await res.json();
      const minLoadingMs = 1200;
      const elapsed = Date.now() - startedAt;
      if (elapsed < minLoadingMs) {
        await new Promise((resolve) => setTimeout(resolve, minLoadingMs - elapsed));
      }
      if (!res.ok) {
        setRegenerateError(data.error || '重新生成失败');
        return;
      }
      if (data.story) {
        setStories((prev) =>
          prev.map((item) => (item.id === story.id ? { ...item, ...data.story } : item))
        );
      } else {
        await fetchData();
      }
      setRegenerateSuccess('故事已更新，请查看上方内容');
      window.setTimeout(() => setRegenerateSuccess(''), 4000);
    } catch {
      setRegenerateError('重新生成失败，请重试');
    } finally {
      setRegeneratingStoryId(null);
    }
  };

  const handleSharePoster = async (story: StoryItem) => {
    setSharingStoryId(story.id);
    try {
      let photoUrls: string[] = [];
      try {
        const res = await fetch(`/api/story?storyId=${story.id}`);
        const data = await res.json();
        if (res.ok && data.story?.photos_detail) {
          photoUrls = data.story.photos_detail.map((p: { url: string }) => p.url);
        }
      } catch {
        // ignore
      }

      await openSharePoster({
        type: 'story',
        storyId: story.id,
        title: story.title,
        summary: story.description,
        familyName: familyName || '',
        photoUrls,
      });
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
    <div className="min-h-screen bg-[#F8F4ED] px-6 pt-8 pb-32">
      {shareModal}

      {confirmStory && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/45 p-4"
          onClick={() => setConfirmStory(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-serif font-bold text-[#4B3B2F] mb-2">重新生成故事？</h3>
            <p className="text-sm text-[#8B7355] leading-relaxed mb-1">
              将基于该故事关联照片的<strong className="font-medium">最新记忆卡</strong>（含用户补充）重新撰写。
            </p>
            <p className="text-xs text-[#B8A898]">预计需要 10–30 秒，请保持页面打开。</p>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setConfirmStory(null)}
                className="flex-1 min-h-[48px] py-3 rounded-xl border border-[#E8DCC8] text-[#8B7355] text-sm font-medium touch-manipulation"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = confirmStory;
                  setConfirmStory(null);
                  if (target) void handleRegenerateStory(target);
                }}
                className="flex-1 min-h-[48px] py-3 rounded-xl bg-[#D98A45] text-white text-sm font-medium touch-manipulation"
              >
                确认生成
              </button>
            </div>
          </div>
        </div>
      )}

      {regeneratingStoryId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-xs bg-white rounded-2xl px-6 py-8 text-center shadow-xl">
            <div className="w-10 h-10 border-2 border-[#E8DCC8] border-t-[#D98A45] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#4B3B2F] font-medium mb-1">AI 正在重新生成故事</p>
            <p className="text-xs text-[#B8A898]">读取最新记忆卡并撰写中…</p>
          </div>
        </div>
      )}
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
      <div className="text-center mb-8 animate-fade-in-up">
        <p className="text-xs tracking-[0.3em] text-[#D98A45] font-medium mb-3">
          家庭记忆
        </p>
        <h1 className="text-2xl font-serif font-bold text-[#4B3B2F] leading-snug">
          {familyName ? `${familyName}的故事` : '我们的故事'}
        </h1>
        <p className="mt-3 text-sm text-[#B8A898]">
          共 {stories.length} 个故事
        </p>
      </div>

      {regenerateError && (
        <p className="text-sm text-red-500 text-center mb-4 px-4 py-2 bg-red-50 rounded-xl">{regenerateError}</p>
      )}

      {regenerateSuccess && (
        <p className="text-sm text-[#D98A45] text-center mb-4 px-4 py-2 bg-[#FFF8F0] rounded-xl">{regenerateSuccess}</p>
      )}

      {/* 章节列表 */}
      <div>
        {stories.map((story, index) => (
          <ChapterCard
            key={story.id}
            chapter={index + 1}
            title={story.title}
            summary={story.description}
            familyName={familyName}
            photoUrls={(story.photos || [])
              .map((id) => photoUrlMap[id])
              .filter(Boolean)}
            sharing={sharingStoryId === story.id}
            regenerating={regeneratingStoryId === story.id}
            onShare={() => handleSharePoster(story)}
            onRegenerate={() => setConfirmStory(story)}
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
