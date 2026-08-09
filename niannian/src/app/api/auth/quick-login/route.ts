import { NextRequest, NextResponse } from 'next/server';
import { saveVerifyCode } from '@/lib/db';
import {
  createSessionToken,
  generateVerifyCode,
  isLocalCodeAuth,
  loginWithPhone,
  normalizePhone,
  setSessionCookie,
} from '@/lib/auth';

/** 本地模式：输入手机号 → 生成随机验证码 → 直接登录（不发短信） */
export async function POST(request: NextRequest) {
  try {
    if (!isLocalCodeAuth()) {
      return NextResponse.json({ error: '当前环境需使用短信验证码登录' }, { status: 403 });
    }

    const { phone: rawPhone } = await request.json();
    const phone = normalizePhone(String(rawPhone || ''));

    if (!phone) {
      return NextResponse.json({ error: '请输入有效的手机号' }, { status: 400 });
    }

    const code = generateVerifyCode();
    saveVerifyCode(phone, code);

    const user = await loginWithPhone(phone, code);
    if (!user) {
      return NextResponse.json({ error: '登录失败，请重试' }, { status: 500 });
    }

    const token = await createSessionToken(user.id, user.phone);
    const response = NextResponse.json({ user, code });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error('快速登录失败:', error);
    return NextResponse.json({ error: '登录失败，请重试' }, { status: 500 });
  }
}
