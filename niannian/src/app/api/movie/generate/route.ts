import { NextRequest, NextResponse } from 'next/server';
import { runMovieEngine } from '@/lib/movie-engine';
import { scheduleMovieNarrationPrefetch } from '@/lib/movie-narration-prefetch';
import { requireFamilyAccess, familyAccessErrorResponse } from '@/lib/family-access';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { familyId, replaceExisting, prefetchAudio } = body as {
      familyId?: string;
      replaceExisting?: boolean;
      prefetchAudio?: boolean;
    };

    if (!familyId) {
      return NextResponse.json({ error: '缺少家庭 ID' }, { status: 400 });
    }

    await requireFamilyAccess(request, familyId);

    const result = runMovieEngine(familyId, { replaceExisting: replaceExisting !== false });

    if (prefetchAudio === true) {
      scheduleMovieNarrationPrefetch(result.movieId);
    }

    return NextResponse.json({
      success: true,
      ...result,
      audio: prefetchAudio === true ? { status: 'prefetching' as const } : { status: 'lazy' as const },
    });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    const message = error instanceof Error ? error.message : '生成失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
