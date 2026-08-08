import { getStoriesByFamily } from '@/lib/db';
import { runStoryEngine, type RunStoryEngineOptions } from '@/lib/story-engine';

export type StoryJobStatus = 'queued' | 'running' | 'done' | 'error';

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

const jobs = new Map<string, StoryJob>();
const TTL_MS = 60 * 60 * 1000;

function cleanupOldJobs() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.updatedAt > TTL_MS) jobs.delete(id);
  }
}

export function createStoryJob(familyId: string): string {
  cleanupOldJobs();
  const id = `story_job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  jobs.set(id, {
    id,
    familyId,
    status: 'queued',
    progress: '排队中…',
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export function getStoryJob(jobId: string): StoryJob | null {
  return jobs.get(jobId) || null;
}

export function startStoryJob(
  jobId: string,
  options: RunStoryEngineOptions = {}
): void {
  const job = jobs.get(jobId);
  if (!job || job.status !== 'queued') return;

  void (async () => {
    job.status = 'running';
    job.progress = '正在聚类记忆卡…';
    job.updatedAt = Date.now();

    try {
      const result = await runStoryEngine(job.familyId, {
        ...options,
        onProgress: (message) => {
          job.progress = message;
          job.updatedAt = Date.now();
        },
      });
      const stories = getStoriesByFamily(job.familyId);
      job.status = 'done';
      job.progress = '完成';
      job.storyCount = stories.length;
      job.sceneCount = result.scenes.length;
      job.updatedAt = Date.now();
    } catch (error) {
      job.status = 'error';
      job.error = error instanceof Error ? error.message : '生成失败';
      job.updatedAt = Date.now();
    }
  })();
}
