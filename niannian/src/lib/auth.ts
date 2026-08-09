import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getUserById } from '@/lib/db';
import {
  SESSION_COOKIE,
  verifySessionToken,
  type SessionPayload,
} from '@/lib/auth-session';

export {
  createSessionToken,
  SESSION_COOKIE,
  setSessionCookie,
  clearSessionCookie,
  verifySessionToken,
  type SessionPayload,
} from '@/lib/auth-session';

export interface AuthUser {
  id: string;
  phone: string;
  name: string;
  avatar: string;
}

export async function getSessionFromRequest(
  request: NextRequest
): Promise<SessionPayload | null> {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export async function getAuthUserFromRequest(
  request: NextRequest
): Promise<AuthUser | null> {
  const session = await getSessionFromRequest(request);
  if (!session) return null;
  const row = getUserById(session.userId);
  if (!row) return null;
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    avatar: row.avatar,
  };
}

export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    throw new AuthError();
  }
  return user;
}

export class AuthError extends Error {
  constructor(message = '请先登录') {
    super(message);
    this.name = 'AuthError';
  }
}

export function unauthorizedResponse(message = '请先登录') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (/^1\d{10}$/.test(digits)) return digits;
  return null;
}

export function maskPhone(phone: string): string {
  if (phone.length !== 11) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(7)}`;
}

export function generateVerifyCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** 本地随机验证码模式（不发短信），默认开启 */
export function isLocalCodeAuth(): boolean {
  return process.env.AUTH_SMS !== 'true';
}

export async function loginWithPhone(phone: string, code: string): Promise<AuthUser | null> {
  const { verifyCode, createUser, findUserByPhone } = await import('@/lib/db');

  if (!verifyCode(phone, code)) return null;

  let user = findUserByPhone(phone);
  if (!user) {
    createUser(phone);
    user = findUserByPhone(phone);
  }

  if (!user) return null;

  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    avatar: user.avatar,
  };
}
