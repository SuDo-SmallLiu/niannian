import { NextRequest, NextResponse } from 'next/server';
import { getLifeMovie } from '@/lib/db';
import {
  isMovieNarrationPrefetching,
  scheduleMovieNarrationPrefetch,
} from '@/lib/movie-narration-prefetch';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const movieId = body.movieId as string | undefined;
    const renderVideo = body.renderVideo === true;

    if (!movieId) {
      return NextResponse.json({ error: '缺少 movieId' }, { status: 400 });
    }

    const movie = getLifeMovie(movieId);
    if (!movie) {
      return NextResponse.json({ error: '人生电影不存在' }, { status: 404 });
    }

    const started = scheduleMovieNarrationPrefetch(movieId, { renderVideo });

    return NextResponse.json({
      success: true,
      started,
      prefetching: isMovieNarrationPrefetching(movieId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '预生成失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
