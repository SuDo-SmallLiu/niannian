import { NextRequest, NextResponse } from 'next/server';
import { getMemoryCardWithPhoto } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const photoId = request.nextUrl.searchParams.get('photoId');
    if (!photoId) {
      return NextResponse.json({ error: '缺少 photoId' }, { status: 400 });
    }

    const data = getMemoryCardWithPhoto(photoId);
    if (!data) {
      return NextResponse.json({ error: '照片不存在' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('获取记忆卡失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
