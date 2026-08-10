import {
  getFamily,
  getLifeMovie,
  getMovieChapters,
  getShareByCode,
  getStory,
  incrementStoryReadCount,
} from '@/lib/db';
import { buildMovieSlidesForServer } from '@/lib/movie-slides-server';
import {
  enrichManifestWithDurations,
  loadMovieNarrationManifest,
} from '@/lib/narration-tts';
import { getStoryPhotosDetail, getStorySegments } from '@/lib/story-segments';

export async function loadSharePlayPayload(shareCode: string) {
  const share = getShareByCode(shareCode);
  if (!share) return null;

  if (share.share_type === 'memory') {
    return {
      share_type: 'memory' as const,
      share_code: shareCode,
      family_name: share.family_name,
      photo: share.photo,
    };
  }

  if (share.share_type === 'movie') {
    const movie = getLifeMovie(share.movie_id);
    if (!movie) return null;

    const family = getFamily(movie.family_id);
    const chapterRows = getMovieChapters(share.movie_id);

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

    const built = await buildMovieSlidesForServer(share.movie_id);
    let narration = built ? loadMovieNarrationManifest(share.movie_id, built.slides) : {};
    narration = await enrichManifestWithDurations(share.movie_id, narration);

    return {
      share_type: 'movie' as const,
      share_code: shareCode,
      movie: {
        id: movie.id,
        title: movie.title,
        summary: movie.summary || '',
        media_url: movie.media_url || null,
        render_status: movie.render_status || 'none',
      },
      family: family ? { name: family.name } : null,
      chapters: chapters.filter(Boolean),
      narration,
    };
  }

  const storyId = share.story_id as string;
  const story = getStory(storyId);
  if (!story) return null;

  const readCount = incrementStoryReadCount(storyId);
  const segments = getStorySegments(
    storyId,
    story.photos as string[],
    story.summary || story.description
  );
  const orderedPhotoIds = segments.map((s) => s.photoId);
  const photos = getStoryPhotosDetail(
    story.family_id,
    orderedPhotoIds.length > 0 ? orderedPhotoIds : (story.photos as string[])
  );
  const family = getFamily(story.family_id);

  return {
    share_type: 'story' as const,
    share_code: shareCode,
    read_count: readCount,
    story: {
      id: story.id,
      title: story.title,
      summary: story.summary || story.description,
      theme: story.theme,
      connectionAction: story.connection_action,
      segments,
      photosDetail: photos,
    },
    family: family ? { name: family.name } : null,
  };
}
