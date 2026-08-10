import {
  getFamily,
  getLifeMovie,
  getMovieChapters,
  getStory,
} from '@/lib/db';
import { buildMovieSlides, type StoryH5Input } from '@/lib/h5-story-slides';
import { getStoryPhotosDetail, getStorySegments } from '@/lib/story-segments';

/** 服务端组装人生电影幻灯片（与播放页一致） */
export async function buildMovieSlidesForServer(movieId: string) {
  const movie = getLifeMovie(movieId);
  if (!movie) return null;

  const family = getFamily(movie.family_id);
  const chapterRows = getMovieChapters(movieId);

  const chapters = (
    await Promise.all(
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
            photosDetail: photos.filter((p): p is NonNullable<(typeof photos)[number]> => p != null),
          } satisfies StoryH5Input,
        };
      })
    )
  ).filter(Boolean) as Array<{
    chapterTitle: string;
    chapterTheme: string;
    story: StoryH5Input;
  }>;

  const slides = buildMovieSlides(
    movie.title,
    family?.name || '',
    chapters
  );

  return { movie, family, chapters, slides };
}
