import {
  createLifeMovie,
  deleteLifeMoviesByFamily,
  getFamily,
  getLifeMovie,
  getStoriesByFamily,
  setMovieChapters,
} from '@/lib/db';

const THEME_ORDER = ['成长', '陪伴', '团圆', '传承', '探索', '庆祝', '告别', '爱', '第一次'];

function themeSortKey(theme: string): number {
  const idx = THEME_ORDER.indexOf(theme);
  return idx >= 0 ? idx : 99;
}

export interface MovieEngineResult {
  movieId: string;
  title: string;
  summary: string;
  chapterCount: number;
}

/** 将家庭下全部 Story 编排为一部 Life Movie */
export function runMovieEngine(
  familyId: string,
  options: { replaceExisting?: boolean } = {}
): MovieEngineResult {
  const family = getFamily(familyId);
  if (!family) throw new Error('家庭不存在');

  const stories = getStoriesByFamily(familyId);
  if (stories.length === 0) throw new Error('还没有故事，请先「发现故事」');

  const sorted = [...stories].sort((a, b) => {
    const ta = themeSortKey(a.theme || '');
    const tb = themeSortKey(b.theme || '');
    if (ta !== tb) return ta - tb;
    return (a.created_at || '').localeCompare(b.created_at || '');
  });

  if (options.replaceExisting !== false) {
    deleteLifeMoviesByFamily(familyId);
  }

  const title = `${family.name}的人生电影`;
  const summary = `收录 ${sorted.length} 段家庭记忆，从「${sorted[0]?.theme || '日常'}」到「${sorted[sorted.length - 1]?.theme || '陪伴'}」`;
  const coverStoryId = sorted[0]?.cover_photo_id
    ? sorted[0].id
    : sorted[0]?.id;

  const movieId = createLifeMovie({
    familyId,
    title,
    summary,
    coverStoryId,
  });

  setMovieChapters(
    movieId,
    sorted.map((s, i) => ({
      storyId: s.id,
      orderIndex: i,
      title: s.title,
      theme: s.theme || '',
    }))
  );

  return { movieId, title, summary, chapterCount: sorted.length };
}

export { getLifeMovie };
