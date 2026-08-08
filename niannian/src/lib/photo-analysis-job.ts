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
}

const jobs = new Map<string, FamilyAnalysisJob>();

export function getAnalysisJob(familyId: string): FamilyAnalysisJob | undefined {
  return jobs.get(familyId);
}

export function createAnalysisJob(familyId: string, photoIds: string[]): FamilyAnalysisJob {
  const now = Date.now();
  const job: FamilyAnalysisJob = {
    familyId,
    status: 'processing',
    startedAt: now,
    updatedAt: now,
    photos: photoIds.map((photoId) => ({
      photoId,
      status: 'pending',
      updatedAt: now,
    })),
  };
  jobs.set(familyId, job);
  return job;
}

export function updatePhotoTask(
  familyId: string,
  photoId: string,
  patch: Partial<Pick<PhotoTaskState, 'status' | 'error'>>
): void {
  const job = jobs.get(familyId);
  if (!job) return;
  const task = job.photos.find((p) => p.photoId === photoId);
  if (!task) return;
  Object.assign(task, patch, { updatedAt: Date.now() });
  job.updatedAt = Date.now();
}

export function finalizeAnalysisJob(
  familyId: string,
  status: 'done' | 'error'
): void {
  const job = jobs.get(familyId);
  if (!job) return;
  job.status = status;
  job.updatedAt = Date.now();
}

export function clearAnalysisJob(familyId: string): void {
  jobs.delete(familyId);
}

export function summarizeJob(job: FamilyAnalysisJob) {
  const total = job.photos.length;
  const completed = job.photos.filter((p) => p.status === 'completed').length;
  const failed = job.photos.filter((p) => p.status === 'failed').length;
  const active = job.photos.filter((p) => p.status === 'active').length;
  const pending = job.photos.filter((p) => p.status === 'pending').length;
  const progress = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;

  return { total, completed, failed, active, pending, progress };
}
