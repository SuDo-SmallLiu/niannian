import { renderMovieToMp4 } from '@/lib/movie-render';
import { updateMovieRenderStatus, getLifeMovie } from '@/lib/db';
import { createRenderProgress } from '@/lib/movie-render-progress';
import { isMovieNarrationPrefetching } from '@/lib/movie-narration-prefetch';

const rendering = new Set<string>();
let globalRenderActive = false;

async function waitForNarrationPrefetch(movieId: string, maxWaitMs = 600_000): Promise<void> {
  const start = Date.now();
  while (isMovieNarrationPrefetching(movieId)) {
    if (Date.now() - start > maxWaitMs) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
}

/** 后台渲染人生电影 MP4（幂等；旁白 prefetch 进行中时会等待；全局同时仅 1 个） */
export function scheduleMovieRender(movieId: string): boolean {
  if (rendering.has(movieId) || globalRenderActive) return false;

  const movie = getLifeMovie(movieId);
  if (!movie) return false;
  if (movie.render_status === 'ready' && movie.media_url) return false;

  rendering.add(movieId);
  globalRenderActive = true;
  updateMovieRenderStatus(movieId, 'queued', {
    progress: createRenderProgress({
      phase: 'queued',
      message: '渲染任务排队中，等待旁白生成…',
    }),
  });

  void (async () => {
    try {
      await waitForNarrationPrefetch(movieId);
      const result = await renderMovieToMp4(movieId);
      console.info('[movie-render] done:', movieId, result.mediaUrl, `${result.totalDurationMs}ms`);
    } catch (err) {
      console.error('[movie-render] failed:', movieId, err);
    } finally {
      rendering.delete(movieId);
      globalRenderActive = false;
    }
  })();

  return true;
}

export function isMovieRendering(movieId: string): boolean {
  return rendering.has(movieId);
}

/** 旁白预生成完成后链式触发渲染 */
export function scheduleMovieRenderAfterNarration(movieId: string): void {
  scheduleMovieRender(movieId);
}
