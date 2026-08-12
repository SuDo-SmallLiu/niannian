import { NextRequest, NextResponse } from 'next/server';
import { checkHeavyApiRateLimit } from '@/lib/api-rate-limit';
import { getPhoto } from '@/lib/db';
import { createPhotoAnalyzeSingleJob } from '@/lib/jobs/create-jobs';
import { requirePhotoAccess, familyAccessErrorResponse } from '@/lib/family-access';

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(request: NextRequest) {
  try {
    const rate = checkHeavyApiRateLimit({
      ip: clientIp(request),
      endpoint: 'analyze_photo',
    });
    if (!rate.ok) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试', retryAfterSec: rate.retryAfterSec },
        { status: 429, headers: rate.retryAfterSec ? { 'Retry-After': String(rate.retryAfterSec) } : {} }
      );
    }

    const { photoId, withSupplement } = await request.json();

    if (!photoId) {
      return NextResponse.json({ error: '缺少 photoId' }, { status: 400 });
    }

    await requirePhotoAccess(request, photoId);
    const photo = getPhoto(photoId);
    if (!photo) {
      return NextResponse.json({ error: '照片不存在' }, { status: 404 });
    }

    const jobId = createPhotoAnalyzeSingleJob({
      familyId: photo.family_id,
      photoId,
      withSupplement: !!withSupplement,
      mode: 'analyze',
    });

    return NextResponse.json({ status: 'queued', jobId, photoId });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    console.error('单张解析任务创建失败:', error);
    const message = error instanceof Error ? error.message : '解析失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
