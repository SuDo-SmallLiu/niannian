import { getLifeMovie } from '@/lib/db';
import {
  createMovieRenderJob,
  findActiveMovieRenderJob,
} from '@/lib/jobs/create-jobs';

/** 通过 DB Job 队列调度人生电影 MP4 渲染（全局同时仅 1 个 running） */
export function scheduleMovieRender(
  movieId: string,
  options: { retry?: boolean; familyId?: string } = {}
): boolean {
  const movie = getLifeMovie(movieId);
  if (!movie) return false;
  if (movie.render_status === 'ready' && movie.media_url && !options.retry) return false;
  if (movie.render_status === 'failed' && !options.retry) return false;

  const familyId = options.familyId || movie.family_id;
  if (!familyId) return false;

  if (findActiveMovieRenderJob(movieId)) return false;

  createMovieRenderJob({ movieId, familyId, retry: options.retry });
  return true;
}

export function isMovieRendering(movieId: string): boolean {
  return !!findActiveMovieRenderJob(movieId);
}

/** 旁白预生成完成后链式触发渲染 */
export function scheduleMovieRenderAfterNarration(movieId: string): void {
  scheduleMovieRender(movieId, { retry: false });
}

export function retryMovieRender(movieId: string): boolean {
  return scheduleMovieRender(movieId, { retry: true });
}
