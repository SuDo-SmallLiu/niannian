import {
  createJob,
  findActiveJobByIdempotencyKey,
  getJobById,
  updateJobProgress,
} from '@/lib/jobs/job-repository';
import { scheduleInProcessJobDrain } from '@/lib/jobs/job-processor';
import type { JobRecord } from '@/lib/jobs/types';
import { initPhotoTaskProgress } from '@/lib/jobs/photo-analysis-jobs';

export function createStoryComposeJob(input: {
  familyId: string;
  photoIds: string[];
}): string {
  const job = createJob({
    type: 'story_compose',
    familyId: input.familyId,
    idempotencyKey: `story_compose:${input.familyId}:${input.photoIds.join(',')}`,
    payload: { photoIds: input.photoIds },
  });
  scheduleInProcessJobDrain();
  return job.id;
}

export function createPhotoAnalysisJob(input: {
  familyId: string;
  photoIds: string[];
}): JobRecord {
  const existing = findActiveJobByIdempotencyKey(`photo_analysis:${input.familyId}`);
  if (existing) return existing;

  const job = createJob({
    type: 'photo_analysis',
    familyId: input.familyId,
    idempotencyKey: `photo_analysis:${input.familyId}`,
    payload: { photoIds: input.photoIds },
  });

  updateJobProgress(job.id, {
    message: '排队中…',
    tasks: initPhotoTaskProgress(input.photoIds),
    total: input.photoIds.length,
    completed: 0,
    failed: 0,
  });

  scheduleInProcessJobDrain();
  return getJobById(job.id)!;
}

export function createPhotoAnalyzeSingleJob(input: {
  familyId: string;
  photoId: string;
  withSupplement?: boolean;
  mode?: 'analyze' | 'retry';
}): string {
  const keySuffix = input.mode === 'retry' ? 'retry' : 'analyze';
  const job = createJob({
    type: 'photo_analyze_single',
    familyId: input.familyId,
    resourceId: input.photoId,
    idempotencyKey: `photo_${keySuffix}:${input.photoId}`,
    payload: {
      withSupplement: !!input.withSupplement,
      mode: input.mode || 'analyze',
    },
  });
  scheduleInProcessJobDrain();
  return job.id;
}

export function createSpeechSynthesizeJob(input: {
  text: string;
  movieId?: string;
  slideId?: string;
  force?: boolean;
  familyId?: string;
}): JobRecord {
  const keyParts = [
    'speech',
    input.movieId || 'cache',
    input.slideId || input.text.slice(0, 64),
    input.force ? 'force' : 'normal',
  ];
  const existing = findActiveJobByIdempotencyKey(keyParts.join(':'));
  if (existing) return existing;

  const job = createJob({
    type: 'speech_synthesize',
    familyId: input.familyId,
    resourceId: input.movieId,
    idempotencyKey: keyParts.join(':'),
    payload: {
      text: input.text,
      movieId: input.movieId,
      slideId: input.slideId,
      force: !!input.force,
    },
  });
  scheduleInProcessJobDrain();
  return getJobById(job.id)!;
}

export function createMovieAudioPlanJob(input: {
  movieId: string;
  familyId: string;
}): JobRecord {
  const existing = findActiveJobByIdempotencyKey(`movie_audio_plan:${input.movieId}`);
  if (existing) return existing;

  const job = createJob({
    type: 'movie_audio_plan',
    familyId: input.familyId,
    resourceId: input.movieId,
    idempotencyKey: `movie_audio_plan:${input.movieId}`,
    payload: { movieId: input.movieId },
  });
  scheduleInProcessJobDrain();
  return getJobById(job.id)!;
}

export function createMovieRenderJob(input: {
  movieId: string;
  familyId: string;
  retry?: boolean;
}): JobRecord {
  const suffix = input.retry ? 'retry' : 'render';
  const existing = findActiveJobByIdempotencyKey(`movie_render:${input.movieId}:${suffix}`);
  if (existing) return existing;

  const job = createJob({
    type: 'movie_render',
    familyId: input.familyId,
    resourceId: input.movieId,
    idempotencyKey: `movie_render:${input.movieId}:${suffix}`,
    payload: { movieId: input.movieId, retry: !!input.retry },
  });
  scheduleInProcessJobDrain();
  return getJobById(job.id)!;
}

export function findActiveMovieRenderJob(movieId: string): JobRecord | null {
  return (
    findActiveJobByIdempotencyKey(`movie_render:${movieId}:render`) ||
    findActiveJobByIdempotencyKey(`movie_render:${movieId}:retry`)
  );
}

export function createMovieGenerateJob(input: {
  familyId: string;
  replaceExisting?: boolean;
  prefetchAudio?: boolean;
  renderVideo?: boolean;
}): JobRecord {
  const existing = findActiveJobByIdempotencyKey(`movie_generate:${input.familyId}`);
  if (existing) return existing;

  const job = createJob({
    type: 'movie_generate',
    familyId: input.familyId,
    idempotencyKey: `movie_generate:${input.familyId}`,
    payload: {
      replaceExisting: input.replaceExisting !== false,
      prefetchAudio: !!input.prefetchAudio,
      renderVideo: !!input.renderVideo,
    },
  });
  scheduleInProcessJobDrain();
  return getJobById(job.id)!;
}

