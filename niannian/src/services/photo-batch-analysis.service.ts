import pLimit from 'p-limit';
import { analyzeAndSavePhoto } from '@/lib/analyze-photo';
import { getMemoryCardWithPhoto, getPhoto, upsertMemoryCard } from '@/lib/db';
import { regenerateMemoryCardQuestions } from '@/lib/memory-card-questions';
import {
  completeJob,
  failJob,
  updateJobProgress,
} from '@/lib/jobs/job-repository';
import type { JobRecord } from '@/lib/jobs/types';
import {
  initPhotoTaskProgress,
  summarizePhotoTasks,
  type PhotoTaskProgress,
} from '@/lib/jobs/photo-analysis-jobs';
import { runManualStoryCompose } from '@/lib/story-engine';

const CONCURRENCY = 4;
const limit = pLimit(CONCURRENCY);

function getTasksFromJob(job: JobRecord): PhotoTaskProgress[] {
  const raw = job.progress.tasks;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw as PhotoTaskProgress[];
  }
  const photoIds = job.payload.photoIds as string[] | undefined;
  return photoIds ? initPhotoTaskProgress(photoIds) : [];
}

function syncProgress(jobId: string, tasks: PhotoTaskProgress[], message?: string): void {
  const summary = summarizePhotoTasks(tasks);
  updateJobProgress(jobId, {
    message: message ?? `解析中 ${summary.completed + summary.failed}/${summary.total}`,
    tasks,
    ...summary,
  });
}

export async function executePhotoAnalysisJob(job: JobRecord): Promise<void> {
  const familyId = job.familyId;
  const photoIds = (job.payload.photoIds as string[] | undefined) ?? [];
  if (!familyId || photoIds.length === 0) throw new Error('缺少 familyId 或 photoIds');

  let tasks = getTasksFromJob(job);

  for (const photoId of photoIds) {
    if (!tasks.find((t) => t.photoId === photoId)) {
      tasks.push({ photoId, status: 'pending' });
    }
    const photo = getPhoto(photoId);
    if (!photo) continue;
    upsertMemoryCard({
      photo_id: photoId,
      family_id: familyId,
      analysis_status: 'pending',
    });
  }

  syncProgress(job.id, tasks, '开始解析照片…');

  const enableOcr = !!job.payload.enableOcr;

  await Promise.all(
    photoIds.map((photoId) =>
      limit(async () => {
        tasks = tasks.map((t) =>
          t.photoId === photoId ? { ...t, status: 'active', error: undefined } : t
        );
        syncProgress(job.id, tasks);

        try {
          await analyzeAndSavePhoto(photoId, { skipQuestions: true, enableOcr });
          tasks = tasks.map((t) =>
            t.photoId === photoId ? { ...t, status: 'completed', error: undefined } : t
          );
          void regenerateMemoryCardQuestions(photoId).catch((err) => {
            console.warn(`照片 ${photoId} 追问生成失败:`, err);
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : '解析失败';
          tasks = tasks.map((t) =>
            t.photoId === photoId ? { ...t, status: 'failed', error: message } : t
          );
          upsertMemoryCard({
            photo_id: photoId,
            family_id: familyId,
            analysis_status: 'failed',
          });
        }

        syncProgress(job.id, tasks);
      })
    )
  );

  const summary = summarizePhotoTasks(tasks);
  if (summary.completed > 0) {
    completeJob(job.id, { ...summary, redirectTo: `/family/${familyId}/photos` });
  } else {
    failJob(job.id, '所有照片解析失败', 'PHOTO_ANALYSIS_FAILED');
  }
}

export async function executePhotoAnalyzeSingleJob(job: JobRecord): Promise<void> {
  const photoId = job.resourceId || (job.payload.photoId as string | undefined);
  const familyId = job.familyId;
  if (!photoId || !familyId) throw new Error('缺少 photoId 或 familyId');

  const withSupplement = !!job.payload.withSupplement;
  const enableOcr = !!job.payload.enableOcr;
  updateJobProgress(job.id, { message: enableOcr ? '正在识别场景与文字…' : '正在解析照片…' });

  upsertMemoryCard({
    photo_id: photoId,
    family_id: familyId,
    analysis_status: 'pending',
  });

  await analyzeAndSavePhoto(photoId, { withSupplement, enableOcr });
  const data = getMemoryCardWithPhoto(photoId);
  if (!data) throw new Error('照片不存在');

  completeJob(job.id, { photoId, ...data });
}

export async function executeStoryComposeJob(job: JobRecord): Promise<void> {
  const familyId = job.familyId;
  const photoIds = job.payload.photoIds as string[] | undefined;
  if (!familyId || !photoIds?.length) throw new Error('缺少 familyId 或 photoIds');

  updateJobProgress(job.id, { message: '正在组合照片撰写故事…' });
  const { storyId } = await runManualStoryCompose(familyId, photoIds);
  completeJob(job.id, { storyId });
}

export { CONCURRENCY as PHOTO_ANALYSIS_CONCURRENCY };
