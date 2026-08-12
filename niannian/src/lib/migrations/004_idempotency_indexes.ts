import type { Migration } from '@/lib/migrations/types';

/** 幂等与并发治理：活跃渲染任务唯一、照片内容哈希唯一（可选列） */
export const migration004IdempotencyIndexes: Migration = {
  version: 4,
  name: 'idempotency_indexes',
  up(db) {
    const photosExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='photos'")
      .get();
    if (photosExists) {
      const photoCols = db.prepare('PRAGMA table_info(photos)').all() as Array<{ name: string }>;
      const photoColNames = new Set(photoCols.map((c) => c.name));
      if (!photoColNames.has('content_hash')) {
        db.exec(`ALTER TABLE photos ADD COLUMN content_hash TEXT`);
      }

      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_family_content_hash
          ON photos(family_id, content_hash)
          WHERE content_hash IS NOT NULL AND content_hash != ''
      `);
    }

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_jobs_active_resource
        ON jobs(resource_id, type, status)
        WHERE status IN ('queued', 'running')
    `);
  },
};
