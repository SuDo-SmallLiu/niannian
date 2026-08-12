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
