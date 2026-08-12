import { getDb } from '@/lib/db';
import {
  dbJobToFamilyAnalysisJob,
  findActivePhotoAnalysisJob,
  summarizePhotoTasks,
  type PhotoTaskProgress,
} from '@/lib/jobs/photo-analysis-jobs';
import { getJobById } from '@/lib/jobs/job-repository';

export type PhotoTaskStatus = 'pending' | 'active' | 'completed' | 'failed';

export interface PhotoTaskState {
  photoId: string;
  status: PhotoTaskStatus;
  error?: string;
  updatedAt: number;
}

export interface FamilyAnalysisJob {
  familyId: string;
  status: 'processing' | 'done' | 'error';
  photos: PhotoTaskState[];
  startedAt: number;
  updatedAt: number;
  jobId?: string;
}

/** @deprecated 内存任务已迁移至 DB；保留 API 兼容 */
const legacyJobs = new Map<string, FamilyAnalysisJob>();
const TTL_MS = 30 * 60 * 1000;

export function cleanupStaleAnalysisJobs(): void {
  const now = Date.now();
  for (const [familyId, job] of legacyJobs) {
    if (now - job.updatedAt > TTL_MS) legacyJobs.delete(familyId);
  }
}

export function getAnalysisJob(familyId: string): FamilyAnalysisJob | undefined {
  cleanupStaleAnalysisJobs();

  const dbJob = findActivePhotoAnalysisJob(familyId);
  if (dbJob) {
    const mapped = dbJobToFamilyAnalysisJob(dbJob);
    return { ...mapped, jobId: dbJob.id };
  }

  const recentDone = getRecentPhotoAnalysisJob(familyId);
  if (recentDone) {
    return { ...recentDone, jobId: recentDone.jobId };
  }

  return legacyJobs.get(familyId);
}

function getRecentPhotoAnalysisJob(
  familyId: string
): (FamilyAnalysisJob & { jobId: string }) | undefined {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id FROM jobs
       WHERE family_id = ? AND type = 'photo_analysis'
         AND status IN ('done', 'error')
         AND completed_at > datetime('now', '-30 minutes')
       ORDER BY completed_at DESC LIMIT 1`
    )
    .get(familyId) as { id: string } | undefined;

  if (!row) return undefined;
  const job = getJobById(row.id);
  if (!job) return undefined;
  return { ...dbJobToFamilyAnalysisJob(job), jobId: job.id };
}

/** @deprecated 使用 createPhotoAnalysisJob */
export function createAnalysisJob(familyId: string, photoIds: string[]): FamilyAnalysisJob {
  const now = Date.now();
  const job: FamilyAnalysisJob = {
    familyId,
    status: 'processing',
    startedAt: now,
    updatedAt: now,
    photos: photoIds.map((photoId) => ({ photoId, status: 'pending', updatedAt: now })),
  };
  legacyJobs.set(familyId, job);
  return job;
}

/** @deprecated DB job 由 worker 更新 progress */
export function updatePhotoTask(
  familyId: string,
  photoId: string,
  patch: Partial<Pick<PhotoTaskState, 'status' | 'error'>>
): void {
  const job = legacyJobs.get(familyId);
  if (!job) return;
  const task = job.photos.find((p) => p.photoId === photoId);
  if (!task) return;
  Object.assign(task, patch, { updatedAt: Date.now() });
  job.updatedAt = Date.now();
}

/** @deprecated */
export function finalizeAnalysisJob(familyId: string, status: 'done' | 'error'): void {
  const job = legacyJobs.get(familyId);
  if (!job) return;
  job.status = status;
  job.updatedAt = Date.now();
}

export function clearAnalysisJob(familyId: string): void {
  legacyJobs.delete(familyId);
}

export function summarizeJob(job: FamilyAnalysisJob) {
  const tasks: PhotoTaskProgress[] = job.photos.map((p) => ({
    photoId: p.photoId,
    status: p.status,
    error: p.error,
  }));
  return summarizePhotoTasks(tasks);
}
