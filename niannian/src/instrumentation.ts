/**
 * Next.js 服务端启动钩子 — 轻量 Job Worker（单实例 PM2 足够）。
 * 多 Web 副本时建议独立 PM2 worker 进程消费同一 SQLite/PostgreSQL 队列。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NIANNIAN_DISABLE_JOB_WORKER === '1') return;

  const { recoverStaleJobs, runJobProcessorLoop } = await import('@/lib/jobs/job-processor');

  const tick = () => {
    try {
      recoverStaleJobs(30);
      void runJobProcessorLoop({ maxJobs: 5, idleMs: 0 });
    } catch (err) {
      console.error('[instrumentation] job worker tick failed', err);
    }
  };

  setInterval(tick, 3000);
  setTimeout(tick, 1500);
  console.log('[instrumentation] job worker scheduled (3s interval)');
}
