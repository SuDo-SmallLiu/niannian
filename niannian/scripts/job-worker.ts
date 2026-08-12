/**
 * 独立 Job Worker — 与 Next.js Web 进程分离消费 jobs 表。
 * 启动：npm run worker
 * Web 端需设置 NIANNIAN_DISABLE_JOB_WORKER=1 避免重复消费。
 */
import { recoverStaleJobs, runJobProcessorLoop } from '../src/lib/jobs/job-processor';

const INTERVAL_MS = Number(process.env.JOB_WORKER_INTERVAL_MS || 3000);
const BATCH = Number(process.env.JOB_WORKER_BATCH || 10);

let running = false;

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    recoverStaleJobs(30);
    await runJobProcessorLoop({ maxJobs: BATCH, idleMs: 0 });
  } catch (err) {
    console.error('[job-worker] tick failed', err);
  } finally {
    running = false;
  }
}

console.log(`[job-worker] started (interval=${INTERVAL_MS}ms, batch=${BATCH})`);
setInterval(() => void tick(), INTERVAL_MS);
setTimeout(() => void tick(), 500);

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
