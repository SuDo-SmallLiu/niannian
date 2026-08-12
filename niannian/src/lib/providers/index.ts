/**
 * Provider 注册表 — 默认绑定现有 lib 实现，后续可替换为独立 Worker / 云服务。
 */
import { createJob } from '@/lib/jobs/job-repository';
import type { JobQueue, ObjectStorage } from '@/lib/providers/types';
import fs from 'fs';
import path from 'path';

export * from '@/lib/providers/types';

export const defaultObjectStorage: ObjectStorage = {
  async put({ key, data }) {
    const fullPath = path.join(process.cwd(), 'public', key.replace(/^\//, ''));
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, data);
    return key;
  },
  getPublicUrl(key: string) {
    return key.startsWith('/') ? key : `/${key}`;
  },
  async delete(key: string) {
    const fullPath = path.join(process.cwd(), 'public', key.replace(/^\//, ''));
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  },
};

export const defaultJobQueue: JobQueue = {
  async enqueue(input) {
    const job = createJob({
      type: input.type as Parameters<typeof createJob>[0]['type'],
      payload: input.payload,
      idempotencyKey: input.idempotencyKey,
      familyId: input.familyId,
      resourceId: input.resourceId,
    });
    return { jobId: job.id };
  },
};

/** 运行时 Provider 集合 — AI/TTS/FFmpeg 仍由 lib/ 模块承载，接口见 providers/types.ts */
export const providers = {
  storage: defaultObjectStorage,
  queue: defaultJobQueue,
};
