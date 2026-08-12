import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations, getSchemaVersion } from '@/lib/migrations';

let testDb: Database.Database;

vi.mock('@/lib/db', () => ({
  getDb: () => testDb,
}));

import {
  createJob,
  getJobById,
  findActiveJobByIdempotencyKey,
  completeJob,
  hasRunningJobOfType,
} from '@/lib/jobs/job-repository';

describe('migrations', () => {
  beforeEach(() => {
    testDb = new Database(':memory:');
    testDb.pragma('foreign_keys = ON');
    testDb.exec(`
      CREATE TABLE families (id TEXT PRIMARY KEY, name TEXT NOT NULL, members TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE story_memory_cards (
        story_id TEXT NOT NULL,
        memory_card_id TEXT NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0,
        scene_id TEXT,
        PRIMARY KEY (story_id, memory_card_id)
      );
    `);
  });

  afterEach(() => {
    testDb.close();
  });

  it('applies jobs and photo_id migrations', () => {
    testDb.exec(
      `INSERT INTO story_memory_cards (story_id, memory_card_id, order_index) VALUES ('s1', 'p1', 0)`
    );
    runMigrations(testDb);
    const row = testDb
      .prepare('SELECT photo_id FROM story_memory_cards WHERE story_id = ?')
      .get('s1') as { photo_id: string };
    expect(row.photo_id).toBe('p1');
    expect(getSchemaVersion(testDb)).toBeGreaterThanOrEqual(4);

    const tables = testDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='jobs'")
      .get();
    expect(tables).toBeTruthy();
  });
});

describe('job repository', () => {
  beforeEach(() => {
    testDb = new Database(':memory:');
    testDb.pragma('foreign_keys = ON');
    testDb.exec(
      `CREATE TABLE families (id TEXT PRIMARY KEY, name TEXT NOT NULL, members TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT (datetime('now')));`
    );
    runMigrations(testDb);
  });

  afterEach(() => {
    testDb.close();
  });

  it('deduplicates active jobs by idempotency key', () => {
    const first = createJob({
      type: 'story_generate',
      familyId: 'f1',
      idempotencyKey: 'story_generate:f1',
    });
    const second = createJob({
      type: 'story_generate',
      familyId: 'f1',
      idempotencyKey: 'story_generate:f1',
    });
    expect(second.id).toBe(first.id);
    expect(findActiveJobByIdempotencyKey('story_generate:f1')?.id).toBe(first.id);
  });

  it('marks job done with result payload', () => {
    const job = createJob({ type: 'story_regenerate', resourceId: 's1', familyId: 'f1' });
    completeJob(job.id, { storyId: 's1' });
    const updated = getJobById(job.id);
    expect(updated?.status).toBe('done');
    expect(updated?.result?.storyId).toBe('s1');
  });

  it('tracks running movie_render for mutex', () => {
    createJob({ type: 'movie_render', resourceId: 'm1', familyId: 'f1' });
    const running = createJob({ type: 'movie_render', resourceId: 'm2', familyId: 'f1' });
    const db = testDb;
    db.prepare(`UPDATE jobs SET status = 'running' WHERE id = ?`).run(running.id);
    expect(hasRunningJobOfType('movie_render')).toBe(true);
  });
});
