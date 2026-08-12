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

export function getAnalysisJob(familyId: string): FamilyAnalysisJob | undefined {
  const dbJob = findActivePhotoAnalysisJob(familyId);
  if (dbJob) {
    const mapped = dbJobToFamilyAnalysisJob(dbJob);
    return { ...mapped, jobId: dbJob.id };
  }

  const recentDone = getRecentPhotoAnalysisJob(familyId);
  if (recentDone) {
    return { ...recentDone, jobId: recentDone.jobId };
  }

  return undefined;
}

export function summarizeJob(job: FamilyAnalysisJob) {
  const tasks: PhotoTaskProgress[] = job.photos.map((p) => ({
    photoId: p.photoId,
    status: p.status,
    error: p.error,
  }));
  return summarizePhotoTasks(tasks);
}
