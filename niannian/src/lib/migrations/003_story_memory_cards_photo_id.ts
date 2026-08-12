import type { Migration } from '@/lib/migrations/types';

/**
 * 修正 story_memory_cards：新增 canonical photo_id 列。
 * memory_card_id 历史字段仍保留（值为 photo_id），新代码优先读 photo_id。
 */
export const migration003StoryMemoryCardsPhotoId: Migration = {
  version: 3,
  name: 'story_memory_cards_photo_id',
  up(db) {
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='story_memory_cards'")
      .get();
    if (!tableExists) return;

    const cols = db.prepare('PRAGMA table_info(story_memory_cards)').all() as Array<{ name: string }>;
    const colNames = new Set(cols.map((c) => c.name));

    if (!colNames.has('photo_id')) {
      db.exec(`ALTER TABLE story_memory_cards ADD COLUMN photo_id TEXT`);
    }

    db.exec(`
      UPDATE story_memory_cards
      SET photo_id = memory_card_id
      WHERE photo_id IS NULL OR photo_id = ''
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_story_memory_cards_photo
        ON story_memory_cards(photo_id)
    `);
  },
};
