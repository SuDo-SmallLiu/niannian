import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'niannian.db');

// 确保 data 目录存在
import fs from 'fs';
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

    CREATE INDEX IF NOT EXISTS idx_photos_family ON photos(family_id);
    CREATE INDEX IF NOT EXISTS idx_stories_family ON stories(family_id);
    CREATE INDEX IF NOT EXISTS idx_shares_code ON shares(share_code);
  `);
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
  return rows.map((row) => ({
    ...row,
    people: JSON.parse(row.people || '[]'),
    ai_tags: JSON.parse(row.ai_tags || '[]'),
  }));
}

export function getPhoto(id: string) {
  const database = getDb();
  const row = database.prepare('SELECT * FROM photos WHERE id = ?').get(id) as any;
  if (!row) return null;
  return {
    ...row,
    people: JSON.parse(row.people || '[]'),
    ai_tags: JSON.parse(row.ai_tags || '[]'),
  };
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
