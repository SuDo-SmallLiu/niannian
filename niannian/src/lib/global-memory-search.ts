import { getDb } from '@/lib/db';

/** 统一检索层（Read Model）：加速跨家庭的时间/地点/人物检索，非业务真相源。 */
export interface GlobalMemorySearchRow {
  photo_id: string;
  memory_card_id: string | null;
  family_id: string;
  family_name: string;
  photo_url: string;
  taken_at: string;
  location: string;
  people: string[];
  people_text: string;
  tags: string[];
  tags_text: string;
  action: string;
  significance: string;
  analysis_status: string;
  story_ids: string[];
  synced_at: string;
}

export interface GlobalMemorySearchParams {
  /** 登录用户 ID，用于 family_users 权限过滤 */
  userId?: string;
  /** 限定家庭范围（会与 userId 权限取交集） */
  familyIds?: string[];
  /** 关键词（匹配人物/地点/标签/行为/意义） */
  q?: string;
  location?: string;
  people?: string;
  takenAfter?: string;
  takenBefore?: string;
  analysisStatus?: 'pending' | 'analyzed' | 'all';
  limit?: number;
  offset?: number;
}

export interface GlobalMemorySearchResult extends GlobalMemorySearchRow {}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
}

function toSearchText(values: string[]): string {
  return uniqueStrings(values).join(' ').toLowerCase();
}

function parseJsonArray(raw: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** 从业务表重建单条检索索引 */
export function syncGlobalMemorySearch(photoId: string): void {
  const database = getDb();

  const row = database.prepare(`
    SELECT
      p.id AS photo_id,
      p.family_id,
      p.url AS photo_url,
      p.people AS photo_people,
      p.location AS photo_location,
      p.taken_at AS photo_taken_at,
      p.event AS photo_event,
      mc.id AS memory_card_id,
      mc.taken_at AS mc_taken_at,
      mc.location AS mc_location,
      mc.people AS mc_people,
      mc.action,
      mc.significance,
      mc.analysis_status,
      f.name AS family_name
    FROM photos p
    JOIN families f ON f.id = p.family_id
    LEFT JOIN memory_cards mc ON mc.photo_id = p.id
    WHERE p.id = ?
  `).get(photoId) as Record<string, string | null> | undefined;

  if (!row) {
    removeGlobalMemorySearch(photoId);
    return;
  }

  const tagRows = database
    .prepare('SELECT value FROM tags WHERE photo_id = ? ORDER BY layer, key')
    .all(photoId) as Array<{ value: string }>;

  const storyRows = database
    .prepare('SELECT DISTINCT story_id FROM story_memory_cards WHERE memory_card_id = ?')
    .all(photoId) as Array<{ story_id: string }>;

  const photoPeople = parseJsonArray(row.photo_people);
  const mcPeople = parseJsonArray(row.mc_people);
  const people = uniqueStrings([...photoPeople, ...mcPeople]);
  const tags = uniqueStrings(tagRows.map((t) => t.value));
  const storyIds = uniqueStrings(storyRows.map((s) => s.story_id));

  const takenAt = (row.mc_taken_at || row.photo_taken_at || '').trim();
  const location = (row.mc_location || row.photo_location || '').trim();
  const action = (row.action || row.photo_event || '').trim();
  const significance = (row.significance || '').trim();
  const analysisStatus = (row.analysis_status || 'pending').trim();

  const searchBlob = toSearchText([
    ...people,
    location,
    ...tags,
    action,
    significance,
    takenAt,
  ]);

  database.prepare(`
    INSERT INTO global_memory_search (
      photo_id, memory_card_id, family_id, family_name, photo_url,
      taken_at, location, people, people_text, tags, tags_text,
      action, significance, analysis_status, story_ids, search_text, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(photo_id) DO UPDATE SET
      memory_card_id = excluded.memory_card_id,
      family_id = excluded.family_id,
      family_name = excluded.family_name,
      photo_url = excluded.photo_url,
      taken_at = excluded.taken_at,
      location = excluded.location,
      people = excluded.people,
      people_text = excluded.people_text,
      tags = excluded.tags,
      tags_text = excluded.tags_text,
      action = excluded.action,
      significance = excluded.significance,
      analysis_status = excluded.analysis_status,
      story_ids = excluded.story_ids,
      search_text = excluded.search_text,
      synced_at = datetime('now')
  `).run(
    photoId,
    row.memory_card_id,
    row.family_id,
    row.family_name || '',
    row.photo_url || '',
    takenAt,
    location,
    JSON.stringify(people),
    toSearchText(people),
    JSON.stringify(tags),
    toSearchText(tags),
    action,
    significance,
    analysisStatus,
    JSON.stringify(storyIds),
    searchBlob
  );
}

export function removeGlobalMemorySearch(photoId: string): void {
  getDb().prepare('DELETE FROM global_memory_search WHERE photo_id = ?').run(photoId);
}

/** 首次迁移或索引为空时，从业务表全量回填 */
export function backfillGlobalMemorySearch(): number {
  const database = getDb();
  const rows = database.prepare('SELECT id FROM photos ORDER BY created_at ASC').all() as Array<{ id: string }>;
  for (const row of rows) {
    syncGlobalMemorySearch(row.id);
  }
  return rows.length;
}

function resolveAccessibleFamilyIds(params: GlobalMemorySearchParams): string[] | null {
  const database = getDb();

  if (params.userId) {
    const userFamilies = database
      .prepare('SELECT family_id FROM family_users WHERE user_id = ?')
      .all(params.userId) as Array<{ family_id: string }>;
    let ids = userFamilies.map((r) => r.family_id);
    if (params.familyIds?.length) {
      const allowed = new Set(params.familyIds);
      ids = ids.filter((id) => allowed.has(id));
    }
    return ids;
  }

  if (params.familyIds?.length) {
    return uniqueStrings(params.familyIds);
  }

  return null;
}

/** 跨家庭统一检索：先查检索层，再按 family_users 权限过滤 */
export function searchGlobalMemory(params: GlobalMemorySearchParams = {}): GlobalMemorySearchResult[] {
  const database = getDb();
  const accessibleFamilyIds = resolveAccessibleFamilyIds(params);

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (accessibleFamilyIds !== null) {
    if (accessibleFamilyIds.length === 0) return [];
    const placeholders = accessibleFamilyIds.map(() => '?').join(',');
    conditions.push(`family_id IN (${placeholders})`);
    values.push(...accessibleFamilyIds);
  }

  if (params.analysisStatus && params.analysisStatus !== 'all') {
    conditions.push('analysis_status = ?');
    values.push(params.analysisStatus);
  }

  if (params.location?.trim()) {
    conditions.push('location LIKE ?');
    values.push(`%${params.location.trim()}%`);
  }

  if (params.people?.trim()) {
    conditions.push('people_text LIKE ?');
    values.push(`%${params.people.trim().toLowerCase()}%`);
  }

  if (params.takenAfter?.trim()) {
    conditions.push('taken_at >= ?');
    values.push(params.takenAfter.trim());
  }

  if (params.takenBefore?.trim()) {
    conditions.push('taken_at <= ?');
    values.push(params.takenBefore.trim());
  }

  if (params.q?.trim()) {
    conditions.push('search_text LIKE ?');
    values.push(`%${params.q.trim().toLowerCase()}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
  const offset = Math.max(params.offset ?? 0, 0);

  const rows = database.prepare(`
    SELECT * FROM global_memory_search
    ${where}
    ORDER BY
      CASE WHEN taken_at = '' THEN 1 ELSE 0 END,
      taken_at DESC,
      synced_at DESC
    LIMIT ? OFFSET ?
  `).all(...values, limit, offset) as Array<Record<string, string>>;

  return rows.map((row) => ({
    photo_id: row.photo_id,
    memory_card_id: row.memory_card_id || null,
    family_id: row.family_id,
    family_name: row.family_name,
    photo_url: row.photo_url,
    taken_at: row.taken_at,
    location: row.location,
    people: parseJsonArray(row.people),
    people_text: row.people_text,
    tags: parseJsonArray(row.tags),
    tags_text: row.tags_text,
    action: row.action,
    significance: row.significance,
    analysis_status: row.analysis_status,
    story_ids: parseJsonArray(row.story_ids),
    synced_at: row.synced_at,
  }));
}

export function countGlobalMemory(params: GlobalMemorySearchParams = {}): number {
  const database = getDb();
  const accessibleFamilyIds = resolveAccessibleFamilyIds(params);

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (accessibleFamilyIds !== null) {
    if (accessibleFamilyIds.length === 0) return 0;
    const placeholders = accessibleFamilyIds.map(() => '?').join(',');
    conditions.push(`family_id IN (${placeholders})`);
    values.push(...accessibleFamilyIds);
  }

  if (params.analysisStatus && params.analysisStatus !== 'all') {
    conditions.push('analysis_status = ?');
    values.push(params.analysisStatus);
  }

  if (params.location?.trim()) {
    conditions.push('location LIKE ?');
    values.push(`%${params.location.trim()}%`);
  }

  if (params.people?.trim()) {
    conditions.push('people_text LIKE ?');
    values.push(`%${params.people.trim().toLowerCase()}%`);
  }

  if (params.takenAfter?.trim()) {
    conditions.push('taken_at >= ?');
    values.push(params.takenAfter.trim());
  }

  if (params.takenBefore?.trim()) {
    conditions.push('taken_at <= ?');
    values.push(params.takenBefore.trim());
  }

  if (params.q?.trim()) {
    conditions.push('search_text LIKE ?');
    values.push(`%${params.q.trim().toLowerCase()}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const row = database.prepare(`SELECT COUNT(*) AS count FROM global_memory_search ${where}`).get(...values) as { count: number };
  return row.count;
}
