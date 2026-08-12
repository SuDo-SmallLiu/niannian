'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import InteractiveStoryPlayer from '@/components/h5/InteractiveStoryPlayer';
import MovieVideoPlayer from '@/components/h5/MovieVideoPlayer';
import { useSharePoster } from '@/hooks/useSharePoster';
import { useAppreciateMode } from '@/components/providers/appreciate-mode-provider';
import { buildMovieSlides, type StoryH5Input } from '@/lib/h5-story-slides';
import { getSlideNarrationText } from '@/lib/slide-narration';
import { sanitizeRenderError } from '@/lib/movie-render-error';
import { primeAudioInUserGesture } from '@/lib/prime-audio-gesture';
import { watchJobUntilDone } from '@/lib/poll-job';
import { createRenderProgress, type MovieRenderProgress } from '@/lib/movie-render-progress';

type RenderStatus = 'none' | 'queued' | 'rendering' | 'ready' | 'failed';
type PlayMode = 'select' | 'h5' | 'mp4';

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
  const [playMode, setPlayMode] = useState<PlayMode>('select');
  const [renderJobId, setRenderJobId] = useState<string | null>(null);
  const watchingJobRef = useRef<string | null>(null);
  const { openSharePoster, loading: shareLoading, modal: shareModal } = useSharePoster();

  const refreshMovieState = useCallback(async () => {
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
        if (renderData.renderJobId) setRenderJobId(renderData.renderJobId as string);
      }
    } catch {
      /* ignore */
    }
  }, [movieId]);

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
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.jobId) setRenderJobId(data.jobId as string);
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
    if (!renderJobId || watchingJobRef.current === renderJobId) return;
    if (renderStatus === 'ready' && mediaUrl) return;

    watchingJobRef.current = renderJobId;
    let cancelled = false;

    void watchJobUntilDone(renderJobId, {
      timeoutMs: 30 * 60 * 1000,
      onProgress: ({ progress }) => {
        if (cancelled) return;
        const message = typeof progress?.message === 'string' ? progress.message : undefined;
        if (message) {
          setRenderProgress((prev) =>
            createRenderProgress({
              phase: prev?.phase ?? 'segments',
              message,
              segmentDone: prev?.segmentDone ?? 0,
              segmentTotal: prev?.segmentTotal ?? 0,
              percent:
                typeof progress?.percent === 'number'
                  ? progress.percent
                  : (prev?.percent ?? 0),
            })
          );
        }
        void refreshMovieState();
      },
    })
      .then(() => {
        if (!cancelled) void refreshMovieState();
      })
      .catch(() => {
        if (!cancelled) void refreshMovieState();
      });

    return () => {
      cancelled = true;
    };
  }, [renderJobId, renderStatus, mediaUrl, refreshMovieState]);

  useEffect(() => {
    if (loading || error) return;
    if (renderStatus === 'ready' && mediaUrl) return;

    void refreshMovieState();
    const intervalMs = renderJobId ? 12000 : renderStatus === 'failed' ? 8000 : 5000;
    const timer = setInterval(() => void refreshMovieState(), intervalMs);
    return () => clearInterval(timer);
  }, [movieId, loading, error, renderStatus, mediaUrl, renderJobId, refreshMovieState]);

  const mp4Ready = renderStatus === 'ready' && Boolean(mediaUrl);
  const mp4Rendering = renderStatus === 'queued' || renderStatus === 'rendering';

  const immersiveHint = useMemo(() => {
    if (mp4Ready) return '视频完整版 · 含配乐与旁白';
    if (mp4Rendering) {
      const pct = renderProgress?.percent ? ` ${renderProgress.percent}%` : '';
      return renderProgress?.message || `完整视频生成中${pct}…`;
    }
    if (renderStatus === 'failed') {
      return renderError || '完整视频暂不可用，请稍后再试';
    }
    return '完整视频准备中，可先使用下方互动版播放';
  }, [mp4Ready, mp4Rendering, renderProgress, renderStatus, renderError]);

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
      return renderProgress?.message || `正在生成完整视频${pct}…`;
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

  const handleBackFromPlayer = () => {
    setPlayMode('select');
  };

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

  if (playMode === 'mp4' && mediaUrl) {
    return (
      <>
        {shareModal}
        <MovieVideoPlayer
          mediaUrl={mediaUrl}
          title={movieTitle}
          subtitle={`${familyName} · ${chapters.length} 个故事章节`}
          onClose={handleBackFromPlayer}
          onShare={appreciate ? undefined : handleShare}
          shareLoading={shareLoading}
          appreciateMode={appreciate}
          autoStart
        />
      </>
    );
  }

  if (playMode === 'h5' && slides.length > 0) {
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
          onClose={handleBackFromPlayer}
          onShare={appreciate ? undefined : handleShare}
          shareLoading={shareLoading}
          autoPlayMs={8000}
          enableMusic
          enableNarration
          appreciateMode={appreciate}
          initialStarted
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

  const coverUrl = slides[0]?.photoUrl;

  return (
    <>
      {shareModal}
      <div className="fixed inset-0 z-[200] bg-black text-white">
        {coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-35 blur-sm scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/70 to-black/90" />

        <div className="relative z-10 flex flex-col min-h-full px-8 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => router.push(closeHref)}
            className="self-start text-white/60 text-sm mb-8 hover:text-white/90 transition-colors"
          >
            ← 返回电影库
          </button>

          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto w-full">
            <p className="text-xs tracking-[0.25em] text-[#D98A45] mb-3">人生电影</p>
            <h1 className="text-2xl font-serif font-medium mb-2 leading-snug">{movieTitle}</h1>
            <p className="text-sm text-white/55 mb-10">
              {familyName} · {chapters.length} 个故事章节
            </p>

            <div className="w-full flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  primeAudioInUserGesture();
                  if (mp4Ready) setPlayMode('mp4');
                }}
                disabled={!mp4Ready}
                className="w-full py-4 rounded-2xl bg-[#D98A45] text-white font-medium text-base shadow-lg shadow-[#D98A45]/25 active:scale-[0.98] transition-transform disabled:opacity-55 disabled:shadow-none"
              >
                沉浸式欣赏
              </button>
              <p className="text-[11px] text-white/45 -mt-1 mb-1 px-2 leading-relaxed">
                {immersiveHint}
              </p>

              <button
                type="button"
                onClick={() => {
                  primeAudioInUserGesture();
                  setPlayMode('h5');
                }}
                className="w-full py-4 rounded-2xl border border-white/25 bg-white/10 text-white font-medium text-base backdrop-blur-sm active:scale-[0.98] transition-transform"
              >
                开始播放
              </button>
              <p className="text-[11px] text-white/45 px-2 leading-relaxed">
                互动版 · 配乐 · 旁白 · 自动翻页
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
