import fs from 'fs';
import {
  getCacheNarrationFilePath,
  getCacheNarrationPublicUrl,
  getMovieNarrationFilePath,
  getMovieNarrationPublicUrl,
  synthesizeNarration,
} from '@/lib/narration-tts';
import { prepareMovieAudioPlan, renderMovieToMp4 } from '@/lib/movie-render';
import { getLifeMovie, updateMovieRenderStatus } from '@/lib/db';
import { completeJob, updateJobProgress } from '@/lib/jobs/job-repository';
import type { JobRecord } from '@/lib/jobs/types';
import { createRenderProgress } from '@/lib/movie-render-progress';
import { isMovieNarrationPrefetching } from '@/lib/movie-narration-prefetch';
import { estimateNarrationMs } from '@/lib/slide-narration';

/** 旁白缓存命中时同步返回，避免走 Job 队列 */
export async function tryGetCachedSpeechResult(input: {
  text: string;
  movieId?: string;
  slideId?: string;
}): Promise<{ url: string; durationMs: number; cached: true; engine: 'cache' } | null> {
  const trimmed = input.text.trim();
  if (!trimmed) return null;

  let filePath: string;
  let publicUrl: string;
  if (input.movieId && input.slideId) {
    filePath = getMovieNarrationFilePath(input.movieId, input.slideId);
    publicUrl = getMovieNarrationPublicUrl(input.movieId, input.slideId);
  } else {
    filePath = getCacheNarrationFilePath(trimmed);
    publicUrl = getCacheNarrationPublicUrl(trimmed);
  }

  if (!fs.existsSync(filePath)) return null;

  return {
    url: publicUrl,
    durationMs: estimateNarrationMs(trimmed),
    cached: true,
    engine: 'cache',
  };
}

export async function executeSpeechSynthesizeJob(job: JobRecord): Promise<void> {
  const text = (job.payload.text as string | undefined)?.trim();
  if (!text) throw new Error('旁白文本为空');

  updateJobProgress(job.id, { message: '正在生成旁白…' });
  const result = await synthesizeNarration(text, {
    movieId: job.payload.movieId as string | undefined,
    slideId: job.payload.slideId as string | undefined,
    force: !!job.payload.force,
  });

  completeJob(job.id, {
    url: result.url,
    durationMs: result.durationMs,
    cached: result.cached,
    engine: result.engine,
  });
}

export async function executeMovieAudioPlanJob(job: JobRecord): Promise<void> {
  const movieId = job.resourceId || (job.payload.movieId as string | undefined);
  if (!movieId) throw new Error('缺少 movieId');

  updateJobProgress(job.id, { message: '正在生成音频方案…' });
  const plan = await prepareMovieAudioPlan(movieId);
  completeJob(job.id, { audioPlan: plan });
}

async function waitForNarrationPrefetch(movieId: string, maxWaitMs = 600_000): Promise<void> {
  const start = Date.now();
  while (isMovieNarrationPrefetching(movieId)) {
    if (Date.now() - start > maxWaitMs) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
}

export async function executeMovieRenderJob(job: JobRecord): Promise<void> {
  const movieId = job.resourceId || (job.payload.movieId as string | undefined);
  if (!movieId) throw new Error('缺少 movieId');

  const retry = !!job.payload.retry;
  const movie = getLifeMovie(movieId);
  if (!movie) throw new Error('人生电影不存在');

  updateMovieRenderStatus(movieId, 'queued', {
    error: '',
    progress: createRenderProgress({
      phase: 'queued',
      message: retry ? '正在重新生成完整视频…' : '渲染任务排队中…',
    }),
  });

  updateJobProgress(job.id, { message: '等待旁白预生成…' });
  await waitForNarrationPrefetch(movieId);

  updateJobProgress(job.id, { message: '正在渲染 MP4…' });
  const result = await renderMovieToMp4(movieId);

  completeJob(job.id, {
    mediaUrl: result.mediaUrl,
    totalDurationMs: result.totalDurationMs,
    segmentCount: result.segmentCount,
  });
}
