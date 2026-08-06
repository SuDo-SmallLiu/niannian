import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'niannian.db');

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeDatabase();
  }
  return db;
}

function initializeDatabase() {
  const database = db;

  database.exec(`
    CREATE TABLE IF NOT EXISTS families (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      members TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      url TEXT NOT NULL,
      original_name TEXT NOT NULL,
      people TEXT DEFAULT '[]',
      location TEXT DEFAULT '',
      event TEXT DEFAULT '',
      ai_tags TEXT DEFAULT '[]',
      taken_at TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (family_id) REFERENCES families(id)
    );

    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      photos TEXT NOT NULL DEFAULT '[]',
      connection_action TEXT NOT NULL DEFAULT '',
      timeline TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (family_id) REFERENCES families(id)
    );

    CREATE TABLE IF NOT EXISTS shares (
      id TEXT PRIMARY KEY,
      story_id TEXT NOT NULL,
      share_code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (story_id) REFERENCES stories(id)
    );

    -- 用户系统
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      avatar TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS verify_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS family_users (
      family_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (family_id, user_id),
      FOREIGN KEY (family_id) REFERENCES families(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT,
      used_by TEXT,
      used_at TEXT,
      FOREIGN KEY (family_id) REFERENCES families(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_photos_family ON photos(family_id);
    CREATE INDEX IF NOT EXISTS idx_stories_family ON stories(family_id);
    CREATE INDEX IF NOT EXISTS idx_shares_code ON shares(share_code);
    CREATE INDEX IF NOT EXISTS idx_family_users_user ON family_users(user_id);
    CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(code);
    CREATE INDEX IF NOT EXISTS idx_verify_codes_phone ON verify_codes(phone);

    -- Memory Card（记忆卡）
    CREATE TABLE IF NOT EXISTS memory_cards (
      id TEXT PRIMARY KEY,
      photo_id TEXT NOT NULL UNIQUE,
      family_id TEXT NOT NULL,
      taken_at TEXT DEFAULT '',
      location TEXT DEFAULT '',
      people TEXT DEFAULT '[]',
      action TEXT DEFAULT '',
      emotions TEXT DEFAULT '[]',
      changes TEXT DEFAULT '[]',
      significance TEXT DEFAULT '',
      user_notes TEXT DEFAULT '',
      voice_transcript TEXT DEFAULT '',
      analysis_status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (photo_id) REFERENCES photos(id),
      FOREIGN KEY (family_id) REFERENCES families(id)
    );

    -- 标签系统 V2（四层）
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      photo_id TEXT NOT NULL,
      layer INTEGER NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      source TEXT DEFAULT 'ai',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (photo_id) REFERENCES photos(id)
    );

    CREATE INDEX IF NOT EXISTS idx_memory_cards_family ON memory_cards(family_id);
    CREATE INDEX IF NOT EXISTS idx_memory_cards_photo ON memory_cards(photo_id);
    CREATE INDEX IF NOT EXISTS idx_tags_photo ON tags(photo_id);
    CREATE INDEX IF NOT EXISTS idx_tags_layer ON tags(layer);
  `);

  migrateDatabase(database);
}

function migrateDatabase(database: Database.Database) {
  const cols = database.prepare('PRAGMA table_info(photos)').all() as Array<{ name: string }>;
  const colNames = new Set(cols.map((c) => c.name));
  if (!colNames.has('source_metadata')) {
    database.exec(`ALTER TABLE photos ADD COLUMN source_metadata TEXT DEFAULT '{}'`);
  }
  if (!colNames.has('source_type')) {
    database.exec(`ALTER TABLE photos ADD COLUMN source_type TEXT DEFAULT ''`);
  }

  const mcCols = database.prepare('PRAGMA table_info(memory_cards)').all() as Array<{ name: string }>;
  const mcColNames = new Set(mcCols.map((c) => c.name));
  if (!mcColNames.has('understanding')) {
    database.exec(`ALTER TABLE memory_cards ADD COLUMN understanding TEXT DEFAULT '{}'`);
  }
  if (!mcColNames.has('change_detail')) {
    database.exec(`ALTER TABLE memory_cards ADD COLUMN change_detail TEXT DEFAULT '{}'`);
  }
  if (!mcColNames.has('ai_questions')) {
    database.exec(`ALTER TABLE memory_cards ADD COLUMN ai_questions TEXT DEFAULT '[]'`);
  }
  if (!mcColNames.has('narrative_frame')) {
    database.exec(`ALTER TABLE memory_cards ADD COLUMN narrative_frame TEXT DEFAULT '{}'`);
  }
  if (!mcColNames.has('story_layer')) {
    database.exec(`ALTER TABLE memory_cards ADD COLUMN story_layer TEXT DEFAULT '{}'`);
  }

  const storyCols = database.prepare('PRAGMA table_info(stories)').all() as Array<{ name: string }>;
  const storyColNames = new Set(storyCols.map((c) => c.name));
  if (!storyColNames.has('summary')) {
    database.exec(`ALTER TABLE stories ADD COLUMN summary TEXT DEFAULT ''`);
  }
  if (!storyColNames.has('theme')) {
    database.exec(`ALTER TABLE stories ADD COLUMN theme TEXT DEFAULT ''`);
  }
  if (!storyColNames.has('cover_photo_id')) {
    database.exec(`ALTER TABLE stories ADD COLUMN cover_photo_id TEXT`);
  }
  if (!storyColNames.has('updated_at')) {
    database.exec(`ALTER TABLE stories ADD COLUMN updated_at TEXT`);
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS story_memory_cards (
      story_id TEXT NOT NULL,
      memory_card_id TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      scene_id TEXT,
      PRIMARY KEY (story_id, memory_card_id),
      FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_story_memory_cards_story ON story_memory_cards(story_id, order_index);

    CREATE TABLE IF NOT EXISTS story_versions (
      id TEXT PRIMARY KEY,
      story_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      theme TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '[]',
      regen_mode TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_story_versions_story ON story_versions(story_id, version DESC);

    CREATE TABLE IF NOT EXISTS photo_shares (
      id TEXT PRIMARY KEY,
      photo_id TEXT NOT NULL UNIQUE,
      share_code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (photo_id) REFERENCES photos(id)
    );
    CREATE INDEX IF NOT EXISTS idx_photo_shares_code ON photo_shares(share_code);

    CREATE TABLE IF NOT EXISTS movie_shares (
      id TEXT PRIMARY KEY,
      movie_id TEXT NOT NULL UNIQUE,
      share_code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (movie_id) REFERENCES life_movies(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_movie_shares_code ON movie_shares(share_code);

    CREATE TABLE IF NOT EXISTS life_movies (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT DEFAULT '',
      cover_story_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_life_movies_family ON life_movies(family_id);

    CREATE TABLE IF NOT EXISTS movie_chapters (
      id TEXT PRIMARY KEY,
      movie_id TEXT NOT NULL,
      story_id TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      title TEXT DEFAULT '',
      theme TEXT DEFAULT '',
      FOREIGN KEY (movie_id) REFERENCES life_movies(id) ON DELETE CASCADE,
      FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_movie_chapters_movie ON movie_chapters(movie_id, order_index);
  `);

  migrateStoriesV1ToV2(database);
  migrateStoryPhotosToMemoryCards(database);
}

function migrateStoriesV1ToV2(database: Database.Database) {
  database.exec(`
    UPDATE stories
    SET summary = description
    WHERE (summary IS NULL OR summary = '') AND description IS NOT NULL AND description != ''
  `);
  database.exec(`
    UPDATE stories
    SET updated_at = created_at
    WHERE updated_at IS NULL OR updated_at = ''
  `);
}

function migrateStoryPhotosToMemoryCards(database: Database.Database) {
  const stories = database
    .prepare('SELECT id, photos FROM stories WHERE photos IS NOT NULL AND photos != \'[]\'')
    .all() as Array<{ id: string; photos: string }>;

  const insert = database.prepare(`
    INSERT OR IGNORE INTO story_memory_cards (story_id, memory_card_id, order_index)
    VALUES (?, ?, ?)
  `);

  for (const story of stories) {
    let photoIds: string[] = [];
    try {
      photoIds = JSON.parse(story.photos || '[]');
    } catch {
      photoIds = [];
    }
    photoIds.forEach((photoId, index) => {
      insert.run(story.id, photoId, index);
    });
  }
}

// --- Family 操作 ---

export function createFamily(name: string, members: string[]): string {
  const id = generateId();
  const database = getDb();
  database.prepare(
    'INSERT INTO families (id, name, members) VALUES (?, ?, ?)'
  ).run(id, name, JSON.stringify(members));
  return id;
}

export function getFamily(id: string) {
  const database = getDb();
  const row = database.prepare('SELECT * FROM families WHERE id = ?').get(id) as any;
  if (!row) return null;
  return {
    ...row,
    members: JSON.parse(row.members),
  };
}

// --- Photo 操作 ---

export function addPhoto(
  familyId: string,
  url: string,
  originalName: string
): string {
  const id = generateId();
  const database = getDb();
  database.prepare(
    'INSERT INTO photos (id, family_id, url, original_name) VALUES (?, ?, ?, ?)'
  ).run(id, familyId, url, originalName);
  return id;
}

export function getPhotosByFamily(familyId: string) {
  const database = getDb();
  const rows = database
    .prepare('SELECT * FROM photos WHERE family_id = ? ORDER BY created_at DESC')
    .all(familyId) as any[];
  return rows.map(parsePhotoRow);
}

function parsePhotoRow(row: any) {
  let source_metadata = {};
  try {
    source_metadata = JSON.parse(row.source_metadata || '{}');
  } catch {
    source_metadata = {};
  }
  return {
    ...row,
    people: JSON.parse(row.people || '[]'),
    ai_tags: JSON.parse(row.ai_tags || '[]'),
    source_metadata,
  };
}

export function getPhoto(id: string) {
  const database = getDb();
  const row = database.prepare('SELECT * FROM photos WHERE id = ?').get(id) as any;
  if (!row) return null;
  return parsePhotoRow(row);
}

export function updatePhotoSourceMetadata(
  id: string,
  sourceType: string,
  sourceMetadata: Record<string, unknown>
) {
  const database = getDb();
  database.prepare(
    'UPDATE photos SET source_type = ?, source_metadata = ? WHERE id = ?'
  ).run(sourceType, JSON.stringify(sourceMetadata), id);
}

export function updatePhotoAnalysis(
  id: string,
  data: {
    people?: string[];
    location?: string;
    event?: string;
    ai_tags?: string[];
    taken_at?: string;
  }
) {
  const database = getDb();
  const current = getPhoto(id);
  if (!current) return;

  const people = data.people || current.people;
  const location = data.location || current.location;
  const event = data.event || current.event;
  const ai_tags = data.ai_tags || current.ai_tags;
  const taken_at = data.taken_at || current.taken_at;

  database.prepare(
    `UPDATE photos SET people = ?, location = ?, event = ?, ai_tags = ?, taken_at = ? WHERE id = ?`
  ).run(
    JSON.stringify(people),
    location,
    event,
    JSON.stringify(ai_tags),
    taken_at,
    id
  );
}

export function getPhotoCount(familyId: string): number {
  const database = getDb();
  const row = database
    .prepare('SELECT COUNT(*) as count FROM photos WHERE family_id = ?')
    .get(familyId) as any;
  return row.count;
}

// --- Story 操作 ---

function parseStoryRow(row: any) {
  return {
    ...row,
    photos: JSON.parse(row.photos || '[]'),
    timeline: JSON.parse(row.timeline || '[]'),
    summary: row.summary || row.description || '',
    theme: row.theme || '',
    cover_photo_id: row.cover_photo_id || null,
  };
}

export function createStory(
  familyId: string,
  title: string,
  description: string,
  photoIds: string[],
  connectionAction: string,
  timeline: Array<{ year: string; event: string }>
): string {
  const id = generateId();
  const database = getDb();
  database.prepare(
    `INSERT INTO stories (id, family_id, title, description, photos, connection_action, timeline)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    familyId,
    title,
    description,
    JSON.stringify(photoIds),
    connectionAction,
    JSON.stringify(timeline)
  );
  return id;
}

export function getStoriesByFamily(familyId: string) {
  const database = getDb();
  const rows = database
    .prepare('SELECT * FROM stories WHERE family_id = ? ORDER BY created_at DESC')
    .all(familyId) as any[];
  return rows.map(parseStoryRow);
}

export function getLatestStoryByFamily(familyId: string) {
  const database = getDb();
  const row = database
    .prepare('SELECT * FROM stories WHERE family_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(familyId) as any;
  if (!row) return null;
  return parseStoryRow(row);
}

export function getStory(id: string) {
  const database = getDb();
  const row = database.prepare('SELECT * FROM stories WHERE id = ?').get(id) as any;
  if (!row) return null;
  return parseStoryRow(row);
}

export interface CreateStoryV2Input {
  familyId: string;
  title: string;
  summary: string;
  theme: string;
  coverPhotoId?: string;
  photoIds: string[];
  connectionAction: string;
  timeline: Array<{ year: string; event: string }>;
}

export function createStoryV2(input: CreateStoryV2Input): string {
  const id = generateId();
  const database = getDb();
  database.prepare(
    `INSERT INTO stories
      (id, family_id, title, description, summary, theme, cover_photo_id, photos, connection_action, timeline, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(
    id,
    input.familyId,
    input.title,
    input.summary,
    input.summary,
    input.theme,
    input.coverPhotoId || null,
    JSON.stringify(input.photoIds),
    input.connectionAction,
    JSON.stringify(input.timeline)
  );
  return id;
}

export function deleteStoriesByFamily(familyId: string): number {
  const database = getDb();
  const stories = database
    .prepare('SELECT id FROM stories WHERE family_id = ?')
    .all(familyId) as Array<{ id: string }>;

  for (const story of stories) {
    database.prepare('DELETE FROM shares WHERE story_id = ?').run(story.id);
  }

  const result = database.prepare('DELETE FROM stories WHERE family_id = ?').run(familyId);
  return result.changes;
}

export function deleteStoryById(storyId: string): boolean {
  const database = getDb();
  const story = getStory(storyId);
  if (!story) return false;

  database.prepare('DELETE FROM shares WHERE story_id = ?').run(storyId);
  database.prepare('DELETE FROM movie_chapters WHERE story_id = ?').run(storyId);
  const result = database.prepare('DELETE FROM stories WHERE id = ?').run(storyId);
  return result.changes > 0;
}

export function deletePhotoById(photoId: string): boolean {
  const database = getDb();
  const photo = getPhoto(photoId);
  if (!photo) return false;

  database.prepare('DELETE FROM tags WHERE photo_id = ?').run(photoId);
  database.prepare('DELETE FROM memory_cards WHERE photo_id = ?').run(photoId);
  database.prepare('DELETE FROM story_memory_cards WHERE memory_card_id = ?').run(photoId);
  database.prepare('DELETE FROM photo_shares WHERE photo_id = ?').run(photoId);
  database.prepare('DELETE FROM photos WHERE id = ?').run(photoId);

  if (photo.url?.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), 'public', photo.url);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // 文件可能已不存在，忽略
    }
  }

  return true;
}

export function setStoryMemoryCards(
  storyId: string,
  items: Array<{ photoId: string; orderIndex: number; sceneId?: string }>
): void {
  const database = getDb();
  database.prepare('DELETE FROM story_memory_cards WHERE story_id = ?').run(storyId);
  const insert = database.prepare(`
    INSERT INTO story_memory_cards (story_id, memory_card_id, order_index, scene_id)
    VALUES (?, ?, ?, ?)
  `);
  for (const item of items) {
    insert.run(storyId, item.photoId, item.orderIndex, item.sceneId || null);
  }
}

export function getStoryMemoryCards(storyId: string) {
  const database = getDb();
  return database
    .prepare(
      'SELECT * FROM story_memory_cards WHERE story_id = ? ORDER BY order_index ASC'
    )
    .all(storyId) as Array<{
    story_id: string;
    memory_card_id: string;
    order_index: number;
    scene_id: string | null;
  }>;
}

export function createStoryVersion(data: {
  storyId: string;
  version: number;
  theme: string;
  title: string;
  summary: string;
  content: unknown;
  regenMode?: string;
}): string {
  const id = generateId();
  const database = getDb();
  database.prepare(
    `INSERT INTO story_versions
      (id, story_id, version, theme, title, summary, content, regen_mode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.storyId,
    data.version,
    data.theme,
    data.title,
    data.summary,
    JSON.stringify(data.content),
    data.regenMode || null
  );
  return id;
}

export function getLatestStoryVersion(storyId: string) {
  const database = getDb();
  const row = database
    .prepare(
      'SELECT * FROM story_versions WHERE story_id = ? ORDER BY version DESC LIMIT 1'
    )
    .get(storyId) as any;
  if (!row) return null;
  return {
    ...row,
    content: JSON.parse(row.content || '[]'),
  };
}

export function updateStory(
  storyId: string,
  data: {
    title: string;
    description: string;
    connectionAction: string;
    timeline: Array<{ year: string; event: string }>;
  }
): boolean {
  const database = getDb();
  const result = database
    .prepare(
      `UPDATE stories SET
        title = ?,
        description = ?,
        summary = ?,
        connection_action = ?,
        timeline = ?,
        updated_at = datetime('now')
      WHERE id = ?`
    )
    .run(
      data.title,
      data.description,
      data.description,
      data.connectionAction,
      JSON.stringify(data.timeline),
      storyId
    );
  return result.changes > 0;
}

// --- Share 操作 ---

export function getOrCreateStoryShare(storyId: string): string {
  const database = getDb();
  const existing = database
    .prepare('SELECT share_code FROM shares WHERE story_id = ?')
    .get(storyId) as { share_code: string } | undefined;
  if (existing) return existing.share_code;
  return createStoryShare(storyId);
}

export function createStoryShare(storyId: string): string {
  const id = generateId();
  const shareCode = generateShortCode();
  const database = getDb();
  database.prepare(
    'INSERT INTO shares (id, story_id, share_code) VALUES (?, ?, ?)'
  ).run(id, storyId, shareCode);
  return shareCode;
}

/** @deprecated use getOrCreateStoryShare */
export function createShare(storyId: string): string {
  return getOrCreateStoryShare(storyId);
}

export function getOrCreatePhotoShare(photoId: string): string {
  const database = getDb();
  const existing = database
    .prepare('SELECT share_code FROM photo_shares WHERE photo_id = ?')
    .get(photoId) as { share_code: string } | undefined;
  if (existing) return existing.share_code;

  const id = generateId();
  const shareCode = generateShortCode();
  database.prepare(
    'INSERT INTO photo_shares (id, photo_id, share_code) VALUES (?, ?, ?)'
  ).run(id, photoId, shareCode);
  return shareCode;
}

export function getOrCreateMovieShare(movieId: string): string {
  const database = getDb();
  const existing = database
    .prepare('SELECT share_code FROM movie_shares WHERE movie_id = ?')
    .get(movieId) as { share_code: string } | undefined;
  if (existing) return existing.share_code;

  const id = generateId();
  const shareCode = generateShortCode();
  database.prepare(
    'INSERT INTO movie_shares (id, movie_id, share_code) VALUES (?, ?, ?)'
  ).run(id, movieId, shareCode);
  return shareCode;
}

export function getShareByCode(shareCode: string) {
  const database = getDb();

  // 人生电影分享
  const movieShare = database
    .prepare('SELECT movie_id FROM movie_shares WHERE share_code = ?')
    .get(shareCode) as { movie_id: string } | undefined;

  if (movieShare) {
    const movieRow = database.prepare(`
      SELECT m.*, f.name as family_name
      FROM life_movies m
      JOIN families f ON m.family_id = f.id
      WHERE m.id = ?
    `).get(movieShare.movie_id) as any;
    if (!movieRow) return null;

    const chapterRows = getMovieChapters(movieShare.movie_id);
    const photo_urls: string[] = [];
    for (const ch of chapterRows.slice(0, 4)) {
      const story = getStory(ch.story_id);
      if (!story) continue;
      const photoIds = JSON.parse(story.photos || '[]') as string[];
      if (photoIds.length === 0) continue;
      const photo = database
        .prepare('SELECT url FROM photos WHERE id = ?')
        .get(photoIds[0]) as { url: string } | undefined;
      if (photo?.url) photo_urls.push(photo.url);
    }

    return {
      share_type: 'movie' as const,
      share_code: shareCode,
      movie_id: movieRow.id,
      movie_title: movieRow.title,
      movie_summary: movieRow.summary || '',
      family_name: movieRow.family_name,
      chapter_count: chapterRows.length,
      photo_urls,
    };
  }

  // 记忆卡分享
  const photoShare = database
    .prepare('SELECT photo_id FROM photo_shares WHERE share_code = ?')
    .get(shareCode) as { photo_id: string } | undefined;

  if (photoShare) {
    const photoRow = database.prepare(`
      SELECT p.*, f.name as family_name,
             mc.significance, mc.action as mc_action, mc.people as mc_people,
             mc.taken_at as mc_taken_at, mc.location as mc_location,
             mc.understanding
      FROM photos p
      JOIN families f ON p.family_id = f.id
      LEFT JOIN memory_cards mc ON mc.photo_id = p.id
      WHERE p.id = ?
    `).get(photoShare.photo_id) as any;
    if (!photoRow) return null;

    let understanding = null;
    try {
      understanding = JSON.parse(photoRow.understanding || '{}');
    } catch {
      understanding = null;
    }

    return {
      share_type: 'memory' as const,
      share_code: shareCode,
      family_name: photoRow.family_name,
      photo: {
        id: photoRow.id,
        url: photoRow.url,
        taken_at: photoRow.mc_taken_at || photoRow.taken_at,
        location: photoRow.mc_location || photoRow.location,
        people: JSON.parse(photoRow.mc_people || photoRow.people || '[]'),
        action: photoRow.mc_action || photoRow.event,
        significance: photoRow.significance || '',
        archetype: understanding?.archetype || '',
      },
    };
  }

  // 故事分享
  const storyRow = database
    .prepare(
      `SELECT s.*, st.title as story_title, st.description as story_description,
              st.summary as story_summary, st.photos as story_photos, st.connection_action, st.timeline as story_timeline,
              st.family_id, f.name as family_name
       FROM shares s
       JOIN stories st ON s.story_id = st.id
       JOIN families f ON st.family_id = f.id
       WHERE s.share_code = ?`
    )
    .get(shareCode) as any;
  if (!storyRow) return null;

  const photoIds = JSON.parse(storyRow.story_photos || '[]') as string[];
  let photo_urls: string[] = [];
  if (photoIds.length > 0) {
    const placeholders = photoIds.map(() => '?').join(',');
    const photoRows = database
      .prepare(`SELECT url FROM photos WHERE id IN (${placeholders})`)
      .all(...photoIds) as Array<{ url: string }>;
    photo_urls = photoRows.map((p) => p.url);
  }

  return {
    share_type: 'story' as const,
    ...storyRow,
    summary: storyRow.story_summary || storyRow.story_description || '',
    story_photos: photoIds,
    photo_urls,
    story_timeline: JSON.parse(storyRow.story_timeline || '[]'),
  };
}

// --- User 操作 ---

export function findUserByPhone(phone: string) {
  const database = getDb();
  const row = database.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as any;
  return row || null;
}

export function createUser(phone: string, name?: string): string {
  const id = generateId();
  const database = getDb();
  database.prepare(
    'INSERT INTO users (id, phone, name) VALUES (?, ?, ?)'
  ).run(id, phone, name || '');
  return id;
}

export function saveVerifyCode(phone: string, code: string): void {
  const database = getDb();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  database.prepare(
    'INSERT INTO verify_codes (phone, code, expires_at) VALUES (?, ?, ?)'
  ).run(phone, code, expiresAt);
}

export function verifyCode(phone: string, code: string): boolean {
  const database = getDb();
  const row = database.prepare(
    `SELECT * FROM verify_codes WHERE phone = ? AND code = ? AND used = 0
     AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1`
  ).get(phone, code) as any;
  if (!row) return false;

  database.prepare('UPDATE verify_codes SET used = 1 WHERE id = ?').run(row.id);
  return true;
}

// --- 家庭-用户关联 ---

export function addFamilyMember(familyId: string, userId: string, role: string = 'member'): void {
  const database = getDb();
  database.prepare(
    'INSERT OR IGNORE INTO family_users (family_id, user_id, role) VALUES (?, ?, ?)'
  ).run(familyId, userId, role);
}

export function getUserFamilies(userId: string) {
  const database = getDb();
  return database.prepare(
    `SELECT f.*, fu.role, 
     COUNT(DISTINCT p.id) as photo_count, 
     COUNT(DISTINCT s.id) as story_count
     FROM family_users fu
     JOIN families f ON fu.family_id = f.id
     LEFT JOIN photos p ON f.id = p.family_id
     LEFT JOIN stories s ON f.id = s.family_id
     WHERE fu.user_id = ?
     GROUP BY f.id
     ORDER BY f.created_at DESC`
  ).all(userId) as any[];
}

export function getFamilyMembers(familyId: string) {
  const database = getDb();
  return database.prepare(
    `SELECT u.id, u.phone, u.name, u.avatar, fu.role, fu.joined_at
     FROM family_users fu
     JOIN users u ON fu.user_id = u.id
     WHERE fu.family_id = ?
     ORDER BY fu.joined_at ASC`
  ).all(familyId) as any[];
}

export function isFamilyMember(familyId: string, userId: string): boolean {
  const database = getDb();
  const row = database.prepare(
    'SELECT 1 FROM family_users WHERE family_id = ? AND user_id = ?'
  ).get(familyId, userId);
  return !!row;
}

// --- 邀请码 ---

export function createInvitation(familyId: string, createdBy: string): { id: string; code: string } {
  const id = generateId();
  const code = generateShortCode().toUpperCase();
  const database = getDb();
  database.prepare(
    'INSERT INTO invitations (id, family_id, code, created_by, expires_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, familyId, code, createdBy, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
  return { id, code };
}

export function useInvitation(code: string, userId: string): { familyId: string; success: boolean } {
  const database = getDb();
  const inv = database.prepare(
    `SELECT * FROM invitations WHERE code = ? AND used_by IS NULL
     AND (expires_at IS NULL OR expires_at > datetime('now'))`
  ).get(code) as any;
  if (!inv) return { familyId: '', success: false };

  database.prepare(
    'UPDATE invitations SET used_by = ?, used_at = datetime(\'now\') WHERE id = ?'
  ).run(userId, inv.id);
  return { familyId: inv.family_id, success: true };
}

// --- Memory Card 操作 ---

import type { AffectUnderstanding, ChangeDetail } from '@/lib/affect-theory';
import type { NarrativeFrame } from '@/lib/narrative-frame';
import type { StoryLayer } from '@/lib/story-layer';

export interface AiQuestion {
  id: string;
  question: string;
  answer: string;
}

export interface MemoryCardData {
  photo_id: string;
  family_id: string;
  taken_at?: string;
  location?: string;
  people?: string[];
  action?: string;
  emotions?: string[];
  changes?: string[];
  significance?: string;
  understanding?: AffectUnderstanding;
  change_detail?: ChangeDetail;
  narrative_frame?: NarrativeFrame;
  story_layer?: StoryLayer;
  user_notes?: string;
  voice_transcript?: string;
  ai_questions?: AiQuestion[];
  analysis_status?: string;
}

export interface MemoryCardSupplement {
  user_notes?: string;
  voice_transcript?: string;
  ai_questions?: AiQuestion[];
}

export interface TagData {
  photo_id: string;
  layer: number;
  key: string;
  value: string;
  source?: string;
}

function parseMemoryCardRow(row: any) {
  const understanding = row.understanding
    ? JSON.parse(row.understanding)
    : null;
  const change_detail = row.change_detail
    ? JSON.parse(row.change_detail)
    : null;
  let narrative_frame = null;
  try {
    narrative_frame = JSON.parse(row.narrative_frame || '{}');
  } catch {
    narrative_frame = null;
  }
  let story_layer = null;
  try {
    story_layer = JSON.parse(row.story_layer || '{}');
  } catch {
    story_layer = null;
  }
  return {
    ...row,
    people: JSON.parse(row.people || '[]'),
    emotions: JSON.parse(row.emotions || '[]'),
    changes: JSON.parse(row.changes || '[]'),
    understanding,
    change_detail,
    narrative_frame,
    story_layer,
    ai_questions: JSON.parse(row.ai_questions || '[]'),
  };
}

export function upsertMemoryCard(data: MemoryCardData): string {
  const database = getDb();
  const existing = database
    .prepare('SELECT id FROM memory_cards WHERE photo_id = ?')
    .get(data.photo_id) as any;

  if (existing) {
    database.prepare(`
      UPDATE memory_cards SET
        taken_at = ?, location = ?, people = ?, action = ?,
        emotions = ?, changes = ?, significance = ?,
        understanding = ?, change_detail = ?,
        narrative_frame = ?,
        story_layer = ?,
        user_notes = COALESCE(?, user_notes),
        voice_transcript = COALESCE(?, voice_transcript),
        ai_questions = COALESCE(?, ai_questions),
        analysis_status = ?, updated_at = datetime('now')
      WHERE photo_id = ?
    `).run(
      data.taken_at || '',
      data.location || '',
      JSON.stringify(data.people || []),
      data.action || '',
      JSON.stringify(data.emotions || []),
      JSON.stringify(data.changes || []),
      data.significance || '',
      JSON.stringify(data.understanding || {}),
      JSON.stringify(data.change_detail || {}),
      JSON.stringify(data.narrative_frame || {}),
      JSON.stringify(data.story_layer || {}),
      data.user_notes ?? null,
      data.voice_transcript ?? null,
      data.ai_questions ? JSON.stringify(data.ai_questions) : null,
      data.analysis_status || 'analyzed',
      data.photo_id
    );
    return existing.id;
  }

  const id = generateId();
  database.prepare(`
    INSERT INTO memory_cards
      (id, photo_id, family_id, taken_at, location, people, action,
       emotions, changes, significance, understanding, change_detail,
       narrative_frame, story_layer, user_notes, voice_transcript, ai_questions, analysis_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.photo_id,
    data.family_id,
    data.taken_at || '',
    data.location || '',
    JSON.stringify(data.people || []),
    data.action || '',
    JSON.stringify(data.emotions || []),
    JSON.stringify(data.changes || []),
    data.significance || '',
    JSON.stringify(data.understanding || {}),
    JSON.stringify(data.change_detail || {}),
    JSON.stringify(data.narrative_frame || {}),
    JSON.stringify(data.story_layer || {}),
    data.user_notes || '',
    data.voice_transcript || '',
    JSON.stringify(data.ai_questions || []),
    data.analysis_status || 'analyzed'
  );
  return id;
}

export function getMemoryCardByPhoto(photoId: string) {
  const database = getDb();
  const row = database
    .prepare('SELECT * FROM memory_cards WHERE photo_id = ?')
    .get(photoId) as any;
  if (!row) return null;
  return parseMemoryCardRow(row);
}

export function getMemoryCardsByFamily(familyId: string) {
  const database = getDb();
  const rows = database
    .prepare('SELECT * FROM memory_cards WHERE family_id = ? ORDER BY created_at DESC')
    .all(familyId) as any[];
  return rows.map(parseMemoryCardRow);
}

export function getAnalyzedMemoryCardsForEngine(familyId: string) {
  const database = getDb();
  const rows = database.prepare(`
    SELECT mc.*, p.url as photo_url
    FROM memory_cards mc
    JOIN photos p ON mc.photo_id = p.id
    WHERE mc.family_id = ? AND mc.analysis_status = 'analyzed'
    ORDER BY mc.taken_at ASC, mc.created_at ASC
  `).all(familyId) as any[];
  return rows.map(parseMemoryCardRow);
}

export function getMemoryCardWithPhoto(photoId: string) {
  const photo = getPhoto(photoId);
  if (!photo) return null;
  const card = getMemoryCardByPhoto(photoId);
  const tags = getTagsByPhoto(photoId);
  const family = getFamily(photo.family_id);
  return {
    photo,
    memoryCard: card,
    tags,
    familyName: family?.name || '',
  };
}

export function updateMemoryCardSupplement(
  photoId: string,
  supplement: MemoryCardSupplement
): boolean {
  const database = getDb();
  const existing = getMemoryCardByPhoto(photoId);
  if (!existing) return false;

  database.prepare(`
    UPDATE memory_cards SET
      user_notes = ?,
      voice_transcript = ?,
      ai_questions = ?,
      updated_at = datetime('now')
    WHERE photo_id = ?
  `).run(
    supplement.user_notes ?? existing.user_notes ?? '',
    supplement.voice_transcript ?? existing.voice_transcript ?? '',
    JSON.stringify(supplement.ai_questions ?? existing.ai_questions ?? []),
    photoId
  );
  return true;
}

export function setMemoryCardQuestions(photoId: string, questions: AiQuestion[]): boolean {
  const database = getDb();
  const existing = getMemoryCardByPhoto(photoId);
  if (!existing) return false;

  database.prepare(`
    UPDATE memory_cards SET ai_questions = ?, updated_at = datetime('now')
    WHERE photo_id = ?
  `).run(JSON.stringify(questions), photoId);
  return true;
}

// --- 标签操作 ---

export function saveTagsForPhoto(photoId: string, tags: TagData[]): void {
  const database = getDb();
  database.prepare('DELETE FROM tags WHERE photo_id = ? AND source = ?').run(photoId, 'ai');
  const insert = database.prepare(
    'INSERT INTO tags (id, photo_id, layer, key, value, source) VALUES (?, ?, ?, ?, ?, ?)'
  );
  for (const tag of tags) {
    const key = tag.key?.trim() || '标签';
    const value = tag.value?.trim();
    if (!value) continue;
    insert.run(generateId(), photoId, tag.layer, key, value, tag.source || 'ai');
  }
}

export function getTagsByPhoto(photoId: string) {
  const database = getDb();
  return database
    .prepare('SELECT * FROM tags WHERE photo_id = ? ORDER BY layer, key')
    .all(photoId) as any[];
}

export function getTagsByFamily(familyId: string) {
  const database = getDb();
  return database.prepare(`
    SELECT t.* FROM tags t
    JOIN photos p ON t.photo_id = p.id
    WHERE p.family_id = ?
    ORDER BY t.layer, t.key
  `).all(familyId) as any[];
}

// --- Life Movie（Sprint 4）---

export interface LifeMovieRow {
  id: string;
  family_id: string;
  title: string;
  summary: string;
  cover_story_id: string | null;
  created_at: string;
  updated_at: string;
}

export function createLifeMovie(input: {
  familyId: string;
  title: string;
  summary: string;
  coverStoryId?: string;
}): string {
  const id = generateId();
  const database = getDb();
  database.prepare(
    `INSERT INTO life_movies (id, family_id, title, summary, cover_story_id)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, input.familyId, input.title, input.summary, input.coverStoryId || null);
  return id;
}

export function deleteLifeMoviesByFamily(familyId: string): void {
  const database = getDb();
  database.prepare('DELETE FROM life_movies WHERE family_id = ?').run(familyId);
}

export function getLifeMovie(id: string): LifeMovieRow | null {
  const database = getDb();
  return database.prepare('SELECT * FROM life_movies WHERE id = ?').get(id) as LifeMovieRow | null;
}

export function getLifeMoviesByFamily(familyId: string): LifeMovieRow[] {
  const database = getDb();
  return database
    .prepare('SELECT * FROM life_movies WHERE family_id = ? ORDER BY created_at DESC')
    .all(familyId) as LifeMovieRow[];
}

export function setMovieChapters(
  movieId: string,
  chapters: Array<{ storyId: string; orderIndex: number; title: string; theme: string }>
): void {
  const database = getDb();
  database.prepare('DELETE FROM movie_chapters WHERE movie_id = ?').run(movieId);
  const insert = database.prepare(`
    INSERT INTO movie_chapters (id, movie_id, story_id, order_index, title, theme)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const ch of chapters) {
    insert.run(generateId(), movieId, ch.storyId, ch.orderIndex, ch.title, ch.theme);
  }
}

export function getMovieChapters(movieId: string) {
  const database = getDb();
  return database
    .prepare('SELECT * FROM movie_chapters WHERE movie_id = ? ORDER BY order_index ASC')
    .all(movieId) as Array<{
    id: string;
    movie_id: string;
    story_id: string;
    order_index: number;
    title: string;
    theme: string;
  }>;
}

// --- 工具函数 ---

function generateId(): string {
  return `nn_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

function generateShortCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default getDb;
