import type { Migration } from '@/lib/migrations/types';

/** 持久化任务队列、事件流与媒体资产元数据 */
export const migration002JobsAndEvents: Migration = {
  version: 2,
  name: 'jobs_and_events',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        family_id TEXT,
        resource_id TEXT,
        user_id TEXT,
        payload TEXT NOT NULL DEFAULT '{}',
        progress TEXT NOT NULL DEFAULT '{}',
        result TEXT,
        error_code TEXT,
        error_message TEXT,
        idempotency_key TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        heartbeat_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        started_at TEXT,
        completed_at TEXT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_idempotency
        ON jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_jobs_status_type ON jobs(status, type);
      CREATE INDEX IF NOT EXISTS idx_jobs_family ON jobs(family_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_resource ON jobs(resource_id);

      CREATE TABLE IF NOT EXISTS job_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        message TEXT,
        payload TEXT DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_job_events_job ON job_events(job_id, created_at);

      CREATE TABLE IF NOT EXISTS media_assets (
        id TEXT PRIMARY KEY,
        family_id TEXT,
        asset_type TEXT NOT NULL,
        storage_key TEXT NOT NULL,
        mime_type TEXT DEFAULT '',
        byte_size INTEGER,
        checksum TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_media_assets_storage ON media_assets(storage_key);
      CREATE INDEX IF NOT EXISTS idx_media_assets_family ON media_assets(family_id, asset_type);
    `);
  },
};
