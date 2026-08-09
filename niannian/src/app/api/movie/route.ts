import { NextRequest, NextResponse } from 'next/server';
import {
  deleteLifeMovieById,
  getFamily,
  getLifeMovie,
  getLifeMoviesByFamily,
  getMovieChapters,
  getStory,
} from '@/lib/db';
import { getStoryPhotosDetail, getStorySegments } from '@/lib/story-segments';
import { buildMovieSlidesForServer } from '@/lib/movie-slides-server';
import {
  enrichManifestWithDurations,
  loadMovieNarrationManifest,
} from '@/lib/narration-tts';
import {
  requireFamilyAccess,
  requireMovieAccess,
  familyAccessErrorResponse,
} from '@/lib/family-access';

export async function DELETE(request: NextRequest) {
  try {
    const movieId = request.nextUrl.searchParams.get('movieId');
    if (!movieId) {
      return NextResponse.json({ error: '缺少 movieId' }, { status: 400 });
    }
    await requireMovieAccess(request, movieId);
    const ok = deleteLifeMovieById(movieId);
    if (!ok) {
      return NextResponse.json({ error: '人生电影不存在' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    console.error('删除人生电影失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const movieId = searchParams.get('movieId');
    const familyId = searchParams.get('familyId');

    if (movieId) {
      await requireMovieAccess(request, movieId);
      const movie = getLifeMovie(movieId);
      if (!movie) {
        return NextResponse.json({ error: '人生电影不存在' }, { status: 404 });
      }

      const family = getFamily(movie.family_id);
      const chapterRows = getMovieChapters(movieId);

      const chapters = await Promise.all(
        chapterRows.map(async (ch) => {
          const story = getStory(ch.story_id);
          if (!story) return null;

          const segments = getStorySegments(
            ch.story_id,
            story.photos as string[],
            story.summary || story.description
          );
          const orderedPhotoIds = segments.map((s) => s.photoId);
          const photos = getStoryPhotosDetail(
            story.family_id,
            orderedPhotoIds.length > 0 ? orderedPhotoIds : (story.photos as string[])
          );

          return {
            chapterTitle: ch.title || story.title,
            chapterTheme: ch.theme || story.theme,
            story: {
              id: story.id,
              title: story.title,
              summary: story.summary || story.description,
              theme: story.theme,
              connectionAction: story.connection_action,
              segments,
              photosDetail: photos,
            },
          };
        })
      );

      const built = await buildMovieSlidesForServer(movieId);
      let narration = built
        ? loadMovieNarrationManifest(movieId, built.slides)
        : {};
      narration = await enrichManifestWithDurations(movieId, narration);

      return NextResponse.json({
        movie,
        family: family ? { name: family.name } : null,
        chapters: chapters.filter(Boolean),
        narration,
      });
    }

    if (familyId) {
      await requireFamilyAccess(request, familyId);
      const movies = getLifeMoviesByFamily(familyId);
      return NextResponse.json({ movies });
    }

    return NextResponse.json({ error: '请提供 movieId 或 familyId' }, { status: 400 });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    console.error('获取人生电影失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
