import { NextRequest, NextResponse } from 'next/server';
import { saveVerifyCode, countRecentVerifyCodesForPhone } from '@/lib/db';
import { shouldExposeOtpInResponse } from '@/lib/auth-config';
import {
  checkOtpSendRateLimit,
  recordOtpSend,
} from '@/lib/auth-rate-limit';
import {
  generateVerifyCode,
  normalizePhone,
} from '@/lib/auth';

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(request: NextRequest) {
  try {
    const { phone: rawPhone } = await request.json();
    const phone = normalizePhone(String(rawPhone || ''));

    if (!phone) {
      return NextResponse.json({ error: '请输入有效的手机号' }, { status: 400 });
    }

    const ip = clientIp(request);
    const rate = checkOtpSendRateLimit(phone, ip);
    if (!rate.ok) {
      return NextResponse.json(
        { error: '发送过于频繁，请稍后再试', retryAfterSec: rate.retryAfterSec },
        { status: 429 }
      );
    }

    if (countRecentVerifyCodesForPhone(phone, 60) >= 1) {
      return NextResponse.json({ error: '发送过于频繁，请稍后再试' }, { status: 429 });
    }
    if (countRecentVerifyCodesForPhone(phone, 15 * 60) >= 5) {
      return NextResponse.json({ error: '发送次数过多，请 15 分钟后再试' }, { status: 429 });
    }

    const code = generateVerifyCode();
    saveVerifyCode(phone, code);
    recordOtpSend(phone, ip);

    if (shouldExposeOtpInResponse()) {
      return NextResponse.json({
        ok: true,
        code,
        message: '验证码已生成，请在页面查看',
      });
    }

    return NextResponse.json({ ok: true, message: '验证码已发送' });
  } catch (error) {
    console.error('发送验证码失败:', error);
    return NextResponse.json({ error: '发送失败，请重试' }, { status: 500 });
  }
}
