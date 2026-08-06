import { NextRequest, NextResponse } from 'next/server';
import { runMovieEngine } from '@/lib/movie-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { familyId, replaceExisting } = body as {
      familyId?: string;
      replaceExisting?: boolean;
    };

    if (!familyId) {
      return NextResponse.json({ error: '缺少家庭 ID' }, { status: 400 });
    }

    const result = runMovieEngine(familyId, { replaceExisting: replaceExisting !== false });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : '生成失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
