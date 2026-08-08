import { NextRequest, NextResponse } from 'next/server';
import {
  getOrCreateStoryShare,
  getOrCreatePhotoShare,
  getOrCreateMovieShare,
  getPhoto,
  getStory,
  getLifeMovie,
  getShareByCode,
  incrementStoryReadCount,
} from '@/lib/db';

function buildShareUrl(request: NextRequest, shareCode: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    request.headers.get('origin') ||
    'http://localhost:3000';
  return `${baseUrl}/share/${shareCode}`;
}

export async function POST(request: NextRequest) {
  try {
    const { storyId, photoId, movieId } = await request.json();

    if (movieId) {
      const movie = getLifeMovie(movieId);
      if (!movie) {
        return NextResponse.json({ error: '人生电影不存在' }, { status: 404 });
      }
      const shareCode = getOrCreateMovieShare(movieId);
      return NextResponse.json({
        shareCode,
        shareUrl: buildShareUrl(request, shareCode),
        shareType: 'movie',
      });
    }

    if (photoId) {
      const photo = getPhoto(photoId);
      if (!photo) {
        return NextResponse.json({ error: '照片不存在' }, { status: 404 });
      }
      const shareCode = getOrCreatePhotoShare(photoId);
      return NextResponse.json({
        shareCode,
        shareUrl: buildShareUrl(request, shareCode),
        shareType: 'memory',
      });
    }

    if (storyId) {
      const story = getStory(storyId);
      if (!story) {
        return NextResponse.json({ error: '故事不存在' }, { status: 404 });
      }
      const shareCode = getOrCreateStoryShare(storyId);
      return NextResponse.json({
        shareCode,
        shareUrl: buildShareUrl(request, shareCode),
        shareType: 'story',
      });
    }

    return NextResponse.json({ error: '缺少 storyId、photoId 或 movieId' }, { status: 400 });
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

    if (shareData.share_type === 'story' && shareData.story_id) {
      const readCount = incrementStoryReadCount(shareData.story_id);
      return NextResponse.json({ share: { ...shareData, read_count: readCount } });
    }

    return NextResponse.json({ share: shareData });
  } catch (error) {
    console.error('获取分享失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
