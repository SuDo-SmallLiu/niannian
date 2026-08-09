'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import InteractiveStoryPlayer from '@/components/h5/InteractiveStoryPlayer';
import MovieVideoPlayer from '@/components/h5/MovieVideoPlayer';
import { useSharePoster } from '@/hooks/useSharePoster';
import { useAppreciateMode } from '@/components/providers/appreciate-mode-provider';
import { buildMovieSlides, type StoryH5Input } from '@/lib/h5-story-slides';
import { getSlideNarrationText } from '@/lib/slide-narration';
import type { MovieRenderProgress } from '@/lib/movie-render-progress';

type RenderStatus = 'none' | 'queued' | 'rendering' | 'ready' | 'failed';

export default function MoviePlayPage() {
  const params = useParams();
  const router = useRouter();
  const movieId = params.id as string;
  const appreciate = useAppreciateMode();

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
  const [narrationPrepDone, setNarrationPrepDone] = useState(false);
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
        setRenderStatus((data.movie.render_status as RenderStatus) || 'none');
        setRenderError(data.movie.render_error || '');

        const urls: string[] = [];
        for (const ch of data.chapters || []) {
          const url = ch.story?.photosDetail?.[0]?.url;
          if (url) urls.push(url);
          if (urls.length >= 4) break;
        }
        setPhotoUrls(urls);

        // 无 MP4：旁白预生成完成后自动链式触发 FFmpeg（不要并行重复触发 render）
        if (!data.movie.media_url && data.movie.render_status !== 'ready') {
          void fetch('/api/movie/prefetch-narration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ movieId, renderVideo: true }),
          });
        }
      } catch {
        setError('加载失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [movieId]);

  // 轮询渲染状态 + 旁白 manifest
  useEffect(() => {
    if (loading || error) return;

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
          if (movieData.movie?.render_error) {
            setRenderError(movieData.movie.render_error);
          }
        }
        if (renderRes.ok) {
          if (renderData.mediaUrl) setMediaUrl(renderData.mediaUrl);
          if (renderData.renderStatus) setRenderStatus(renderData.renderStatus);
          if (renderData.renderError) setRenderError(renderData.renderError);
          if (renderData.renderProgress) setRenderProgress(renderData.renderProgress);
        }
      } catch {
        // ignore
      }
    };

    if (renderStatus === 'ready' && mediaUrl) return;

    const timer = setInterval(poll, 2000);
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

  const narrationPrepComplete =
    narrationNeeded === 0 || narrationReadyCount >= narrationNeeded || narrationPrepDone;

  // 旁白预生成：最多等 3 分钟，避免无限阻塞
  useEffect(() => {
    if (loading || error || narrationNeeded === 0) return;
    if (narrationReadyCount >= narrationNeeded) return;

    const timeout = setTimeout(() => setNarrationPrepDone(true), 180_000);
    return () => clearTimeout(timeout);
  }, [loading, error, narrationNeeded, narrationReadyCount]);

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

  // 优先：服务端 FFmpeg 混音完整 MP4（两种播放入口共用）
  if (mediaUrl && renderStatus === 'ready') {
    return (
      <>
        {shareModal}
        <MovieVideoPlayer
          mediaUrl={mediaUrl}
          title={movieTitle}
          subtitle={`${familyName} · ${chapters.length} 个故事章节`}
          onClose={() => router.push(closeHref)}
          onShare={appreciate || shareLoading ? undefined : handleShare}
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
      {(renderStatus === 'queued' || renderStatus === 'rendering') && (
        <div className="fixed top-4 left-4 right-4 z-[210] px-4 py-3 rounded-2xl bg-black/75 text-white text-xs">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin shrink-0" />
            <span>{renderProgress?.message || '正在生成完整 MP4（FFmpeg 混音）…'}</span>
          </div>
          {renderProgress && renderProgress.segmentTotal > 0 && (
            <div className="h-1 rounded-full bg-white/20 overflow-hidden mb-1">
              <div
                className="h-full bg-[#D98A45] transition-all duration-500"
                style={{ width: `${renderProgress.percent}%` }}
              />
            </div>
          )}
          <p className="text-white/50 text-[10px]">
            {renderProgress?.phase === 'narration' && '第 1 步：旁白生成完成后开始 FFmpeg'}
            {renderProgress?.phase === 'segments' &&
              `第 2 步：逐片段混音 ${renderProgress.segmentDone}/${renderProgress.segmentTotal}${renderProgress.currentMusicId ? ` · 当前 BGM: ${renderProgress.currentMusicId}` : ''}`}
            {renderProgress?.phase === 'concat' && '第 3 步：拼接完整 MP4…'}
            {renderProgress?.phase === 'queued' && '排队中，可先预览下方 H5 版'}
            {!renderProgress && '渲染完成后将自动切换到完整音视频'}
          </p>
        </div>
      )}
      {renderStatus === 'failed' && renderError && (
        <div className="fixed top-4 left-4 right-4 z-[210] px-4 py-2 rounded-xl bg-amber-900/80 text-amber-100 text-xs">
          视频渲染失败：{renderError.slice(0, 120)}（当前为 H5 实时播放）
        </div>
      )}
      {!narrationPrepComplete && narrationNeeded > 0 && (
        <div className="fixed top-4 left-4 right-4 z-[210] px-4 py-3 rounded-2xl bg-black/75 text-white text-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin shrink-0" />
            <span>
              旁白准备中 {narrationReadyCount}/{narrationNeeded}
            </span>
          </div>
          <p className="text-white/50 text-[10px]">首次生成约需 1–2 分钟，完成后自动开始播放</p>
        </div>
      )}
      <InteractiveStoryPlayer
        slides={slides}
        movieId={movieId}
        onClose={() => router.push(closeHref)}
        onShare={appreciate || shareLoading ? undefined : handleShare}
        autoPlayMs={8000}
        enableMusic
        enableNarration
        appreciateMode={appreciate}
        autoStart={narrationPrepComplete}
      />
    </>
  );
}
