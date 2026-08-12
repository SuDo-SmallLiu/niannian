export interface PollJobOptions {
  intervalMs?: number;
  timeoutMs?: number;
  onProgress?: (payload: { status: string; progress?: Record<string, unknown>; result?: Record<string, unknown> | null }) => void;
}

export interface JobView {
  status: string;
  progress?: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  error?: string;
  [key: string]: unknown;
}

/** SSE 订阅任务进度，失败时自动降级为轮询 */
export async function watchJobUntilDone(
  jobId: string,
  options: PollJobOptions = {}
): Promise<JobView> {
  const timeoutMs = options.timeoutMs ?? 10 * 60 * 1000;

  try {
    const result = await new Promise<JobView>((resolve, reject) => {
      const es = new EventSource(`/api/jobs/${encodeURIComponent(jobId)}/stream`);
      const timer = window.setTimeout(() => {
        es.close();
        reject(new Error('SSE_TIMEOUT'));
      }, timeoutMs);

      const finish = (view: JobView, isError: boolean) => {
        window.clearTimeout(timer);
        es.close();
        if (isError) {
          reject(new Error((view.error as string) || '任务失败'));
        } else {
          resolve(view);
        }
      };

      es.addEventListener('progress', (ev) => {
        try {
          const view = JSON.parse((ev as MessageEvent).data) as JobView;
          options.onProgress?.({
            status: view.status,
            progress: view.progress,
            result: view.result ?? undefined,
          });
        } catch {
          /* ignore malformed */
        }
      });

      es.addEventListener('done', (ev) => {
        try {
          finish(JSON.parse((ev as MessageEvent).data) as JobView, false);
        } catch {
          finish({ status: 'done' }, false);
        }
      });

      es.addEventListener('error', (ev) => {
        if ((ev as MessageEvent).data) {
          try {
            finish(JSON.parse((ev as MessageEvent).data) as JobView, true);
            return;
          } catch {
            /* fall through */
          }
        }
        es.close();
        window.clearTimeout(timer);
        reject(new Error('SSE_ERROR'));
      });

      es.onerror = () => {
        es.close();
        window.clearTimeout(timer);
        reject(new Error('SSE_ERROR'));
      };
    });
    return result;
  } catch {
    return pollJobUntilDone(jobId, options);
  }
}

export const waitForJobUntilDone = watchJobUntilDone;

export async function pollJobUntilDone(
  jobId: string,
  options: PollJobOptions = {}
): Promise<JobView> {
  const intervalMs = options.intervalMs ?? 1500;
  const timeoutMs = options.timeoutMs ?? 10 * 60 * 1000;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`);
    const data = (await res.json()) as JobView;
    if (!res.ok) {
      throw new Error((data.error as string) || '任务查询失败');
    }

    options.onProgress?.({
      status: data.status,
      progress: data.progress,
      result: data.result ?? undefined,
    });

    if (data.status === 'done') return data;
    if (data.status === 'error') {
      throw new Error((data.error as string) || '任务失败');
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('任务超时，请稍后在页面刷新查看结果');
}

/** 提交故事重新生成并等待完成 */
export async function regenerateStoryAsync(
  storyId: string,
  mode: string,
  options?: PollJobOptions
): Promise<JobView> {
  const res = await fetch('/api/story/regenerate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storyId, mode }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data.error as string) || '重新生成失败');
  }
  const jobId = data.jobId as string;
  if (!jobId) throw new Error('未返回 jobId');
  return watchJobUntilDone(jobId, options);
}

/** 人工组合故事：提交任务并等待完成 */
export async function composeStoryAsync(
  familyId: string,
  photoIds: string[],
  options?: PollJobOptions
): Promise<{ storyId: string }> {
  const res = await fetch('/api/story/compose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ familyId, photoIds }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data.error as string) || '生成失败');
  const jobId = data.jobId as string;
  if (!jobId) throw new Error('未返回 jobId');
  const result = await watchJobUntilDone(jobId, options);
  const storyId = (result.result as { storyId?: string } | undefined)?.storyId;
  if (!storyId) throw new Error('故事生成未完成');
  return { storyId };
}

/** 单张照片 AI 解析 */
export async function analyzePhotoAsync(
  photoId: string,
  withSupplement = false,
  options?: PollJobOptions
): Promise<{
  photo: unknown;
  memoryCard: unknown;
  tags: unknown;
  familyName?: string;
}> {
  const res = await fetch('/api/analyze/photo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoId, withSupplement }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data.error as string) || '解析失败');
  const jobId = data.jobId as string;
  if (!jobId) throw new Error('未返回 jobId');
  const result = await watchJobUntilDone(jobId, options);
  const payload = (result.result as Record<string, unknown> | undefined) ?? {};
  return payload as {
    photo: unknown;
    memoryCard: unknown;
    tags: unknown;
    familyName?: string;
  };
}

/** 重试单张照片解析 */
export async function retryPhotoAnalysisAsync(
  familyId: string,
  photoId: string,
  options?: PollJobOptions
): Promise<void> {
  const res = await fetch('/api/analyze/retry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ familyId, photoId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data.error as string) || '重试失败');
  const jobId = data.jobId as string;
  if (!jobId) throw new Error('未返回 jobId');
  await watchJobUntilDone(jobId, options);
}

/** 人生电影生成（异步 Job） */
export async function generateMovieAsync(
  familyId: string,
  options?: PollJobOptions & {
    replaceExisting?: boolean;
    prefetchAudio?: boolean;
    renderVideo?: boolean;
  }
): Promise<{ movieId: string; title?: string }> {
  const res = await fetch('/api/movie/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      familyId,
      replaceExisting: options?.replaceExisting !== false,
      prefetchAudio: options?.prefetchAudio ?? true,
      renderVideo: options?.renderVideo ?? true,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data.error as string) || '生成失败');
  const jobId = data.jobId as string;
  if (!jobId) throw new Error('未返回 jobId');

  const result = await watchJobUntilDone(jobId, options);
  const payload = (result.result as { movieId?: string; title?: string } | undefined) ?? {};
  if (!payload.movieId) throw new Error('电影生成未完成');
  return { movieId: payload.movieId, title: payload.title };
}

/** 旁白合成（缓存命中同步返回，否则走 Job） */
export async function synthesizeSpeechAsync(
  input: { text: string; movieId?: string; slideId?: string; force?: boolean },
  options?: PollJobOptions
): Promise<{ url: string; durationMs?: number; cached?: boolean; engine?: string }> {
  const res = await fetch('/api/speech/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data.error as string) || '旁白生成失败');

  if (res.status === 200 && data.url) {
    return {
      url: data.url as string,
      durationMs: data.durationMs as number | undefined,
      cached: data.cached as boolean | undefined,
      engine: data.engine as string | undefined,
    };
  }

  const jobId = data.jobId as string;
  if (!jobId) throw new Error('未返回 jobId');
  const result = await watchJobUntilDone(jobId, options);
  const payload = (result.result as Record<string, unknown> | undefined) ?? {};
  if (!payload.url) throw new Error('旁白生成未完成');
  return {
    url: payload.url as string,
    durationMs: payload.durationMs as number | undefined,
    cached: payload.cached as boolean | undefined,
    engine: payload.engine as string | undefined,
  };
}

export interface PhotoAnalysisProgressSnapshot {
  total: number;
  completed: number;
  failed: number;
  active: number;
  progress: number;
  message?: string;
}

export function snapshotPhotoAnalysisProgress(
  progress?: Record<string, unknown>
): PhotoAnalysisProgressSnapshot {
  return {
    total: typeof progress?.total === 'number' ? progress.total : 0,
    completed: typeof progress?.completed === 'number' ? progress.completed : 0,
    failed: typeof progress?.failed === 'number' ? progress.failed : 0,
    active: typeof progress?.active === 'number' ? progress.active : 0,
    progress: typeof progress?.progress === 'number' ? progress.progress : 0,
    message: typeof progress?.message === 'string' ? progress.message : undefined,
  };
}

/** 批量照片解析：SSE 订阅 Job，完成后返回 Job 视图 */
export async function watchPhotoAnalysisJob(
  jobId: string,
  options?: PollJobOptions & {
    onSnapshot?: (snapshot: PhotoAnalysisProgressSnapshot) => void;
  }
): Promise<JobView> {
  return watchJobUntilDone(jobId, {
    ...options,
    onProgress: ({ status, progress, result }) => {
      options?.onProgress?.({ status, progress, result });
      options?.onSnapshot?.(snapshotPhotoAnalysisProgress(progress));
    },
  });
}
