import { NextRequest, NextResponse } from 'next/server';
import { runMovieEngine } from '@/lib/movie-engine';
import { scheduleMovieNarrationPrefetch } from '@/lib/movie-narration-prefetch';
import { requireFamilyAccess, familyAccessErrorResponse } from '@/lib/family-access';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { familyId, replaceExisting, prefetchAudio, renderVideo } = body as {
      familyId?: string;
      replaceExisting?: boolean;
      prefetchAudio?: boolean;
      /** 旁白预生成完成后自动 FFmpeg 渲染 MP4 */
      renderVideo?: boolean;
    };

    if (!familyId) {
      return NextResponse.json({ error: '缺少家庭 ID' }, { status: 400 });
    }

    await requireFamilyAccess(request, familyId);

    const result = runMovieEngine(familyId, { replaceExisting: replaceExisting !== false });

    if (prefetchAudio === true) {
      scheduleMovieNarrationPrefetch(result.movieId, { renderVideo: renderVideo === true });
    } else if (renderVideo === true) {
      const { scheduleMovieRender } = await import('@/lib/movie-render-queue');
      scheduleMovieRender(result.movieId);
    }

    return NextResponse.json({
      success: true,
      ...result,
      audio: prefetchAudio === true ? { status: 'prefetching' as const } : { status: 'lazy' as const },
      video:
        renderVideo === true
          ? { status: prefetchAudio ? ('after_audio' as const) : ('queued' as const) }
          : { status: 'lazy' as const },
    });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    const message = error instanceof Error ? error.message : '生成失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
