import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth-session';
import { resolveRequestId } from '@/lib/request-context';

function attachRequestId(response: NextResponse, requestId: string): NextResponse {
  response.headers.set('x-request-id', requestId);
  response.headers.set('x-trace-id', requestId);
  return response;
}

function jsonWithRequestId(body: unknown, init: ResponseInit, requestId: string) {
  const response = NextResponse.json(body, init);
  return attachRequestId(response, requestId);
}

function isPublicPage(pathname: string): boolean {
  if (pathname === '/' || pathname === '/login') return true;
  if (pathname.startsWith('/share/')) return true;
  return false;
}

function isPublicApi(pathname: string, method: string): boolean {
  if (pathname.startsWith('/api/auth/')) return true;
  if (pathname.startsWith('/api/uploads/')) return true;
  if (pathname.startsWith('/api/audio/narration/')) return true;
  if (pathname.startsWith('/api/video/movies/')) return true;
  if (pathname === '/api/ai/status') return true;
  if (pathname === '/api/share/play') return true;
  if (pathname === '/api/share' && method === 'GET') return true;
  return false;
}

function isStaticAsset(pathname: string): boolean {
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/audio/')) return true;
  if (pathname.startsWith('/video/')) return true;
  if (/\.(ico|png|jpg|jpeg|gif|webp|svg|mp3|woff2?)$/i.test(pathname)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = resolveRequestId(request.headers);

  if (isStaticAsset(pathname)) {
    return attachRequestId(NextResponse.next(), requestId);
  }

  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith('/api/')) {
    if (isPublicApi(pathname, request.method)) {
      return attachRequestId(NextResponse.next(), requestId);
    }
    if (!session) {
      return jsonWithRequestId({ error: '请先登录' }, { status: 401 }, requestId);
    }
    return attachRequestId(NextResponse.next(), requestId);
  }

  if (!isPublicPage(pathname) && !session) {
    const homeUrl = new URL('/', request.url);
    homeUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(homeUrl);
  }

  if (pathname === '/login') {
    const redirect = request.nextUrl.searchParams.get('redirect') || '/';
    return NextResponse.redirect(new URL(redirect, request.url));
  }

  return attachRequestId(NextResponse.next(), requestId);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/upload).*)'],
};
