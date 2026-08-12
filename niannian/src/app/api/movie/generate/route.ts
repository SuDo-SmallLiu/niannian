import { NextRequest, NextResponse } from 'next/server';
import { heavyApiRateLimitResponse } from '@/lib/heavy-api-guard';
import { createMovieGenerateJob } from '@/lib/jobs/create-jobs';
import { requireFamilyAccess, familyAccessErrorResponse } from '@/lib/family-access';

export async function POST(request: NextRequest) {
  try {
    const rateLimited = heavyApiRateLimitResponse(request, 'movie/generate');
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { familyId, replaceExisting, prefetchAudio, renderVideo } = body as {
      familyId?: string;
      replaceExisting?: boolean;
      prefetchAudio?: boolean;
      renderVideo?: boolean;
    };

    if (!familyId) {
      return NextResponse.json({ error: '缺少家庭 ID' }, { status: 400 });
    }

    await requireFamilyAccess(request, familyId);

    const job = createMovieGenerateJob({
      familyId,
      replaceExisting: replaceExisting !== false,
      prefetchAudio: prefetchAudio === true,
      renderVideo: renderVideo === true,
    });

    return NextResponse.json(
      {
        success: true,
        jobId: job.id,
        status: job.status,
      },
      { status: 202 }
    );
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    const message = error instanceof Error ? error.message : '生成失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
