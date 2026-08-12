import { NextRequest, NextResponse } from 'next/server';
import {
  getOrCreateStoryShare,
  getOrCreatePhotoShare,
  getOrCreateMovieShare,
  getShareByCode,
  incrementStoryReadCount,
} from '@/lib/db';
import { buildSharePlayUrl } from '@/lib/public-base-url';
import {
  requireMovieAccess,
  requirePhotoAccess,
  requireStoryAccess,
  familyAccessErrorResponse,
} from '@/lib/family-access';

export async function POST(request: NextRequest) {
  try {
    const { storyId, photoId, movieId } = await request.json();

    if (movieId) {
      await requireMovieAccess(request, movieId);
      const shareCode = getOrCreateMovieShare(movieId);
      return NextResponse.json({
        shareCode,
        shareUrl: buildSharePlayUrl(request, shareCode),
        shareType: 'movie',
      });
    }

    if (photoId) {
      await requirePhotoAccess(request, photoId);
      const shareCode = getOrCreatePhotoShare(photoId);
      return NextResponse.json({
        shareCode,
        shareUrl: buildSharePlayUrl(request, shareCode),
        shareType: 'memory',
      });
    }

    if (storyId) {
      await requireStoryAccess(request, storyId);
      const shareCode = getOrCreateStoryShare(storyId);
      return NextResponse.json({
        shareCode,
        shareUrl: buildSharePlayUrl(request, shareCode),
        shareType: 'story',
      });
    }

    return NextResponse.json({ error: '缺少 storyId、photoId 或 movieId' }, { status: 400 });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
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
