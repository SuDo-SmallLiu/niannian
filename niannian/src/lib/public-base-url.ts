import type { NextRequest } from 'next/server';

/** 生成对外可访问的站点根 URL（分享二维码、海报链接等） */
export function getPublicBaseUrl(request?: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (request) {
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost.split(',')[0].trim()}`;
    }
    const origin = request.headers.get('origin');
    if (origin) return origin.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost:3000';
}

export function buildSharePlayUrl(request: NextRequest | undefined, shareCode: string): string {
  return `${getPublicBaseUrl(request)}/share/${shareCode}/play`;
}
