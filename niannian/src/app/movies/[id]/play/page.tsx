'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import InteractiveStoryPlayer from '@/components/h5/InteractiveStoryPlayer';
import { useSharePoster } from '@/hooks/useSharePoster';
import { buildMovieSlides, type StoryH5Input } from '@/lib/h5-story-slides';

export default function MoviePlayPage() {
  const params = useParams();
  const router = useRouter();
  const movieId = params.id as string;

  const [movieTitle, setMovieTitle] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [movieSummary, setMovieSummary] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [chapters, setChapters] = useState<
    Array<{ story: StoryH5Input; chapterTitle: string; chapterTheme: string }>
  >([]);
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

        const urls: string[] = [];
        for (const ch of data.chapters || []) {
          const url = ch.story?.photosDetail?.[0]?.url;
          if (url) urls.push(url);
          if (urls.length >= 4) break;
        }
        setPhotoUrls(urls);
      } catch {
        setError('加载失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [movieId]);

  const slides = useMemo(
    () => buildMovieSlides(movieTitle, familyName, chapters),
    [movieTitle, familyName, chapters]
  );

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
        onClose={() => router.push('/movies')}
        onShare={shareLoading ? undefined : handleShare}
        autoPlayMs={8000}
      />
    </>
  );
}
