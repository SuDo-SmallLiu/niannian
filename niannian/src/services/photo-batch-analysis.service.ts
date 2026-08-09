import pLimit from 'p-limit';
import { analyzeAndSavePhoto } from '@/lib/analyze-photo';
import { regenerateMemoryCardQuestions } from '@/lib/memory-card-questions';
import { getPhoto, upsertMemoryCard } from '@/lib/db';
import {
  createAnalysisJob,
  finalizeAnalysisJob,
  getAnalysisJob,
  summarizeJob,
  updatePhotoTask,
} from '@/lib/photo-analysis-job';

const CONCURRENCY = 4;
const limit = pLimit(CONCURRENCY);

export async function runFamilyPhotoAnalysis(familyId: string, photoIds: string[]): Promise<void> {
  if (getAnalysisJob(familyId)?.status === 'processing') {
    return;
  }

  createAnalysisJob(familyId, photoIds);

  for (const photoId of photoIds) {
    const photo = getPhoto(photoId);
    if (!photo) continue;
    upsertMemoryCard({
      photo_id: photoId,
      family_id: familyId,
      analysis_status: 'pending',
    });
  }

  const tasks = photoIds.map((photoId) =>
    limit(async () => {
      updatePhotoTask(familyId, photoId, { status: 'active' });
      try {
        await analyzeAndSavePhoto(photoId, { skipQuestions: true });
        updatePhotoTask(familyId, photoId, { status: 'completed' });
        void regenerateMemoryCardQuestions(photoId).catch((err) => {
          console.warn(`照片 ${photoId} 追问生成失败（不影响解析结果）:`, err);
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : '解析失败';
        updatePhotoTask(familyId, photoId, { status: 'failed', error: message });
        upsertMemoryCard({
          photo_id: photoId,
          family_id: familyId,
          analysis_status: 'failed',
        });
      }
    })
  );

  await Promise.all(tasks);

  const job = getAnalysisJob(familyId);
  if (!job) return;

  const { completed, failed } = summarizeJob(job);
  finalizeAnalysisJob(familyId, completed > 0 ? 'done' : 'error');
}

export async function retryPhotoAnalysis(familyId: string, photoId: string): Promise<void> {
  const job = getAnalysisJob(familyId);
  if (job) {
    updatePhotoTask(familyId, photoId, { status: 'active', error: undefined });
  }

  upsertMemoryCard({
    photo_id: photoId,
    family_id: familyId,
    analysis_status: 'pending',
  });

  try {
    await analyzeAndSavePhoto(photoId);
    if (job) updatePhotoTask(familyId, photoId, { status: 'completed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '解析失败';
    upsertMemoryCard({
      photo_id: photoId,
      family_id: familyId,
      analysis_status: 'failed',
    });
    if (job) updatePhotoTask(familyId, photoId, { status: 'failed', error: message });
    throw err;
  }
}

export { CONCURRENCY as PHOTO_ANALYSIS_CONCURRENCY };
