'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface ShareData {
  story_title: string;
  story_description: string;
  story_timeline: Array<{ year: string; event: string }>;
  connection_action: string;
  family_name: string;
  story_photos?: string[];
}

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

  return (
    <div className="min-h-screen bg-[#F8F4ED]">
      {/* 顶部装饰 */}
      <div className="pt-16 pb-8 px-6 text-center">
        <p className="text-xs tracking-[0.3em] text-[#D98A45] font-medium mb-3">
          💌 一封来自家人的信
        </p>
        <p className="text-xs text-[#D8CCB8]">{data.family_name}</p>
      </div>

      <div className="px-6 pb-24">
        {/* 故事标题 */}
        <div className="text-center mb-10 animate-fade-in-up">
          <h1 className="text-2xl font-serif font-bold text-[#4B3B2F] leading-snug">
            {data.story_title}
          </h1>
        </div>

        {/* 时间线 */}
        {data.story_timeline && data.story_timeline.length > 0 && (
          <div className="bg-white rounded-3xl p-6 mb-6 animate-fade-in-up delay-100 shadow-sm">
            <div className="relative pl-6">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#E8DCC8]" />
              <div className="space-y-5">
                {data.story_timeline.map((item, i) => (
                  <div
                    key={i}
                    className="relative"
                    style={{ animationDelay: `${i * 0.2 + 0.2}s` }}
                  >
                    <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-[#D98A45] ring-4 ring-white" />
                    <span className="text-sm font-medium text-[#D98A45]">{item.year}</span>
                    <p className="text-[#8B7355] mt-0.5">{item.event}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 情感总结 */}
        <div className="bg-white rounded-3xl p-6 mb-6 animate-fade-in-up delay-300 shadow-sm">
          <div className="border-l-[3px] border-[#D98A45] pl-4">
            <p className="text-[#8B7355] font-serif leading-relaxed text-[15px]">
              {data.story_description}
            </p>
          </div>
        </div>

        {/* 连接建议 */}
        {data.connection_action && (
          <div className="bg-[#FFF8F0] rounded-3xl p-6 animate-fade-in-up delay-400 border border-[#F0DCC8]">
            <p className="text-sm text-[#8B7355] leading-relaxed">
              💡 {data.connection_action}
            </p>
          </div>
        )}

        {/* 底部 */}
        <div className="text-center mt-12 animate-fade-in-up delay-500">
          <p className="text-xs text-[#D8CCB8]">由 念念年年 生成</p>
          <p className="text-xs text-[#E8DCC8] mt-2">
            让照片重新成为家人的连接
          </p>
        </div>
      </div>
    </div>
  );
}
