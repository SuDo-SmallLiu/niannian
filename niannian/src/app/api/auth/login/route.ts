import { NextRequest, NextResponse } from 'next/server';
import {
  createSessionToken,
  loginWithPhone,
  normalizePhone,
  setSessionCookie,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { phone: rawPhone, code } = await request.json();
    const phone = normalizePhone(String(rawPhone || ''));

    if (!phone) {
      return NextResponse.json({ error: '请输入有效的手机号' }, { status: 400 });
    }

    if (!code || String(code).length !== 6) {
      return NextResponse.json({ error: '请输入 6 位验证码' }, { status: 400 });
    }

    const user = await loginWithPhone(phone, String(code));
    if (!user) {
      return NextResponse.json({ error: '验证码错误或已过期' }, { status: 401 });
    }

    const token = await createSessionToken(user.id, user.phone);
    const response = NextResponse.json({ user });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json({ error: '登录失败，请重试' }, { status: 500 });
  }
}
