import { createJob, getJobById, jobToPublicView } from '@/lib/jobs/job-repository';
import { scheduleInProcessJobDrain } from '@/lib/jobs/job-processor';
import type { JobRecord } from '@/lib/jobs/types';
import type { RunStoryEngineOptions } from '@/lib/story-engine';

export type StoryJobStatus = 'queued' | 'running' | 'done' | 'error';

/** 与旧版内存 Job 兼容的视图 */
export interface StoryJob {
  id: string;
  familyId: string;
  status: StoryJobStatus;
  progress: string;
  error?: string;
  storyCount?: number;
  sceneCount?: number;
  createdAt: number;
  updatedAt: number;
}

function mapStatus(status: JobRecord['status']): StoryJobStatus {
  if (status === 'cancelled') return 'error';
  return status;
}

function toStoryJob(job: JobRecord): StoryJob {
  const progressMessage =
    typeof job.progress.message === 'string' ? job.progress.message : '处理中…';

  return {
    id: job.id,
    familyId: job.familyId || '',
    status: mapStatus(job.status),
    progress: progressMessage,
    error: job.errorMessage || undefined,
    storyCount:
      typeof job.result?.storyCount === 'number' ? job.result.storyCount : undefined,
    sceneCount:
      typeof job.result?.sceneCount === 'number' ? job.result.sceneCount : undefined,
    createdAt: Date.parse(job.createdAt),
    updatedAt: Date.parse(job.updatedAt),
  };
}

export function createStoryJob(
  familyId: string,
  options: Pick<RunStoryEngineOptions, 'replaceExisting'> = {}
): string {
  const job = createJob({
    type: 'story_generate',
    familyId,
    idempotencyKey: `story_generate:${familyId}`,
    payload: { replaceExisting: options.replaceExisting !== false },
  });
  return job.id;
}

export function getStoryJob(jobId: string): StoryJob | null {
  const job = getJobById(jobId);
  if (!job || job.type !== 'story_generate') return null;
  return toStoryJob(job);
}

export function startStoryJob(
  jobId: string,
  _options: RunStoryEngineOptions = {}
): void {
  const job = getJobById(jobId);
  if (!job || job.type !== 'story_generate') return;
  scheduleInProcessJobDrain();
}

export function createStoryRegenerateJob(input: {
  storyId: string;
  familyId: string;
  mode: string;
}): string {
  const job = createJob({
    type: 'story_regenerate',
    familyId: input.familyId,
    resourceId: input.storyId,
    idempotencyKey: `story_regenerate:${input.storyId}:${input.mode}`,
    payload: { storyId: input.storyId, mode: input.mode },
  });
  scheduleInProcessJobDrain();
  return job.id;
}

export function getStoryRegenerateJob(jobId: string): StoryJob | null {
  const job = getJobById(jobId);
  if (!job || job.type !== 'story_regenerate') return null;
  return toStoryJob(job);
}

export function getPublicJobView(jobId: string) {
  const job = getJobById(jobId);
  return job ? jobToPublicView(job) : null;
}
