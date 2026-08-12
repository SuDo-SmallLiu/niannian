import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { checkHeavyApiRateLimit } from '@/lib/api-rate-limit';

export function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/** 重任务接口限流；命中时返回 429 Response，否则返回 null */
export function heavyApiRateLimitResponse(
  request: NextRequest,
  endpoint: string,
  userId?: string
): NextResponse | null {
  const rate = checkHeavyApiRateLimit({
    ip: clientIp(request),
    endpoint,
    userId,
  });
  if (!rate.ok) {
    return NextResponse.json(
      { error: '请求过于频繁，请稍后再试', retryAfterSec: rate.retryAfterSec },
      {
        status: 429,
        headers: rate.retryAfterSec ? { 'Retry-After': String(rate.retryAfterSec) } : {},
      }
    );
  }
  return null;
}
