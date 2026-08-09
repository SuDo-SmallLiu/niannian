import { NextRequest, NextResponse } from 'next/server';
import { saveVerifyCode } from '@/lib/db';
import {
  generateVerifyCode,
  isLocalCodeAuth,
  normalizePhone,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { phone: rawPhone } = await request.json();
    const phone = normalizePhone(String(rawPhone || ''));

    if (!phone) {
      return NextResponse.json({ error: '请输入有效的手机号' }, { status: 400 });
    }

    const code = generateVerifyCode();
    saveVerifyCode(phone, code);

    if (isLocalCodeAuth()) {
      return NextResponse.json({
        ok: true,
        code,
        message: '验证码已生成，请在页面查看',
      });
    }

    console.log(`[auth] 验证码 ${phone}: ${code}`);
    return NextResponse.json({ ok: true, message: '验证码已发送' });
  } catch (error) {
    console.error('发送验证码失败:', error);
    return NextResponse.json({ error: '发送失败，请重试' }, { status: 500 });
  }
}
