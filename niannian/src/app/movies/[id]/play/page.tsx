'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import InteractiveStoryPlayer from '@/components/h5/InteractiveStoryPlayer';
import MovieVideoPlayer from '@/components/h5/MovieVideoPlayer';
import { useSharePoster } from '@/hooks/useSharePoster';
import { useAppreciateMode } from '@/components/providers/appreciate-mode-provider';
import { buildMovieSlides, type StoryH5Input } from '@/lib/h5-story-slides';
import { getSlideNarrationText } from '@/lib/slide-narration';
import { sanitizeRenderError } from '@/lib/movie-render-error';
import type { MovieRenderProgress } from '@/lib/movie-render-progress';

type RenderStatus = 'none' | 'queued' | 'rendering' | 'ready' | 'failed';

export default function MoviePlayPage() {
  const params = useParams();
  const router = useRouter();
  const movieId = params.id as string;
  const appreciate = useAppreciateMode();
  const renderRetrySent = useRef(false);

  const [movieTitle, setMovieTitle] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [movieSummary, setMovieSummary] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [renderStatus, setRenderStatus] = useState<RenderStatus>('none');
  const [renderError, setRenderError] = useState('');
  const [renderProgress, setRenderProgress] = useState<MovieRenderProgress | null>(null);
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
        setMediaUrl(data.movie.media_url || null);
        const status = (data.movie.render_status as RenderStatus) || 'none';
        setRenderStatus(status);
        setRenderError(sanitizeRenderError(data.movie.render_error));

        const urls: string[] = [];
        for (const ch of data.chapters || []) {
          const url = ch.story?.photosDetail?.[0]?.url;
          if (url) urls.push(url);
          if (urls.length >= 4) break;
        }
        setPhotoUrls(urls);

        // 延迟触发后台任务，优先保证 H5 播放流畅
        window.setTimeout(() => {
          if (status === 'failed' && !renderRetrySent.current) {
            renderRetrySent.current = true;
            void fetch('/api/movie/render', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ movieId, retry: true }),
            });
            return;
          }
          if (!data.movie.media_url && status !== 'ready' && status !== 'rendering' && status !== 'queued') {
            void fetch('/api/movie/prefetch-narration', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ movieId, renderVideo: true }),
            });
          }
        }, 2500);
      } catch {
        setError('加载失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [movieId]);

  useEffect(() => {
    if (loading || error) return;
    if (renderStatus === 'ready' && mediaUrl) return;

    const poll = async () => {
      try {
        const [movieRes, renderRes] = await Promise.all([
          fetch(`/api/movie?movieId=${movieId}`),
          fetch(`/api/movie/render?movieId=${movieId}`),
        ]);
        const movieData = await movieRes.json();
        const renderData = await renderRes.json();

        if (movieRes.ok) {
          if (movieData.narration) setNarration(movieData.narration);
          if (movieData.movie?.media_url) setMediaUrl(movieData.movie.media_url);
          if (movieData.movie?.render_status) {
            setRenderStatus(movieData.movie.render_status);
          }
          if (movieData.movie?.render_error !== undefined) {
            setRenderError(sanitizeRenderError(movieData.movie.render_error));
          }
        }
        if (renderRes.ok) {
          if (renderData.mediaUrl) setMediaUrl(renderData.mediaUrl);
          if (renderData.renderStatus) setRenderStatus(renderData.renderStatus);
          if (renderData.renderError !== undefined) {
            setRenderError(sanitizeRenderError(renderData.renderError));
          }
          if (renderData.renderProgress) setRenderProgress(renderData.renderProgress);
        }
      } catch {
        /* ignore */
      }
    };

    const intervalMs = renderStatus === 'failed' ? 8000 : 4000;
    const timer = setInterval(poll, intervalMs);
    return () => clearInterval(timer);
  }, [movieId, loading, error, renderStatus, mediaUrl]);

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

  const narrationNeeded = useMemo(
    () => slides.filter((s) => Boolean(getSlideNarrationText(s))).length,
    [slides]
  );

  const narrationReadyCount = useMemo(
    () => slides.filter((s) => getSlideNarrationText(s) && narration[s.id]?.url).length,
    [slides, narration]
  );

  const statusLine = useMemo(() => {
    if (renderStatus === 'ready' && mediaUrl) return null;
    if (renderStatus === 'queued' || renderStatus === 'rendering') {
      const pct = renderProgress?.percent ? ` ${renderProgress.percent}%` : '';
      return renderProgress?.message || `正在生成完整 MP4${pct}…`;
    }
    if (renderStatus === 'failed' && renderError) {
      return renderError;
    }
    if (narrationNeeded > 0 && narrationReadyCount < narrationNeeded) {
      return `旁白加载中 ${narrationReadyCount}/${narrationNeeded}（可先点击播放）`;
    }
    return null;
  }, [
    renderStatus,
    mediaUrl,
    renderProgress,
    renderError,
    narrationNeeded,
    narrationReadyCount,
  ]);

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

  const closeHref = appreciate ? '/movies?appreciate=1' : '/movies';

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        <p className="text-white/60 text-sm">加载人生电影…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-[200] bg-[#F8F4ED] flex flex-col items-center justify-center px-8">
        <p className="text-[#8B7355] mb-4">{error}</p>
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

  if (mediaUrl && renderStatus === 'ready') {
    return (
      <>
        {shareModal}
        <MovieVideoPlayer
          mediaUrl={mediaUrl}
          title={movieTitle}
          subtitle={`${familyName} · ${chapters.length} 个故事章节`}
          onClose={() => router.push(closeHref)}
          onShare={appreciate ? undefined : handleShare}
          shareLoading={shareLoading}
          appreciateMode={appreciate}
        />
      </>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="fixed inset-0 z-[200] bg-[#F8F4ED] flex flex-col items-center justify-center px-8">
        <p className="text-[#8B7355] mb-4">无法播放</p>
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
      {statusLine && (
        <div
          className={`fixed top-3 left-3 right-3 z-[210] px-3 py-2 rounded-xl text-[11px] leading-relaxed pointer-events-none ${
            renderStatus === 'failed'
              ? 'bg-amber-950/85 text-amber-100'
              : 'bg-black/70 text-white/90'
          }`}
        >
          {(renderStatus === 'queued' || renderStatus === 'rendering') && (
            <span className="inline-block w-2 h-2 border border-white/40 border-t-white rounded-full animate-spin mr-1.5 align-middle" />
          )}
          {statusLine}
        </div>
      )}
      <InteractiveStoryPlayer
        slides={slides}
        movieId={movieId}
        onClose={() => router.push(closeHref)}
        onShare={appreciate ? undefined : handleShare}
        shareLoading={shareLoading}
        autoPlayMs={8000}
        enableMusic
        enableNarration
        appreciateMode={appreciate}
        autoStart
      />
    </>
  );
}
