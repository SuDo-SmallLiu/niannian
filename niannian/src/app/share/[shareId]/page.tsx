'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { generateSharePoster, sharePosterNative, downloadPoster } from '@/lib/share-poster';
import {
  buildPosterInputFromShareMemory,
  buildPosterInputFromShareMovie,
  buildPosterInputFromShareStory,
  saveOrSharePoster,
  posterFilename,
} from '@/lib/share-poster-utils';

export default function SharePage() {
  const params = useParams();
  const shareCode = params.shareId as string;

  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [posterType, setPosterType] = useState<'story' | 'memory' | 'movie'>('story');
  const [readCount, setReadCount] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/share?code=${shareCode}`);
        const result = await res.json();
        if (!res.ok || !result.share) {
          setError('这个分享链接已失效');
          return;
        }

        const shareUrl =
          typeof window !== 'undefined'
            ? `${window.location.origin}/share/${shareCode}`
            : `/share/${shareCode}`;

        const input =
          result.share.share_type === 'memory'
            ? buildPosterInputFromShareMemory({ ...result.share, shareUrl })
            : result.share.share_type === 'movie'
              ? buildPosterInputFromShareMovie({
                  family_name: result.share.family_name,
                  movie_title: result.share.movie_title,
                  movie_summary: result.share.movie_summary,
                  chapter_count: result.share.chapter_count,
                  photo_urls: result.share.photo_urls,
                  shareUrl,
                })
              : buildPosterInputFromShareStory({
                family_name: result.share.family_name,
                story_title: result.share.story_title,
                story_description: result.share.story_description,
                summary: result.share.summary,
                photo_urls: result.share.photo_urls,
                shareUrl,
              });

        setPosterType(input.type);
        if (result.share.share_type === 'story' && result.share.read_count != null) {
          setReadCount(result.share.read_count);
        }
        const url = await generateSharePoster(input);
        setPosterUrl(url);
      } catch {
        setError('加载失败，请检查链接');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [shareCode]);

  const handleWeChatShare = async () => {
    if (!posterUrl) return;
    const ok = await sharePosterNative(posterUrl, '念念年年');
    if (!ok) await saveOrSharePoster(posterUrl, '念念年年', posterFilename(posterType));
  };

  const handleDownload = () => {
    if (!posterUrl) return;
    downloadPoster(posterUrl, posterFilename(posterType));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F4ED]">
        <div className="w-10 h-10 border-2 border-[#E8DCC8] border-t-[#D98A45] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !posterUrl) {
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
    <div className="min-h-screen bg-[#1a1612] flex flex-col">
      <div className="flex-1 flex items-center justify-center p-3 min-h-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={posterUrl}
          alt="家庭记忆海报"
          className="w-full max-w-[420px] h-auto rounded-2xl shadow-2xl select-none"
        />
      </div>

      <div className="shrink-0 px-4 pb-6 pt-2">
        {readCount != null && readCount > 0 && (
          <p className="text-center text-white/50 text-xs mb-2">
            已有 {readCount} 人次阅读过这个故事
          </p>
        )}
        <div className="flex gap-2 max-w-[420px] mx-auto">
          <button
            type="button"
            onClick={handleWeChatShare}
            className="flex-1 py-3 rounded-2xl bg-[#07C160] text-white text-sm font-medium"
          >
            分享到微信
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 py-3 rounded-2xl bg-[#D98A45] text-white text-sm font-medium"
          >
            保存到相册
          </button>
        </div>
        <p className="text-center text-white/40 text-xs mt-3">
          长按海报图片 · 保存或转发到微信
        </p>
      </div>
    </div>
  );
}
