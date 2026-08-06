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
  return rows.map((row) => ({
    ...row,
    photos: JSON.parse(row.photos || '[]'),
    timeline: JSON.parse(row.timeline || '[]'),
  }));
}

export function getLatestStoryByFamily(familyId: string) {
  const database = getDb();
  const row = database
    .prepare('SELECT * FROM stories WHERE family_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(familyId) as any;
  if (!row) return null;
  return {
    ...row,
    photos: JSON.parse(row.photos || '[]'),
    timeline: JSON.parse(row.timeline || '[]'),
  };
}

export function getStory(id: string) {
  const database = getDb();
  const row = database.prepare('SELECT * FROM stories WHERE id = ?').get(id) as any;
  if (!row) return null;
  return {
    ...row,
    photos: JSON.parse(row.photos || '[]'),
    timeline: JSON.parse(row.timeline || '[]'),
  };
}

// --- Share 操作 ---

export function createShare(storyId: string): string {
  const id = generateId();
  const shareCode = generateShortCode();
  const database = getDb();
  database.prepare(
    'INSERT INTO shares (id, story_id, share_code) VALUES (?, ?, ?)'
  ).run(id, storyId, shareCode);
  return shareCode;
}

export function getShareByCode(shareCode: string) {
  const database = getDb();
  const row = database
    .prepare(
      `SELECT s.*, st.title as story_title, st.description as story_description,
              st.photos as story_photos, st.connection_action, st.timeline as story_timeline,
              st.family_id, f.name as family_name
       FROM shares s
       JOIN stories st ON s.story_id = st.id
       JOIN families f ON st.family_id = f.id
       WHERE s.share_code = ?`
    )
    .get(shareCode) as any;
  if (!row) return null;
  return {
    ...row,
    story_photos: JSON.parse(row.story_photos || '[]'),
    story_timeline: JSON.parse(row.story_timeline || '[]'),
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
  user_notes?: string;
  voice_transcript?: string;
  analysis_status?: string;
}

export interface TagData {
  photo_id: string;
  layer: number;
  key: string;
  value: string;
  source?: string;
}

function parseMemoryCardRow(row: any) {
  return {
    ...row,
    people: JSON.parse(row.people || '[]'),
    emotions: JSON.parse(row.emotions || '[]'),
    changes: JSON.parse(row.changes || '[]'),
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
        user_notes = COALESCE(?, user_notes),
        voice_transcript = COALESCE(?, voice_transcript),
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
      data.user_notes ?? null,
      data.voice_transcript ?? null,
      data.analysis_status || 'analyzed',
      data.photo_id
    );
    return existing.id;
  }

  const id = generateId();
  database.prepare(`
    INSERT INTO memory_cards
      (id, photo_id, family_id, taken_at, location, people, action,
       emotions, changes, significance, user_notes, voice_transcript, analysis_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    data.user_notes || '',
    data.voice_transcript || '',
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

export function getMemoryCardWithPhoto(photoId: string) {
  const photo = getPhoto(photoId);
  if (!photo) return null;
  const card = getMemoryCardByPhoto(photoId);
  const tags = getTagsByPhoto(photoId);
  return { photo, memoryCard: card, tags };
}

// --- 标签操作 ---

export function saveTagsForPhoto(photoId: string, tags: TagData[]): void {
  const database = getDb();
  database.prepare('DELETE FROM tags WHERE photo_id = ? AND source = ?').run(photoId, 'ai');
  const insert = database.prepare(
    'INSERT INTO tags (id, photo_id, layer, key, value, source) VALUES (?, ?, ?, ?, ?, ?)'
  );
  for (const tag of tags) {
    insert.run(generateId(), photoId, tag.layer, tag.key, tag.value, tag.source || 'ai');
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
