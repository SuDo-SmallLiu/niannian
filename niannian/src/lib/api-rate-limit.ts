/**
 * API 限流 — 进程内滑动窗口（单实例 PM2 足够；多实例需 Redis）。
 */

const WINDOW_MS = 60_000;

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

function prune(bucket: Bucket, now: number): number[] {
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < WINDOW_MS);
  return bucket.timestamps;
}

export interface RateLimitRule {
  key: string;
  max: number;
  windowMs?: number;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec?: number;
  remaining?: number;
}

export function checkRateLimit(rule: RateLimitRule): RateLimitResult {
  const now = Date.now();
  const windowMs = rule.windowMs ?? WINDOW_MS;
  let bucket = buckets.get(rule.key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(rule.key, bucket);
  }

  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  if (bucket.timestamps.length >= rule.max) {
    const oldest = bucket.timestamps[0]!;
    return {
      ok: false,
      retryAfterSec: Math.ceil((windowMs - (now - oldest)) / 1000),
      remaining: 0,
    };
  }

  bucket.timestamps.push(now);
  return {
    ok: true,
    remaining: rule.max - bucket.timestamps.length,
  };
}

/** 重任务接口默认限流：每用户 / 每 IP */
export function checkHeavyApiRateLimit(input: {
  userId?: string;
  ip: string;
  endpoint: string;
}): RateLimitResult {
  const userKey = input.userId ? `user:${input.userId}:${input.endpoint}` : null;
  const ipKey = `ip:${input.ip || 'unknown'}:${input.endpoint}`;

  const limits: RateLimitRule[] = [
    { key: ipKey, max: 30 },
  ];
  if (userKey) {
    limits.unshift({ key: userKey, max: 12 });
  }

  for (const rule of limits) {
    const result = checkRateLimit(rule);
    if (!result.ok) return result;
  }

  return { ok: true };
}

export function resetRateLimitsForTests(): void {
  buckets.clear();
}
