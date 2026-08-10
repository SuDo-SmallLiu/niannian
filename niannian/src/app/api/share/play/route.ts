import { NextRequest, NextResponse } from 'next/server';
import { loadSharePlayPayload } from '@/lib/share-play';

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    if (!code) {
      return NextResponse.json({ error: '缺少分享码' }, { status: 400 });
    }

    const payload = await loadSharePlayPayload(code);
    if (!payload) {
      return NextResponse.json({ error: '分享不存在或已失效' }, { status: 404 });
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('分享播放数据加载失败:', error);
    return NextResponse.json({ error: '加载失败' }, { status: 500 });
  }
}
