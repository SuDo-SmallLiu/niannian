import { NextRequest, NextResponse } from 'next/server';
import { getMemoryCardWithPhoto } from '@/lib/db';
import { analyzeAndSavePhoto } from '@/lib/analyze-photo';

export async function POST(request: NextRequest) {
  try {
    const { photoId, withSupplement } = await request.json();

    if (!photoId) {
      return NextResponse.json({ error: '缺少 photoId' }, { status: 400 });
    }

    await analyzeAndSavePhoto(photoId, { withSupplement: !!withSupplement });

    const data = getMemoryCardWithPhoto(photoId);
    if (!data) {
      return NextResponse.json({ error: '照片不存在' }, { status: 404 });
    }

    return NextResponse.json({ status: 'done', ...data });
  } catch (error) {
    console.error('单张重新解析失败:', error);
    const message = error instanceof Error ? error.message : '解析失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
