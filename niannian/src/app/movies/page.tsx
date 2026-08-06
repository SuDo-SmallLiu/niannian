'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useAppDialog } from '@/components/providers/app-dialog-provider';
import { useSharePoster } from '@/hooks/useSharePoster';
import { Film, Play, Share2 } from 'lucide-react';

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
  const { showLoading, hideLoading, alert } = useAppDialog();
  const { openSharePoster, loading: shareLoading, modal: shareModal } = useSharePoster();
  const [movies, setMovies] = useState<LifeMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingFamilyId, setGeneratingFamilyId] = useState<string | null>(null);

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
    showLoading('正在编排人生电影', '将家庭故事按主题串联成章节…');
    try {
      const res = await fetch('/api/movie/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId }),
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
    <div className="min-h-screen flex flex-col bg-[#1a1612] text-white">
      {shareModal}
      <Header />
      <main className="flex-1 px-6 py-8 pb-24">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#D98A45]/20 mb-4">
            <Film className="w-7 h-7 text-[#D98A45]" />
          </div>
          <h1 className="text-2xl font-serif mb-2">人生电影</h1>
          <p className="text-sm text-white/50">多个故事串联 · 沉浸式 H5 播放</p>
        </div>

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
          <div className="space-y-4 max-w-md mx-auto">
            {movies.map((movie) => (
              <div
                key={movie.id}
                className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
              >
                <button
                  type="button"
                  onClick={() => router.push(`/movies/${movie.id}/play`)}
                  className="w-full text-left p-5 active:scale-[0.99] transition-transform"
                >
                  <p className="text-xs text-[#D98A45] mb-1">{movie.family_name}</p>
                  <h2 className="text-lg font-serif font-semibold mb-2">{movie.title}</h2>
                  <p className="text-sm text-white/50 line-clamp-2">{movie.summary}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-white/30">
                      {movie.chapter_count || 0} 个章节 · {movie.created_at?.slice(0, 10)}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-[#D98A45]">
                      <Play className="w-4 h-4" /> 播放
                    </span>
                  </div>
                </button>
                <div className="px-5 pb-4">
                  <button
                    type="button"
                    disabled={shareLoading}
                    onClick={(e) => handleShare(movie, e)}
                    className="w-full py-2.5 rounded-xl border border-white/15 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Share2 className="w-4 h-4" />
                    {shareLoading ? '生成中…' : '💬 分享人生电影'}
                  </button>
                </div>
              </div>
            ))}

            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-white/40 mb-3 text-center">重新生成</p>
              <GenerateFromFamilies onGenerate={handleGenerate} loadingId={generatingFamilyId} compact />
            </div>
          </div>
        )}
      </main>
    </div>
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
