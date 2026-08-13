import { getDb } from '@/lib/db';
import type { CreateJobInput, JobProgressPatch, JobRecord, JobStatus, JobType } from '@/lib/jobs/types';

function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function rowToJob(row: Record<string, unknown>): JobRecord {
  return {
    id: String(row.id),
    type: row.type as JobType,
    status: row.status as JobStatus,
    familyId: (row.family_id as string) || null,
    resourceId: (row.resource_id as string) || null,
    userId: (row.user_id as string) || null,
    payload: parseJson(String(row.payload ?? '{}'), {}),
    progress: parseJson(String(row.progress ?? '{}'), {}),
    result: row.result ? parseJson(String(row.result), {}) : null,
    errorCode: (row.error_code as string) || null,
    errorMessage: (row.error_message as string) || null,
    idempotencyKey: (row.idempotency_key as string) || null,
    retryCount: Number(row.retry_count ?? 0),
    maxRetries: Number(row.max_retries ?? 3),
    heartbeatAt: (row.heartbeat_at as string) || null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    startedAt: (row.started_at as string) || null,
    completedAt: (row.completed_at as string) || null,
  };
}

export function appendJobEvent(
  jobId: string,
  eventType: string,
  message?: string,
  payload?: Record<string, unknown>
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO job_events (job_id, event_type, message, payload)
     VALUES (?, ?, ?, ?)`
  ).run(jobId, eventType, message ?? null, JSON.stringify(payload ?? {}));
}

export function findActiveJobByIdempotencyKey(idempotencyKey: string): JobRecord | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM jobs
       WHERE idempotency_key = ?
         AND status IN ('queued', 'running')
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(idempotencyKey) as Record<string, unknown> | undefined;
  return row ? rowToJob(row) : null;
}

export function createJob(input: CreateJobInput): JobRecord {
  const db = getDb();

  if (input.idempotencyKey) {
    const existing = findActiveJobByIdempotencyKey(input.idempotencyKey);
    if (existing) return existing;

    // 已完成/失败任务仍占用旧版全表唯一索引时，释放 key 以便重新提交
    db.prepare(
      `UPDATE jobs
       SET idempotency_key = NULL, updated_at = datetime('now')
       WHERE idempotency_key = ?
         AND status IN ('done', 'error')`
    ).run(input.idempotencyKey);
  }

  const id = generateJobId();
  db.prepare(
    `INSERT INTO jobs (
      id, type, status, family_id, resource_id, user_id,
      payload, progress, idempotency_key, max_retries
    ) VALUES (?, ?, 'queued', ?, ?, ?, ?, '{}', ?, ?)`
  ).run(
    id,
    input.type,
    input.familyId ?? null,
    input.resourceId ?? null,
    input.userId ?? null,
    JSON.stringify(input.payload ?? {}),
    input.idempotencyKey ?? null,
    input.maxRetries ?? 3
  );

  appendJobEvent(id, 'created', `Job ${input.type} queued`);
  return getJobById(id)!;
}

export function getJobById(jobId: string): JobRecord | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToJob(row) : null;
}

export function hasRunningJobOfType(type: JobType): boolean {
  const db = getDb();
  const row = db
    .prepare(`SELECT id FROM jobs WHERE type = ? AND status = 'running' LIMIT 1`)
    .get(type) as { id: string } | undefined;
  return !!row;
}

export function claimNextQueuedJob(
  types?: JobType[],
  skipTypes?: JobType[]
): JobRecord | null {
  const db = getDb();
  const typeFilter = types?.length
    ? `AND type IN (${types.map(() => '?').join(', ')})`
    : '';
  const skipFilter = skipTypes?.length
    ? `AND type NOT IN (${skipTypes.map(() => '?').join(', ')})`
    : '';
  const params = [...(types?.length ? types : []), ...(skipTypes?.length ? skipTypes : [])];

  const row = db
    .prepare(
      `SELECT * FROM jobs
       WHERE status = 'queued' ${typeFilter} ${skipFilter}
       ORDER BY created_at ASC
       LIMIT 1`
    )
    .get(...params) as Record<string, unknown> | undefined;

  if (!row) return null;

  const result = db
    .prepare(
      `UPDATE jobs
       SET status = 'running',
           started_at = datetime('now'),
           updated_at = datetime('now'),
           heartbeat_at = datetime('now')
       WHERE id = ? AND status = 'queued'`
    )
    .run(row.id);

  if (result.changes === 0) return null;

  appendJobEvent(String(row.id), 'started', 'Worker claimed job');
  return getJobById(String(row.id));
}

export function updateJobProgress(jobId: string, patch: JobProgressPatch): void {
  const db = getDb();
  const current = getJobById(jobId);
  if (!current) return;

  const progress = { ...current.progress, ...patch, updatedAt: new Date().toISOString() };
  db.prepare(
    `UPDATE jobs
     SET progress = ?, updated_at = datetime('now'), heartbeat_at = datetime('now')
     WHERE id = ?`
  ).run(JSON.stringify(progress), jobId);

  if (patch.message) {
    appendJobEvent(jobId, 'progress', String(patch.message), patch);
  }
}

export function completeJob(
  jobId: string,
  result: Record<string, unknown> = {}
): void {
  const db = getDb();
  db.prepare(
    `UPDATE jobs
     SET status = 'done',
         result = ?,
         updated_at = datetime('now'),
         completed_at = datetime('now'),
         heartbeat_at = datetime('now')
     WHERE id = ?`
  ).run(JSON.stringify(result), jobId);
  appendJobEvent(jobId, 'completed', 'Job finished');
}

export function failJob(
  jobId: string,
  errorMessage: string,
  errorCode = 'JOB_FAILED'
): void {
  const db = getDb();
  db.prepare(
    `UPDATE jobs
     SET status = 'error',
         error_code = ?,
         error_message = ?,
         updated_at = datetime('now'),
         completed_at = datetime('now')
     WHERE id = ?`
  ).run(errorCode, errorMessage, jobId);
  appendJobEvent(jobId, 'failed', errorMessage, { errorCode });
}

export function touchJobHeartbeat(jobId: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE jobs SET heartbeat_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
  ).run(jobId);
}

export function listStaleRunningJobs(staleMinutes = 30): JobRecord[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM jobs
       WHERE status = 'running'
         AND (
           heartbeat_at IS NULL
           OR heartbeat_at < datetime('now', ?)
         )`
    )
    .all(`-${staleMinutes} minutes`) as Array<Record<string, unknown>>;
  return rows.map(rowToJob);
}

export function requeueStaleJob(jobId: string): void {
  const db = getDb();
  const job = getJobById(jobId);
  if (!job) return;

  if (job.retryCount >= job.maxRetries) {
    failJob(jobId, '任务超时且已达最大重试次数', 'JOB_TIMEOUT');
    return;
  }

  db.prepare(
    `UPDATE jobs
     SET status = 'queued',
         retry_count = retry_count + 1,
         started_at = NULL,
         updated_at = datetime('now'),
         heartbeat_at = NULL
     WHERE id = ?`
  ).run(jobId);
  appendJobEvent(jobId, 'requeued', 'Stale running job requeued');
}

export function jobToPublicView(job: JobRecord) {
  return {
    jobId: job.id,
    type: job.type,
    status: job.status,
    familyId: job.familyId,
    resourceId: job.resourceId,
    progress: job.progress,
    result: job.result,
    error: job.errorMessage,
    errorCode: job.errorCode,
    retryCount: job.retryCount,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  };
}
