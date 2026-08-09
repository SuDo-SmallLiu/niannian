import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError, unauthorizedResponse } from '@/lib/auth';
import { useInvitation } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: '请输入邀请码' }, { status: 400 });
    }

    const result = useInvitation(code.trim().toUpperCase(), user.id);
    if (!result.success) {
      return NextResponse.json({ error: '邀请码无效或已过期' }, { status: 400 });
    }

    return NextResponse.json({ familyId: result.familyId, ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }
    console.error('加入家庭失败:', error);
    return NextResponse.json({ error: '加入失败，请重试' }, { status: 500 });
  }
}
