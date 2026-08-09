import { NextResponse } from 'next/server';

export const SESSION_COOKIE = 'niannian_session';
const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;

function getSecret(): string {
  return process.env.AUTH_SECRET || 'niannian-dev-secret-change-in-production';
}

export interface SessionPayload {
  userId: string;
  phone: string;
  exp: number;
}

const encoder = new TextEncoder();

async function importHmacKey() {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function toBase64Url(bytes: ArrayBuffer): string {
  return Buffer.from(bytes).toString('base64url');
}

function fromBase64Url(str: string): Uint8Array {
  return new Uint8Array(Buffer.from(str, 'base64url'));
}

export async function createSessionToken(userId: string, phone: string): Promise<string> {
  const payload: SessionPayload = {
    userId,
    phone,
    exp: Date.now() + SESSION_MAX_AGE_SEC * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const key = await importHmacKey();
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(encoded));
  return `${encoded}.${toBase64Url(sig)}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;

  const encoded = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  try {
    const key = await importHmacKey();
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(sigB64),
      encoder.encode(encoded)
    );
    if (!valid) return null;

    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as SessionPayload;
    if (!payload.userId || !payload.phone || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function cookieSecure(): boolean {
  return process.env.AUTH_COOKIE_SECURE === 'true';
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(),
    path: '/',
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(),
    path: '/',
    maxAge: 0,
  });
}
