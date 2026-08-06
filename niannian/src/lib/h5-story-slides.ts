/** H5 沉浸式故事 · 幻灯片数据结构 */

export type H5SlideType = 'cover' | 'chapter' | 'outro' | 'interstitial';

export interface H5SlideMeta {
  people: string[];
  location: string;
  taken_at: string;
}

export interface H5Slide {
  id: string;
  type: H5SlideType;
  title?: string;
  summary?: string;
  theme?: string;
  familyName?: string;
  coverUrl?: string;
  chapterIndex?: number;
  chapterTotal?: number;
  photoUrl?: string;
  narrative?: string;
  memorySnippet?: string;
  meta?: H5SlideMeta;
  connectionAction?: string;
  /** 人生电影章节过渡 */
  interstitialTitle?: string;
  interstitialTheme?: string;
  interstitialIndex?: number;
  interstitialTotal?: number;
}

export interface StoryH5Input {
  id: string;
  title: string;
  summary: string;
  theme?: string;
  familyName?: string;
  connectionAction?: string;
  segments: Array<{
    photoId: string;
    memorySnippet: string;
    narrative: string;
    meta?: H5SlideMeta;
  }>;
  photosDetail: Array<{
    id: string;
    url: string;
    people?: string[];
    location?: string;
    taken_at?: string;
    action?: string;
    significance?: string;
  }>;
}

export function buildStorySlides(input: StoryH5Input): H5Slide[] {
  const photoMap = new Map(input.photosDetail.map((p) => [p.id, p]));
  const coverPhoto =
    input.photosDetail[0]?.url ||
    input.segments.find((s) => photoMap.get(s.photoId)?.url)?.photoId;

  const coverUrl = typeof coverPhoto === 'string' && coverPhoto.startsWith('/')
    ? coverPhoto
    : photoMap.get(input.segments[0]?.photoId || '')?.url || input.photosDetail[0]?.url;

  const slides: H5Slide[] = [
    {
      id: 'cover',
      type: 'cover',
      title: input.title,
      summary: input.summary,
      theme: input.theme,
      familyName: input.familyName,
      coverUrl,
    },
  ];

  const chapters =
    input.segments.length > 0
      ? input.segments
      : input.photosDetail.map((p) => ({
          photoId: p.id,
          memorySnippet: [p.action, p.location, p.taken_at].filter(Boolean).join(' · '),
          narrative: p.significance || p.action || input.summary,
          meta: {
            people: p.people || [],
            location: p.location || '',
            taken_at: p.taken_at || '',
          },
        }));

  chapters.forEach((seg, idx) => {
    const photo = photoMap.get(seg.photoId);
    slides.push({
      id: `chapter-${seg.photoId}-${idx}`,
      type: 'chapter',
      chapterIndex: idx + 1,
      chapterTotal: chapters.length,
      photoUrl: photo?.url,
      narrative: seg.narrative,
      memorySnippet: seg.memorySnippet,
      meta: seg.meta || {
        people: photo?.people || [],
        location: photo?.location || '',
        taken_at: photo?.taken_at || '',
      },
    });
  });

  slides.push({
    id: 'outro',
    type: 'outro',
    title: input.title,
    connectionAction: input.connectionAction,
    familyName: input.familyName,
  });

  return slides;
}

export function buildMovieSlides(
  movieTitle: string,
  familyName: string,
  chapters: Array<{ story: StoryH5Input; chapterTitle: string; chapterTheme: string }>
): H5Slide[] {
  const slides: H5Slide[] = [
    {
      id: 'movie-cover',
      type: 'cover',
      title: movieTitle,
      summary: `${familyName} · ${chapters.length} 个故事章节`,
      familyName,
      coverUrl: chapters[0]?.story.photosDetail[0]?.url,
    },
  ];

  chapters.forEach((ch, movieIdx) => {
    if (movieIdx > 0) {
      slides.push({
        id: `interstitial-${movieIdx}`,
        type: 'interstitial',
        interstitialTitle: ch.chapterTitle,
        interstitialTheme: ch.chapterTheme,
        interstitialIndex: movieIdx + 1,
        interstitialTotal: chapters.length,
        coverUrl: ch.story.photosDetail[0]?.url,
      });
    }

    const storySlides = buildStorySlides({
      ...ch.story,
      familyName,
    }).filter((s) => s.type === 'chapter');

    slides.push(...storySlides);
  });

  slides.push({
    id: 'movie-outro',
    type: 'outro',
    title: movieTitle,
    summary: '感谢观看这段家庭记忆',
    familyName,
  });

  return slides;
}
