import { NextRequest, NextResponse } from 'next/server';
import { createShare, getShareByCode } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { storyId } = await request.json();

    if (!storyId) {
      return NextResponse.json({ error: '缺少故事ID' }, { status: 400 });
    }

    const shareCode = createShare(storyId);

    // 构建分享链接
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('origin') || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/share/${shareCode}`;

    return NextResponse.json({
      shareCode,
      shareUrl,
    });
  } catch (error) {
    console.error('创建分享失败:', error);
    return NextResponse.json({ error: '创建分享失败' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: '缺少分享码' }, { status: 400 });
    }

    const shareData = getShareByCode(code);
    if (!shareData) {
      return NextResponse.json({ error: '分享不存在或已过期' }, { status: 404 });
    }

    return NextResponse.json({ share: shareData });
  } catch (error) {
    console.error('获取分享失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
