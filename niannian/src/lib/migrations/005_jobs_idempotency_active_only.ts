import type { Migration } from '@/lib/migrations/types';

/** 幂等键仅约束 queued/running，允许同一家庭重复生成电影 */
export const migration005JobsIdempotencyActiveOnly: Migration = {
  version: 5,
  name: 'jobs_idempotency_active_only',
  up(db) {
    db.exec(`DROP INDEX IF EXISTS idx_jobs_idempotency`);
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_idempotency_active
        ON jobs(idempotency_key)
        WHERE idempotency_key IS NOT NULL
          AND status IN ('queued', 'running')
    `);
  },
};
