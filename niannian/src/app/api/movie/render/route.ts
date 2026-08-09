import { NextRequest, NextResponse } from 'next/server';
import { getLifeMovie } from '@/lib/db';
import { prepareMovieAudioPlan } from '@/lib/movie-render';
import { scheduleMovieRender, retryMovieRender, isMovieRendering } from '@/lib/movie-render-queue';
import { parseMovieAudioPlan } from '@/lib/movie-audio-plan';
import { parseMovieRenderProgress } from '@/lib/movie-render-progress';
import { requireMovieAccess, familyAccessErrorResponse } from '@/lib/family-access';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  try {
    const movieId = request.nextUrl.searchParams.get('movieId');
    if (!movieId) {
      return NextResponse.json({ error: '缺少 movieId' }, { status: 400 });
    }

    await requireMovieAccess(request, movieId);
    const movie = getLifeMovie(movieId);
    if (!movie) {
      return NextResponse.json({ error: '人生电影不存在' }, { status: 404 });
    }

    const audioPlan = parseMovieAudioPlan(movie.audio_plan);
    const renderProgress = parseMovieRenderProgress(movie.render_progress);

    return NextResponse.json({
      movieId,
      renderStatus: movie.render_status || 'none',
      mediaUrl: movie.media_url,
      renderError: movie.render_error,
      renderedAt: movie.rendered_at,
      rendering: isMovieRendering(movieId),
      renderProgress,
      audioPlan: audioPlan
        ? {
            totalDurationMs: audioPlan.totalDurationMs,
            segmentCount: audioPlan.segments.length,
            segments: audioPlan.segments.map((s) => ({
              slideId: s.slideId,
              musicId: s.musicId,
              musicFile: s.musicFile,
              volume: s.volume,
              fadeInMs: s.fadeInMs,
              fadeOutMs: s.fadeOutMs,
              affectArchetype: s.affectArchetype,
              durationMs: s.durationMs,
              hasNarration: s.hasNarration,
            })),
          }
        : null,
    });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    console.error('[api/movie/render GET]', error);
    return NextResponse.json({ error: '获取渲染状态失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { movieId, preparePlanOnly, retry } = body as {
      movieId?: string;
      preparePlanOnly?: boolean;
      retry?: boolean;
    };

    if (!movieId) {
      return NextResponse.json({ error: '缺少 movieId' }, { status: 400 });
    }

    await requireMovieAccess(request, movieId);
    const movie = getLifeMovie(movieId);
    if (!movie) {
      return NextResponse.json({ error: '人生电影不存在' }, { status: 404 });
    }

    if (preparePlanOnly) {
      const plan = await prepareMovieAudioPlan(movieId);
      return NextResponse.json({ success: true, audioPlan: plan });
    }

    if (movie.render_status === 'ready' && movie.media_url && !retry) {
      return NextResponse.json({
        success: true,
        renderStatus: 'ready',
        mediaUrl: movie.media_url,
        message: '视频已就绪',
      });
    }

    const started = retry ? retryMovieRender(movieId) : scheduleMovieRender(movieId, { retry: movie.render_status === 'failed' });
    return NextResponse.json({
      success: true,
      renderStatus: started ? 'queued' : movie.render_status,
      message: started ? '渲染任务已启动' : '渲染进行中或已完成',
    });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    console.error('[api/movie/render POST]', error);
    const message = error instanceof Error ? error.message : '启动渲染失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
