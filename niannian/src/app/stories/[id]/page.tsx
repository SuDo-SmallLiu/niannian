'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface StorySegment {
  photoId: string;
  memorySnippet: string;
  narrative: string;
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
  photos_detail: Array<{ id: string; url: string }>;
}

export default function StoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.id as string;

  const [story, setStory] = useState<StoryDetail | null>(null);
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

  const photoMap = new Map(story.photos_detail?.map((p) => [p.id, p.url]) || []);
  const summary = story.summary || story.description;

  return (
    <div className="min-h-screen bg-[#F8F4ED] px-6 pt-8 pb-24">
      <Link
        href="/stories"
        className="text-[#B8A898] hover:text-[#8B7355] text-sm mb-6 inline-block transition-colors"
      >
        ← 故事库
      </Link>

      <div className="mb-8">
        {familyName && <p className="text-xs text-[#D98A45] mb-1">{familyName}</p>}
        {story.theme && (
          <span className="inline-block px-2 py-0.5 rounded-full bg-[#FFF8F0] text-xs text-[#8B7355] border border-[#F0DCC8] mb-2">
            {story.theme}
          </span>
        )}
        <h1 className="text-2xl font-serif text-[#4B3B2F] mb-2">{story.title}</h1>
        {summary && <p className="text-sm text-[#8B7355] leading-relaxed">{summary}</p>}
      </div>

      {story.timeline?.length > 0 && (
        <div className="mb-8 bg-white rounded-2xl p-4 border border-[#E8DCC8]">
          <h2 className="text-sm font-medium text-[#4B3B2F] mb-3">时间线</h2>
          <div className="space-y-2">
            {story.timeline.map((item) => (
              <div key={`${item.year}-${item.event}`} className="flex gap-3 text-sm">
                <span className="text-[#D98A45] shrink-0 w-12">{item.year}</span>
                <span className="text-[#8B7355]">{item.event}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        <h2 className="text-sm font-medium text-[#4B3B2F]">章节</h2>
        {(story.segments || []).map((seg, idx) => (
          <article
            key={`${seg.photoId}-${idx}`}
            className="bg-white rounded-2xl overflow-hidden border border-[#E8DCC8] shadow-sm"
          >
            {photoMap.get(seg.photoId) && (
              <img
                src={photoMap.get(seg.photoId)}
                alt=""
                className="w-full aspect-[4/3] object-cover"
              />
            )}
            <div className="p-4">
              {seg.memorySnippet && (
                <p className="text-xs text-[#B8A898] mb-2">{seg.memorySnippet}</p>
              )}
              <p className="text-sm text-[#4B3B2F] leading-relaxed">{seg.narrative}</p>
            </div>
          </article>
        ))}
      </div>

      {story.connection_action && (
        <div className="mt-8 bg-[#FFF8F0] rounded-2xl p-4 text-sm text-[#8B7355] border border-[#F0DCC8]">
          💡 {story.connection_action}
        </div>
      )}
    </div>
  );
}
