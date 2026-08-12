import { getStoriesByFamily } from '@/lib/db';
import {
  claimNextQueuedJob,
  completeJob,
  failJob,
  hasRunningJobOfType,
  listStaleRunningJobs,
  requeueStaleJob,
  updateJobProgress,
} from '@/lib/jobs/job-repository';
import type { JobRecord, JobType } from '@/lib/jobs/types';
import {
  executeMovieAudioPlanJob,
  executeMovieRenderJob,
  executeSpeechSynthesizeJob,
} from '@/lib/jobs/media-jobs.service';
import { executeMovieGenerateJob } from '@/lib/jobs/movie-generate-jobs.service';
import { regenerateStoryById } from '@/lib/regenerate-story';
import { runStoryEngine, type RunStoryEngineOptions } from '@/lib/story-engine';
import type { RegenMode } from '@/lib/story-engine/types';
import {
  executePhotoAnalysisJob,
  executePhotoAnalyzeSingleJob,
  executeStoryComposeJob,
} from '@/services/photo-batch-analysis.service';

const WORKER_JOB_TYPES: JobType[] = [
  'story_generate',
  'story_regenerate',
  'story_compose',
  'photo_analysis',
  'photo_analyze_single',
  'movie_generate',
  'movie_audio_plan',
  'speech_synthesize',
  'movie_render',
];

let processorRunning = false;

async function handleStoryGenerate(job: JobRecord): Promise<void> {
  const familyId = job.familyId;
  if (!familyId) throw new Error('缺少 familyId');

  const replaceExisting = job.payload.replaceExisting !== false;
  const options: RunStoryEngineOptions = {
    replaceExisting,
    onProgress: (message) => {
      updateJobProgress(job.id, { message });
    },
  };

  const result = await runStoryEngine(familyId, options);
  const stories = getStoriesByFamily(familyId);
  completeJob(job.id, {
    storyCount: stories.length,
    sceneCount: result.scenes.length,
  });
}

async function handleStoryRegenerate(job: JobRecord): Promise<void> {
  const storyId = job.resourceId || (job.payload.storyId as string | undefined);
  const mode = (job.payload.mode as RegenMode | undefined) ?? 'full';
  if (!storyId) throw new Error('缺少 storyId');

  updateJobProgress(job.id, { message: '念念正在重新撰写故事…' });
  const story = await regenerateStoryById(storyId, mode);
  completeJob(job.id, { storyId: story?.id, mode });
}

async function dispatchJob(job: JobRecord): Promise<void> {
  switch (job.type) {
    case 'story_generate':
      await handleStoryGenerate(job);
      break;
    case 'story_regenerate':
      await handleStoryRegenerate(job);
      break;
    case 'story_compose':
      await executeStoryComposeJob(job);
      break;
    case 'photo_analysis':
      await executePhotoAnalysisJob(job);
      break;
    case 'photo_analyze_single':
      await executePhotoAnalyzeSingleJob(job);
      break;
    case 'movie_generate':
      await executeMovieGenerateJob(job);
      break;
    case 'movie_audio_plan':
      await executeMovieAudioPlanJob(job);
      break;
    case 'speech_synthesize':
      await executeSpeechSynthesizeJob(job);
      break;
    case 'movie_render':
      await executeMovieRenderJob(job);
      break;
    default:
      throw new Error(`Unsupported job type: ${job.type}`);
  }
}

export async function processNextJob(types: JobType[] = WORKER_JOB_TYPES): Promise<boolean> {
  const skipTypes = hasRunningJobOfType('movie_render') ? (['movie_render'] as JobType[]) : undefined;
  const job = claimNextQueuedJob(types, skipTypes);
  if (!job) return false;

  try {
    await dispatchJob(job);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : '任务执行失败';
    failJob(job.id, message);
    return true;
  }
}

export async function runJobProcessorLoop(options?: {
  types?: JobType[];
  idleMs?: number;
  maxJobs?: number;
}): Promise<number> {
  if (processorRunning) return 0;
  processorRunning = true;

  const types = options?.types ?? WORKER_JOB_TYPES;
  const idleMs = options?.idleMs ?? 500;
  const maxJobs = options?.maxJobs ?? 50;
  let processed = 0;

  try {
    for (let i = 0; i < maxJobs; i++) {
      const handled = await processNextJob(types);
      if (!handled) {
        if (idleMs > 0) await new Promise((r) => setTimeout(r, idleMs));
        break;
      }
      processed += 1;
    }
  } finally {
    processorRunning = false;
  }

  return processed;
}

export function recoverStaleJobs(staleMinutes = 30): number {
  const stale = listStaleRunningJobs(staleMinutes);
  for (const job of stale) {
    requeueStaleJob(job.id);
  }
  return stale.length;
}

export function scheduleInProcessJobDrain(): void {
  void runJobProcessorLoop({ maxJobs: 5, idleMs: 0 }).catch((err) => {
    console.error('[job-processor] drain failed', err);
  });
}
