import { buildMovieSlidesForServer } from '@/lib/movie-slides-server';
import { generateMovieNarrations } from '@/lib/narration-tts';

const prefetching = new Set<string>();

/** 后台批量预生成人生电影旁白（幂等，同一 movieId 不重复启动） */
export function scheduleMovieNarrationPrefetch(movieId: string): boolean {
  if (prefetching.has(movieId)) return false;
  prefetching.add(movieId);

  void (async () => {
    try {
      const built = await buildMovieSlidesForServer(movieId);
      if (!built?.slides.length) return;
      const audio = await generateMovieNarrations(movieId, built.slides);
      if (audio.failed > 0) {
        console.warn('[movie-narration-prefetch] partial failure:', movieId, audio);
      }
    } catch (err) {
      console.error('[movie-narration-prefetch] failed:', movieId, err);
    } finally {
      prefetching.delete(movieId);
    }
  })();

  return true;
}

export function isMovieNarrationPrefetching(movieId: string): boolean {
  return prefetching.has(movieId);
}
