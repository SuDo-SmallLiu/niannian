/**
 * OTP 发送频率限制（进程内；单实例 PM2 足够）。
 * 测试可调用 resetOtpRateLimitsForTests()。
 */

const MIN_INTERVAL_MS = 60_000;
const WINDOW_MS = 15 * 60_000;
const MAX_PER_WINDOW = 5;

const lastSendByPhone = new Map<string, number>();
const sendTimestampsByPhone = new Map<string, number[]>();
const sendTimestampsByIp = new Map<string, number[]>();

function pruneTimestamps(key: string, store: Map<string, number[]>, now: number) {
  const list = store.get(key) || [];
  const pruned = list.filter((t) => now - t < WINDOW_MS);
  if (pruned.length === 0) store.delete(key);
  else store.set(key, pruned);
  return pruned;
}

export interface OtpRateLimitResult {
  ok: boolean;
  retryAfterSec?: number;
  reason?: 'phone_interval' | 'phone_window' | 'ip_window';
}

export function checkOtpSendRateLimit(phone: string, ip: string): OtpRateLimitResult {
  const now = Date.now();
  const clientIp = ip || 'unknown';

  const last = lastSendByPhone.get(phone);
  if (last != null && now - last < MIN_INTERVAL_MS) {
    return {
      ok: false,
      retryAfterSec: Math.ceil((MIN_INTERVAL_MS - (now - last)) / 1000),
      reason: 'phone_interval',
    };
  }

  const phoneTimes = pruneTimestamps(phone, sendTimestampsByPhone, now);
  if (phoneTimes.length >= MAX_PER_WINDOW) {
    const oldest = phoneTimes[0]!;
    return {
      ok: false,
      retryAfterSec: Math.ceil((WINDOW_MS - (now - oldest)) / 1000),
      reason: 'phone_window',
    };
  }

  const ipTimes = pruneTimestamps(clientIp, sendTimestampsByIp, now);
  if (ipTimes.length >= MAX_PER_WINDOW * 2) {
    const oldest = ipTimes[0]!;
    return {
      ok: false,
      retryAfterSec: Math.ceil((WINDOW_MS - (now - oldest)) / 1000),
      reason: 'ip_window',
    };
  }

  return { ok: true };
}

export function recordOtpSend(phone: string, ip: string): void {
  const now = Date.now();
  const clientIp = ip || 'unknown';
  lastSendByPhone.set(phone, now);

  const phoneTimes = sendTimestampsByPhone.get(phone) || [];
  phoneTimes.push(now);
  sendTimestampsByPhone.set(phone, phoneTimes);

  const ipTimes = sendTimestampsByIp.get(clientIp) || [];
  ipTimes.push(now);
  sendTimestampsByIp.set(clientIp, ipTimes);
}

export function resetOtpRateLimitsForTests(): void {
  lastSendByPhone.clear();
  sendTimestampsByPhone.clear();
  sendTimestampsByIp.clear();
}
