import { getDb } from '@/lib/db';
import { getJobById, findActiveJobByIdempotencyKey } from '@/lib/jobs/job-repository';
import type { JobRecord } from '@/lib/jobs/types';
import type {
  FamilyAnalysisJob,
  PhotoTaskState,
} from '@/lib/photo-analysis-job';

export type PhotoTaskProgress = {
  photoId: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  error?: string;
};

function parseTasks(job: JobRecord): PhotoTaskProgress[] {
  const raw = job.progress.tasks;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is PhotoTaskProgress =>
      !!item &&
      typeof item === 'object' &&
      typeof (item as PhotoTaskProgress).photoId === 'string'
  );
}

export function dbJobToFamilyAnalysisJob(job: JobRecord): FamilyAnalysisJob {
  const tasks = parseTasks(job);
  const now = Date.parse(job.updatedAt) || Date.now();
  let status: FamilyAnalysisJob['status'] = 'processing';
  if (job.status === 'done') status = 'done';
  else if (job.status === 'error') status = 'error';

  return {
    familyId: job.familyId || '',
    status,
    photos: tasks.map(
      (task): PhotoTaskState => ({
        photoId: task.photoId,
        status: task.status,
        error: task.error,
        updatedAt: now,
      })
    ),
    startedAt: Date.parse(job.startedAt || job.createdAt) || now,
    updatedAt: now,
  };
}

export function findActivePhotoAnalysisJob(familyId: string): JobRecord | null {
  const byKey = findActiveJobByIdempotencyKey(`photo_analysis:${familyId}`);
  if (byKey) return byKey;

  const db = getDb();
  const row = db
    .prepare(
      `SELECT id FROM jobs
       WHERE family_id = ? AND type = 'photo_analysis'
         AND status IN ('queued', 'running')
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(familyId) as { id: string } | undefined;

  return row ? getJobById(row.id) : null;
}

export function summarizePhotoTasks(tasks: PhotoTaskProgress[]) {
  const total = tasks.length;
  const completed = tasks.filter((p) => p.status === 'completed').length;
  const failed = tasks.filter((p) => p.status === 'failed').length;
  const active = tasks.filter((p) => p.status === 'active').length;
  const pending = tasks.filter((p) => p.status === 'pending').length;
  const progress = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;
  return { total, completed, failed, active, pending, progress };
}

export function initPhotoTaskProgress(photoIds: string[]): PhotoTaskProgress[] {
  return photoIds.map((photoId) => ({ photoId, status: 'pending' as const }));
}
