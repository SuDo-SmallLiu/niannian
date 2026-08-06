import { NextRequest, NextResponse } from 'next/server';
import { createFamily, getDb } from '@/lib/db';

export async function GET() {
  try {
    const database = getDb();
    const families = database.prepare(
      'SELECT f.*, COUNT(DISTINCT p.id) as photo_count, COUNT(DISTINCT s.id) as story_count FROM families f LEFT JOIN photos p ON f.id = p.family_id LEFT JOIN stories s ON f.id = s.family_id GROUP BY f.id ORDER BY f.created_at DESC'
    ).all() as any[];

    return NextResponse.json({
      families: families.map((f: any) => ({
        ...f,
        members: JSON.parse(f.members || '[]'),
      })),
    });
  } catch (error) {
    console.error('获取家庭列表失败:', error);
    return NextResponse.json({ families: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, members } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: '家庭名称不能为空' }, { status: 400 });
    }

    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: '至少需要一位家庭成员' }, { status: 400 });
    }

    const id = createFamily(name.trim(), members);
    return NextResponse.json({ id, name: name.trim(), members });
  } catch (error) {
    console.error('创建家庭失败:', error);
    return NextResponse.json({ error: '创建失败，请重试' }, { status: 500 });
  }
}
