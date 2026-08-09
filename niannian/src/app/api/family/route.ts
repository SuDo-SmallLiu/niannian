import { NextRequest, NextResponse } from 'next/server';
import { createFamily, getUserFamilies, addFamilyMember } from '@/lib/db';
import { requireAuth, AuthError, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const families = getUserFamilies(user.id).map((f: any) => ({
      ...f,
      members: JSON.parse(f.members || '[]'),
    }));

    return NextResponse.json({ families });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }
    console.error('获取家庭列表失败:', error);
    return NextResponse.json({ families: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { name, members } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: '家庭名称不能为空' }, { status: 400 });
    }

    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: '至少需要一位家庭成员' }, { status: 400 });
    }

    const id = createFamily(name.trim(), members);
    addFamilyMember(id, user.id, 'owner');
    return NextResponse.json({ id, name: name.trim(), members });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }
    console.error('创建家庭失败:', error);
    return NextResponse.json({ error: '创建失败，请重试' }, { status: 500 });
  }
}
