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
