export interface PollJobOptions {
  intervalMs?: number;
  timeoutMs?: number;
  onProgress?: (payload: { status: string; progress?: Record<string, unknown> }) => void;
}

export async function pollJobUntilDone(
  jobId: string,
  options: PollJobOptions = {}
): Promise<Record<string, unknown>> {
  const intervalMs = options.intervalMs ?? 1500;
  const timeoutMs = options.timeoutMs ?? 10 * 60 * 1000;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error((data.error as string) || '任务查询失败');
    }

    options.onProgress?.({
      status: data.status as string,
      progress: data.progress as Record<string, unknown> | undefined,
    });

    if (data.status === 'done') return data as Record<string, unknown>;
    if (data.status === 'error') {
      throw new Error((data.error as string) || '任务失败');
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('任务超时，请稍后在页面刷新查看结果');
}

/** 提交故事重新生成并轮询至完成 */
export async function regenerateStoryAsync(
  storyId: string,
  mode: string,
  options?: PollJobOptions
): Promise<Record<string, unknown>> {
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
  return pollJobUntilDone(jobId, options);
}

/** 人工组合故事：提交任务并轮询至完成 */
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
  const result = await pollJobUntilDone(jobId, options);
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
  const result = await pollJobUntilDone(jobId, options);
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
  await pollJobUntilDone(jobId, options);
}
