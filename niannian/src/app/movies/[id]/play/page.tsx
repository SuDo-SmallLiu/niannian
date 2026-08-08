'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import InteractiveStoryPlayer from '@/components/h5/InteractiveStoryPlayer';
import { useSharePoster } from '@/hooks/useSharePoster';
import { useAppreciateMode } from '@/components/providers/appreciate-mode-provider';
import { buildMovieSlides, type StoryH5Input } from '@/lib/h5-story-slides';

export default function MoviePlayPage() {
  const params = useParams();
  const router = useRouter();
  const movieId = params.id as string;
  const appreciate = useAppreciateMode();

  const [movieTitle, setMovieTitle] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [movieSummary, setMovieSummary] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [chapters, setChapters] = useState<
    Array<{ story: StoryH5Input; chapterTitle: string; chapterTheme: string }>
  >([]);
  const [narration, setNarration] = useState<
    Record<string, { url: string; durationMs: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { openSharePoster, loading: shareLoading, modal: shareModal } = useSharePoster();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/movie?movieId=${movieId}`);
        const data = await res.json();
        if (!res.ok || !data.movie) {
          setError(data.error || '人生电影不存在');
          return;
        }
        setMovieTitle(data.movie.title);
        setMovieSummary(data.movie.summary || '');
        setFamilyName(data.family?.name || '');
        setChapters(data.chapters || []);
        setNarration(data.narration || {});

        const urls: string[] = [];
        for (const ch of data.chapters || []) {
          const url = ch.story?.photosDetail?.[0]?.url;
          if (url) urls.push(url);
          if (urls.length >= 4) break;
        }
        setPhotoUrls(urls);

        // 后台预生成旁白，避免播放时部分页面无声
        void fetch('/api/movie/prefetch-narration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ movieId }),
        });
      } catch {
        setError('加载失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [movieId]);

  // 轮询旁白 manifest，预生成完成后自动挂载到幻灯片
  useEffect(() => {
    if (loading || error) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/movie?movieId=${movieId}`);
        const data = await res.json();
        if (res.ok && data.narration) {
          setNarration(data.narration);
        }
      } catch {
        // ignore
      }
    };

    const timer = setInterval(poll, 3000);
    return () => clearInterval(timer);
  }, [movieId, loading, error]);

  const slides = useMemo(() => {
    const base = buildMovieSlides(movieTitle, familyName, chapters);
    return base.map((slide) => {
      const narr = narration[slide.id];
      if (!narr?.url) return slide;
      return {
        ...slide,
        narrationUrl: narr.url,
        narrationDurationMs: narr.durationMs > 0 ? narr.durationMs : undefined,
      };
    });
  }, [movieTitle, familyName, chapters, narration]);

  const handleShare = async () => {
    await openSharePoster({
      type: 'movie',
      movieId,
      title: movieTitle,
      subtitle: `${chapters.length} 个故事章节`,
      summary: movieSummary || `${familyName} · 人生电影`,
      familyName,
      photoUrls,
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error || slides.length === 0) {
    return (
      <div className="fixed inset-0 z-[200] bg-[#F8F4ED] flex flex-col items-center justify-center px-8">
        <p className="text-[#8B7355] mb-4">{error || '无法播放'}</p>
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
    <>
      {shareModal}
      <InteractiveStoryPlayer
        slides={slides}
        movieId={movieId}
        onClose={() => router.push(appreciate ? '/movies?appreciate=1' : '/movies')}
        onShare={appreciate || shareLoading ? undefined : handleShare}
        autoPlayMs={8000}
        enableMusic
        enableNarration
        appreciateMode={appreciate}
        autoStart
      />
    </>
  );
}
