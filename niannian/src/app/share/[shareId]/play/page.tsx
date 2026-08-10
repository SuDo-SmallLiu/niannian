'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import InteractiveStoryPlayer from '@/components/h5/InteractiveStoryPlayer';
import MovieVideoPlayer from '@/components/h5/MovieVideoPlayer';
import {
  buildMovieSlides,
  buildStorySlides,
  type StoryH5Input,
} from '@/lib/h5-story-slides';
import { getSlideNarrationText } from '@/lib/slide-narration';

type SharePlayPayload =
  | {
      share_type: 'story';
      story: StoryH5Input & { photosDetail: StoryH5Input['photosDetail'] };
      family: { name: string } | null;
      read_count?: number;
    }
  | {
      share_type: 'movie';
      movie: {
        id: string;
        title: string;
        summary: string;
        media_url: string | null;
        render_status: string;
      };
      family: { name: string } | null;
      chapters: Array<{
        chapterTitle: string;
        chapterTheme: string;
        story: StoryH5Input & { photosDetail: StoryH5Input['photosDetail'] };
      }>;
      narration: Record<string, { url: string; durationMs: number }>;
    }
  | {
      share_type: 'memory';
      family_name: string;
      photo: {
        url: string;
        taken_at?: string;
        location?: string;
        significance?: string;
        action?: string;
        archetype?: string;
      };
    };

export default function SharePlayPage() {
  const params = useParams();
  const shareCode = params.shareId as string;

  const [payload, setPayload] = useState<SharePlayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playMode, setPlayMode] = useState<'select' | 'h5' | 'mp4'>('select');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/share/play?code=${encodeURIComponent(shareCode)}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || '这个分享链接已失效');
          return;
        }
        setPayload(data as SharePlayPayload);
        if (data.share_type === 'story' || data.share_type === 'memory' || data.share_type === 'movie') {
          setPlayMode('h5');
        }
      } catch {
        setError('加载失败，请检查链接');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [shareCode]);

  const storySlides = useMemo(() => {
    if (!payload || payload.share_type !== 'story') return [];
    return buildStorySlides({
      ...payload.story,
      familyName: payload.family?.name || '',
    });
  }, [payload]);

  const movieSlides = useMemo(() => {
    if (!payload || payload.share_type !== 'movie') return [];
    const familyName = payload.family?.name || '';
    const chapters = payload.chapters.map((ch) => ({
      story: ch.story,
      chapterTitle: ch.chapterTitle,
      chapterTheme: ch.chapterTheme,
    }));
    const base = buildMovieSlides(payload.movie.title, familyName, chapters);
    return base.map((slide) => {
      const narr = payload.narration[slide.id];
      if (!narr?.url) return slide;
      return {
        ...slide,
        narrationUrl: narr.url,
        narrationDurationMs: narr.durationMs > 0 ? narr.durationMs : undefined,
      };
    });
  }, [payload]);

  const mp4Ready =
    payload?.share_type === 'movie' &&
    payload.movie.render_status === 'ready' &&
    Boolean(payload.movie.media_url);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !payload) {
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

  if (payload.share_type === 'memory') {
    const photo = payload.photo;
    const subtitle = [photo.taken_at, photo.location].filter(Boolean).join(' · ');
    return (
      <div className="min-h-screen bg-[#1a1612] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt={photo.action || '家庭记忆'}
            className="w-full max-w-[420px] rounded-2xl shadow-2xl object-cover"
          />
          <div className="max-w-[420px] text-center text-white/90 px-2">
            <p className="text-lg font-medium">{photo.archetype || photo.action || '家庭记忆'}</p>
            {subtitle && <p className="text-sm text-white/60 mt-1">{subtitle}</p>}
            {photo.significance && (
              <p className="text-sm text-white/75 mt-3 leading-relaxed">{photo.significance}</p>
            )}
            <p className="text-xs text-white/40 mt-4">{payload.family_name} · 念念年年</p>
          </div>
        </div>
        <div className="pb-8 text-center">
          <Link href="/" className="text-sm text-[#D98A45] underline underline-offset-2">
            打开念念年年
          </Link>
        </div>
      </div>
    );
  }

  if (payload.share_type === 'story' && playMode === 'h5' && storySlides.length > 0) {
    return (
      <InteractiveStoryPlayer
        slides={storySlides}
        onClose={() => setPlayMode('select')}
        autoPlayMs={7000}
        enableMusic
        enableNarration
        autoStart
      />
    );
  }

  if (payload.share_type === 'movie' && playMode === 'mp4' && payload.movie.media_url) {
    return (
      <MovieVideoPlayer
        mediaUrl={payload.movie.media_url}
        title={payload.movie.title}
        subtitle={`${payload.family?.name || ''} · ${payload.chapters.length} 个故事章节`}
        onClose={() => setPlayMode('select')}
        autoStart
      />
    );
  }

  if (payload.share_type === 'movie' && playMode === 'h5' && movieSlides.length > 0) {
    const narrationNeeded = movieSlides.filter((s) => Boolean(getSlideNarrationText(s))).length;
    const narrationReadyCount = movieSlides.filter(
      (s) => getSlideNarrationText(s) && payload.narration[s.id]?.url
    ).length;

    return (
      <>
        {narrationNeeded > 0 && narrationReadyCount < narrationNeeded && (
          <div className="fixed top-3 left-3 right-3 z-[210] px-3 py-2 rounded-xl text-[11px] bg-black/70 text-white/90 pointer-events-none">
            旁白加载中 {narrationReadyCount}/{narrationNeeded}（可先点击播放）
          </div>
        )}
        <InteractiveStoryPlayer
          slides={movieSlides}
          onClose={() => setPlayMode('select')}
          autoPlayMs={8000}
          enableMusic
          enableNarration
          autoStart
        />
      </>
    );
  }

  const title =
    payload.share_type === 'movie' ? payload.movie.title : payload.story.title;
  const summary =
    payload.share_type === 'movie'
      ? payload.movie.summary
      : payload.story.summary || '';
  const familyName = payload.family?.name || '';

  return (
    <div className="min-h-screen bg-[#1a1612] flex flex-col items-center justify-center px-6 py-10">
      <div className="max-w-md w-full text-center">
        <p className="text-white/50 text-xs mb-2">{familyName} · 念念年年</p>
        <h1 className="text-white text-2xl font-medium mb-3">{title}</h1>
        {summary && <p className="text-white/70 text-sm leading-relaxed mb-8">{summary}</p>}
        {payload.share_type === 'story' && payload.read_count != null && payload.read_count > 0 && (
          <p className="text-white/40 text-xs mb-6">已有 {payload.read_count} 人次阅读</p>
        )}

        <div className="flex flex-col gap-3">
          {payload.share_type === 'movie' && mp4Ready && (
            <button
              type="button"
              onClick={() => setPlayMode('mp4')}
              className="w-full py-3.5 rounded-2xl bg-[#D98A45] text-white font-medium"
            >
              播放完整视频
            </button>
          )}
          <button
            type="button"
            onClick={() => setPlayMode('h5')}
            className={`w-full py-3.5 rounded-2xl font-medium ${
              payload.share_type === 'movie' && mp4Ready
                ? 'bg-white/10 text-white border border-white/20'
                : 'bg-[#D98A45] text-white'
            }`}
          >
            {payload.share_type === 'movie' ? '互动版播放' : '开始阅读'}
          </button>
        </div>

        <Link href="/" className="inline-block mt-8 text-sm text-white/40 underline underline-offset-2">
          打开念念年年
        </Link>
      </div>
    </div>
  );
}
