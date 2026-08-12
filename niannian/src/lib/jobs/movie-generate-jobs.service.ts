import { runMovieEngine } from '@/lib/movie-engine';
import { scheduleMovieNarrationPrefetch } from '@/lib/movie-narration-prefetch';
import { scheduleMovieRender } from '@/lib/movie-render-queue';
import { completeJob, updateJobProgress } from '@/lib/jobs/job-repository';
import type { JobRecord } from '@/lib/jobs/types';

export async function executeMovieGenerateJob(job: JobRecord): Promise<void> {
  const familyId = job.familyId;
  if (!familyId) throw new Error('缺少 familyId');

  const replaceExisting = job.payload.replaceExisting !== false;
  const prefetchAudio = job.payload.prefetchAudio === true;
  const renderVideo = job.payload.renderVideo === true;

  updateJobProgress(job.id, { message: '正在编排人生电影章节…' });
  const result = runMovieEngine(familyId, { replaceExisting });

  if (prefetchAudio) {
    updateJobProgress(job.id, { message: '正在预生成旁白…' });
    scheduleMovieNarrationPrefetch(result.movieId, { renderVideo });
  } else if (renderVideo) {
    updateJobProgress(job.id, { message: '渲染任务排队中…' });
    scheduleMovieRender(result.movieId, { familyId });
  }

  completeJob(job.id, {
    movieId: result.movieId,
    title: result.title,
    summary: result.summary,
    chapterCount: result.chapterCount,
    audio: prefetchAudio ? { status: 'prefetching' } : { status: 'lazy' },
    video: renderVideo
      ? { status: prefetchAudio ? 'after_audio' : 'queued' }
      : { status: 'lazy' },
  });
}
