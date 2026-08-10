import { NextRequest, NextResponse } from 'next/server';
import { createUser, findUserByPhone } from '@/lib/db';
import { isProductionRuntime } from '@/lib/auth-config';
import {
  createSessionToken,
  isLocalCodeAuth,
  normalizePhone,
  setSessionCookie,
} from '@/lib/auth';

/** 本地模式：输入手机号 → 直接登录（不发短信） */
export async function POST(request: NextRequest) {
  try {
    if (isProductionRuntime() && process.env.ALLOW_DEV_AUTH !== 'true') {
      return NextResponse.json({ error: '生产环境已禁用快速登录' }, { status: 403 });
    }

    if (!isLocalCodeAuth()) {
      return NextResponse.json({ error: '当前环境需使用短信验证码登录' }, { status: 403 });
    }

    const { phone: rawPhone } = await request.json();
    const phone = normalizePhone(String(rawPhone || ''));

    if (!phone) {
      return NextResponse.json({ error: '请输入有效的手机号' }, { status: 400 });
    }

    let row = findUserByPhone(phone);
    if (!row) {
      createUser(phone);
      row = findUserByPhone(phone);
    }
    if (!row) {
      return NextResponse.json({ error: '登录失败，请重试' }, { status: 500 });
    }

    const user = {
      id: row.id,
      phone: row.phone,
      name: row.name,
      avatar: row.avatar,
    };

    const token = await createSessionToken(user.id, user.phone);
    const response = NextResponse.json({ user });
    setSessionCookie(response, token, request);
    return response;
  } catch (error) {
    console.error('快速登录失败:', error);
    return NextResponse.json({ error: '登录失败，请重试' }, { status: 500 });
  }
}
