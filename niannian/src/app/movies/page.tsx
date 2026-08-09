'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import PageShell from '@/components/PageShell';
import PageHero from '@/components/PageHero';
import PipelineSteps from '@/components/PipelineSteps';
import { useAppreciateMode } from '@/components/providers/appreciate-mode-provider';
import { useAppDialog } from '@/components/providers/app-dialog-provider';
import { useSharePoster } from '@/hooks/useSharePoster';
import { Play } from 'lucide-react';

interface LifeMovie {
  id: string;
  family_id: string;
  title: string;
  summary: string;
  created_at: string;
  family_name?: string;
  chapter_count?: number;
  photo_urls?: string[];
}

export default function MoviesPage() {
  const router = useRouter();
  const { showLoading, hideLoading, alert, confirm } = useAppDialog();
  const { openSharePoster, loading: shareLoading, modal: shareModal } = useSharePoster();
  const [movies, setMovies] = useState<LifeMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingFamilyId, setGeneratingFamilyId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const appreciate = useAppreciateMode();

  useEffect(() => {
    loadMovies();
  }, []);

  async function loadMovies() {
    try {
      const familyRes = await fetch('/api/family');
      const familyData = await familyRes.json();
      const families = familyData.families || [];

      const all: LifeMovie[] = [];
      for (const family of families) {
        const res = await fetch(`/api/movie?familyId=${family.id}`);
        const data = await res.json();
        for (const m of data.movies || []) {
          const chRes = await fetch(`/api/movie?movieId=${m.id}`);
          const chData = await chRes.json();
          all.push({
            ...m,
            family_name: family.name,
            chapter_count: chData.chapters?.length || 0,
            photo_urls: (chData.chapters || [])
              .map((ch: { story?: { photosDetail?: Array<{ url: string }> } }) =>
                ch.story?.photosDetail?.[0]?.url
              )
              .filter(Boolean)
              .slice(0, 4),
          });
        }
      }
      setMovies(all);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(familyId: string) {
    setGeneratingFamilyId(familyId);
    showLoading('正在编排人生电影', '串联故事章节并渲染音视频，完成后即可播放…');
    try {
      const res = await fetch('/api/movie/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId, prefetchAudio: true, renderVideo: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成失败');
      router.push(`/movies/${data.movieId}/play`);
    } catch (err) {
      await alert({
        title: '无法生成',
        description: err instanceof Error ? err.message : '请稍后重试',
      });
    } finally {
      hideLoading();
      setGeneratingFamilyId(null);
      loadMovies();
    }
  }

  async function handleDelete(movie: LifeMovie, e: React.MouseEvent) {
    e.stopPropagation();
    const ok = await confirm({
      title: `删除「${movie.title}」？`,
      description: '删除后无法恢复。',
      confirmText: '确认删除',
      cancelText: '取消',
      destructive: true,
    });
    if (!ok) return;

    setDeletingId(movie.id);
    try {
      const res = await fetch(`/api/movie?movieId=${movie.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '删除失败');
      setMovies((prev) => prev.filter((m) => m.id !== movie.id));
    } catch (err) {
      await alert({
        title: '删除失败',
        description: err instanceof Error ? err.message : '请稍后重试',
      });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleShare(movie: LifeMovie, e: React.MouseEvent) {
    e.stopPropagation();
    await openSharePoster({
      type: 'movie',
      movieId: movie.id,
      title: movie.title,
      subtitle: `${movie.chapter_count || 0} 个故事章节`,
      summary: movie.summary || `${movie.family_name} · 人生电影`,
      familyName: movie.family_name || '',
      photoUrls: movie.photo_urls || [],
    });
  }

  return (
    <PageShell dark className={appreciate ? 'text-lg' : ''}>
      {shareModal}
      <PageHero
        title="人生电影"
        subtitle={appreciate ? '自动播放 · 配乐旁白' : '故事成片 · 配乐旁白自动播放'}
        large={appreciate}
      >
        {!appreciate && <PipelineSteps active={3} compact dark />}
      </PageHero>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-white/20 border-t-[#D98A45] rounded-full animate-spin" />
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/40 mb-6">还没有人生电影</p>
            <p className="text-sm text-white/30 mb-8">先为家庭「发现故事」，再生成人生电影</p>
            <GenerateFromFamilies onGenerate={handleGenerate} loadingId={generatingFamilyId} />
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <div className="columns-2 gap-3 space-y-3">
              {movies.map((movie, idx) => {
                const cover = movie.photo_urls?.[0];
                const tall = idx % 3 === 0;
                return (
                  <div
                    key={movie.id}
                    className="break-inside-avoid mb-3 rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          appreciate
                            ? `/movies/${movie.id}/play?appreciate=1`
                            : `/movies/${movie.id}/play`
                        )
                      }
                      className="w-full text-left active:scale-[0.99] transition-transform"
                    >
                      {cover && (
                        <div className={`relative w-full ${tall ? 'aspect-[3/4]' : 'aspect-square'} bg-black/30`}>
                          <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          <span className="absolute bottom-2 left-2 flex items-center gap-1 text-xs text-[#D98A45]">
                            <Play className="w-3 h-3" /> 播放
                          </span>
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-[10px] text-[#D98A45] mb-0.5">{movie.family_name}</p>
                        <h2 className={`font-serif font-semibold mb-1 leading-snug ${appreciate ? 'text-lg' : 'text-base'}`}>
                          {movie.title}
                        </h2>
                        <p className="text-xs text-white/50 line-clamp-2">{movie.summary}</p>
                        <p className="text-[10px] text-white/30 mt-2">
                          {movie.chapter_count || 0} 章 · {movie.created_at?.slice(0, 10)}
                        </p>
                      </div>
                    </button>
                    {!appreciate && (
                      <div className="px-3 pb-3 flex gap-2">
                        <button
                          type="button"
                          disabled={shareLoading}
                          onClick={(e) => handleShare(movie, e)}
                          className="flex-1 py-2 rounded-xl border border-white/15 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50"
                        >
                          分享
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === movie.id}
                          onClick={(e) => handleDelete(movie, e)}
                          className="px-3 py-2 rounded-xl border border-red-400/30 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          {deletingId === movie.id ? '…' : '删除'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!appreciate && (
              <div className="pt-6 mt-4 border-t border-white/10">
                <p className="text-xs text-white/40 mb-3 text-center">重新生成</p>
                <GenerateFromFamilies onGenerate={handleGenerate} loadingId={generatingFamilyId} compact />
              </div>
            )}
          </div>
        )}
    </PageShell>
  );
}

function GenerateFromFamilies({
  onGenerate,
  loadingId,
  compact = false,
}: {
  onGenerate: (familyId: string) => void;
  loadingId: string | null;
  compact?: boolean;
}) {
  const [families, setFamilies] = useState<Array<{ id: string; name: string; story_count: number }>>([]);

  useEffect(() => {
    fetch('/api/family')
      .then((r) => r.json())
      .then((d) => setFamilies(d.families || []));
  }, []);

  if (families.length === 0) return null;

  return (
    <div className={`space-y-2 ${compact ? '' : 'max-w-xs mx-auto'}`}>
      {families
        .filter((f) => (f.story_count || 0) > 0)
        .map((f) => (
          <button
            key={f.id}
            type="button"
            disabled={loadingId === f.id}
            onClick={() => onGenerate(f.id)}
            className="w-full py-3 px-4 rounded-xl bg-[#D98A45] text-white text-sm font-medium disabled:opacity-50"
          >
            {loadingId === f.id ? '生成中…' : `🎬 为「${f.name}」生成人生电影`}
          </button>
        ))}
    </div>
  );
}
