import type Database from 'better-sqlite3';
import { migration002JobsAndEvents } from '@/lib/migrations/002_jobs_and_events';
import { migration003StoryMemoryCardsPhotoId } from '@/lib/migrations/003_story_memory_cards_photo_id';
import { migration004IdempotencyIndexes } from '@/lib/migrations/004_idempotency_indexes';
import { migration005JobsIdempotencyActiveOnly } from '@/lib/migrations/005_jobs_idempotency_active_only';
import type { Migration } from '@/lib/migrations/types';

const MIGRATIONS: Migration[] = [
  migration002JobsAndEvents,
  migration003StoryMemoryCardsPhotoId,
  migration004IdempotencyIndexes,
  migration005JobsIdempotencyActiveOnly,
];

function ensureSchemaMigrationsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function getAppliedVersions(db: Database.Database): Set<number> {
  ensureSchemaMigrationsTable(db);
  const rows = db.prepare('SELECT version FROM schema_migrations').all() as Array<{ version: number }>;
  return new Set(rows.map((r) => r.version));
}

/** 运行未应用的版本化迁移（在 legacy migrateDatabase 之后调用） */
export function runMigrations(db: Database.Database): void {
  ensureSchemaMigrationsTable(db);
  const applied = getAppliedVersions(db);

  const insert = db.prepare(
    'INSERT INTO schema_migrations (version, name) VALUES (?, ?)'
  );

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;

    db.transaction(() => {
      migration.up(db);
      insert.run(migration.version, migration.name);
    })();

    console.log(`[migration] applied v${migration.version} ${migration.name}`);
  }
}

export function getSchemaVersion(db: Database.Database): number {
  ensureSchemaMigrationsTable(db);
  const row = db
    .prepare('SELECT MAX(version) AS version FROM schema_migrations')
    .get() as { version: number | null };
  return row.version ?? 0;
}
