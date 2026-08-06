'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface StoryShareData {
  share_type: 'story';
  story_title: string;
  story_description: string;
  story_timeline: Array<{ year: string; event: string }>;
  connection_action: string;
  family_name: string;
  photo_urls?: string[];
}

interface MemoryShareData {
  share_type: 'memory';
  family_name: string;
  photo: {
    url: string;
    taken_at: string;
    location: string;
    people: string[];
    action: string;
    significance: string;
    archetype: string;
  };
}

type ShareData = StoryShareData | MemoryShareData;

export default function SharePage() {
  const params = useParams();
  const shareCode = params.shareId as string;

  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchShare() {
      try {
        const res = await fetch(`/api/share?code=${shareCode}`);
        const result = await res.json();
        if (res.ok) {
          setData(result.share);
        } else {
          setError('这个分享链接已失效');
        }
      } catch {
        setError('加载失败，请检查链接');
      } finally {
        setLoading(false);
      }
    }
    fetchShare();
  }, [shareCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F4ED]">
        <div className="w-10 h-10 border-2 border-[#E8DCC8] border-t-[#D98A45] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F4ED] px-8 text-center">
        <div className="text-5xl mb-4">💌</div>
        <p className="text-[#8B7355] mb-2">{error || '内容不存在'}</p>
        <Link href="/" className="text-sm text-[#D98A45] underline underline-offset-2">
          回到首页
        </Link>
      </div>
    );
  }

  if (data.share_type === 'memory') {
    const { photo, family_name } = data;
    const subtitle = [photo.taken_at, photo.location].filter(Boolean).join(' · ');

    return (
      <div className="min-h-screen bg-[#F8F4ED]">
        <div className="pt-16 pb-6 px-6 text-center">
          <p className="text-xs tracking-[0.3em] text-[#D98A45] font-medium mb-3">
            💌 一张家庭记忆
          </p>
          <p className="text-xs text-[#D8CCB8]">{family_name}</p>
        </div>

        <div className="px-6 pb-24">
          <div className="rounded-2xl overflow-hidden shadow-md mb-6 animate-fade-in-up">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="家庭照片" className="w-full aspect-[4/3] object-cover" />
          </div>

          {photo.archetype && (
            <div className="text-center mb-4">
              <span className="px-3 py-1.5 rounded-full bg-[#D98A45] text-white text-sm">
                {photo.archetype}
              </span>
            </div>
          )}

          <div className="bg-white rounded-3xl p-6 mb-4 shadow-sm animate-fade-in-up delay-100">
            {subtitle && (
              <p className="text-xs text-[#B8A898] mb-3">{subtitle}</p>
            )}
            {photo.people.length > 0 && (
              <p className="text-sm text-[#4B3B2F] mb-2">
                人物：{photo.people.join('、')}
              </p>
            )}
            {photo.action && (
              <p className="text-sm text-[#4B3B2F] mb-3">{photo.action}</p>
            )}
            {photo.significance && (
              <div className="border-l-[3px] border-[#D98A45] pl-4">
                <p className="text-[#8B7355] font-serif leading-relaxed text-[15px]">
                  {photo.significance}
                </p>
              </div>
            )}
          </div>

          <div className="text-center mt-12">
            <p className="text-xs text-[#D8CCB8]">由 念念年年 生成</p>
            <p className="text-xs text-[#E8DCC8] mt-2">让照片重新成为家人的连接</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F4ED]">
      <div className="pt-16 pb-8 px-6 text-center">
        <p className="text-xs tracking-[0.3em] text-[#D98A45] font-medium mb-3">
          💌 一封来自家人的信
        </p>
        <p className="text-xs text-[#D8CCB8]">{data.family_name}</p>
      </div>

      <div className="px-6 pb-24">
        {data.photo_urls && data.photo_urls.length > 0 && (
          <div className={`grid gap-2 mb-6 ${data.photo_urls.length >= 4 ? 'grid-cols-2' : 'grid-cols-2'}`}>
            {data.photo_urls.slice(0, 4).map((url, i) => (
              <div key={i} className="rounded-xl overflow-hidden aspect-square bg-[#F0E8D8]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        <div className="text-center mb-10 animate-fade-in-up">
          <h1 className="text-2xl font-serif font-bold text-[#4B3B2F] leading-snug">
            {data.story_title}
          </h1>
        </div>

        {data.story_timeline && data.story_timeline.length > 0 && (
          <div className="bg-white rounded-3xl p-6 mb-6 animate-fade-in-up delay-100 shadow-sm">
            <div className="relative pl-6">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#E8DCC8]" />
              <div className="space-y-5">
                {data.story_timeline.map((item, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-[#D98A45] ring-4 ring-white" />
                    <span className="text-sm font-medium text-[#D98A45]">{item.year}</span>
                    <p className="text-[#8B7355] mt-0.5">{item.event}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl p-6 mb-6 animate-fade-in-up delay-300 shadow-sm">
          <div className="border-l-[3px] border-[#D98A45] pl-4">
            <p className="text-[#8B7355] font-serif leading-relaxed text-[15px]">
              {data.story_description}
            </p>
          </div>
        </div>

        {data.connection_action && (
          <div className="bg-[#FFF8F0] rounded-3xl p-6 animate-fade-in-up delay-400 border border-[#F0DCC8]">
            <p className="text-sm text-[#8B7355] leading-relaxed">
              💡 {data.connection_action}
            </p>
          </div>
        )}

        <div className="text-center mt-12 animate-fade-in-up delay-500">
          <p className="text-xs text-[#D8CCB8]">由 念念年年 生成</p>
          <p className="text-xs text-[#E8DCC8] mt-2">让照片重新成为家人的连接</p>
        </div>
      </div>
    </div>
  );
}
