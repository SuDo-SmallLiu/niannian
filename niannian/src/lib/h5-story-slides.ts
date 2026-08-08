/** H5 沉浸式故事 · 幻灯片数据结构 */

import { pickTrackFromAffect, type AffectMusicInput } from '@/lib/affect-music';
import type { Valence, Arousal } from '@/lib/affect-theory';

export type H5SlideType = 'cover' | 'chapter' | 'outro' | 'interstitial';

export interface H5SlideAffect {
  archetype?: string;
  emotions?: string[];
  valence?: Valence;
  arousal?: Arousal;
}

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
  /** MeloTTS 预生成旁白 */
  narrationUrl?: string;
  narrationDurationMs?: number;
  /** 记忆卡情动推测 */
  affect?: H5SlideAffect;
  /** 根据情动选定的配乐曲目 ID */
  musicTrackId?: string;
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
    affect?: H5SlideAffect;
  }>;
  photosDetail: Array<{
    id: string;
    url: string;
    people?: string[];
    location?: string;
    taken_at?: string;
    action?: string;
    significance?: string;
    affect?: H5SlideAffect;
  }>;
}

function resolveMusicTrackId(input: AffectMusicInput, seed: string): string {
  return pickTrackFromAffect(input, seed).id;
}

function attachMusic(slide: H5Slide, theme?: string): H5Slide {
  const affectInput: AffectMusicInput = {
    ...slide.affect,
    theme: slide.theme || theme,
  };
  return {
    ...slide,
    musicTrackId: resolveMusicTrackId(affectInput, slide.id),
  };
}

export function buildStorySlides(input: StoryH5Input): H5Slide[] {
  const photoMap = new Map(input.photosDetail.map((p) => [p.id, p]));
  const coverPhoto =
    input.photosDetail[0]?.url ||
    input.segments.find((s) => photoMap.get(s.photoId)?.url)?.photoId;

  const coverUrl = typeof coverPhoto === 'string' && coverPhoto.startsWith('/')
    ? coverPhoto
    : photoMap.get(input.segments[0]?.photoId || '')?.url || input.photosDetail[0]?.url;

  const chapterSegments =
    input.segments.length > 0
      ? input.segments
      : input.photosDetail.map((p) => ({
          photoId: p.id,
          memorySnippet: [p.action, p.location, p.taken_at].filter(Boolean).join(' · '),
          narrative: p.significance || p.action || input.summary,
          affect: p.affect,
          meta: {
            people: p.people || [],
            location: p.location || '',
            taken_at: p.taken_at || '',
          },
        }));

  const slides: H5Slide[] = [
    attachMusic(
      {
        id: 'cover',
        type: 'cover',
        title: input.title,
        summary: input.summary,
        theme: input.theme,
        familyName: input.familyName,
        coverUrl,
        affect: chapterSegments[0]?.affect || input.photosDetail[0]?.affect,
      },
      input.theme
    ),
  ];

  chapterSegments.forEach((seg, idx) => {
    const photo = photoMap.get(seg.photoId);
    slides.push(
      attachMusic(
        {
          id: `chapter-${seg.photoId}-${idx}`,
          type: 'chapter',
          theme: input.theme,
          chapterIndex: idx + 1,
          chapterTotal: chapterSegments.length,
          photoUrl: photo?.url,
          narrative: seg.narrative,
          memorySnippet: seg.memorySnippet,
          affect: seg.affect || photo?.affect,
          meta: seg.meta || {
            people: photo?.people || [],
            location: photo?.location || '',
            taken_at: photo?.taken_at || '',
          },
        },
        input.theme
      )
    );
  });

  slides.push(
    attachMusic(
      {
        id: 'outro',
        type: 'outro',
        title: input.title,
        connectionAction: input.connectionAction,
        familyName: input.familyName,
        theme: input.theme,
        affect: { archetype: '温暖相依', emotions: ['温暖'] },
      },
      input.theme
    )
  );

  return slides;
}

export function buildMovieSlides(
  movieTitle: string,
  familyName: string,
  chapters: Array<{ story: StoryH5Input; chapterTitle: string; chapterTheme: string }>
): H5Slide[] {
  const firstStory = chapters[0]?.story;
  const slides: H5Slide[] = [
    attachMusic(
      {
        id: 'movie-cover',
        type: 'cover',
        title: movieTitle,
        summary: `${familyName} · ${chapters.length} 个故事章节`,
        theme: chapters[0]?.chapterTheme,
        familyName,
        coverUrl: firstStory?.photosDetail[0]?.url,
        affect:
          firstStory?.segments[0]?.affect || firstStory?.photosDetail[0]?.affect,
      },
      chapters[0]?.chapterTheme
    ),
  ];

  chapters.forEach((ch, movieIdx) => {
    if (movieIdx > 0) {
      slides.push(
        attachMusic(
          {
            id: `interstitial-${movieIdx}`,
            type: 'interstitial',
            interstitialTitle: ch.chapterTitle,
            interstitialTheme: ch.chapterTheme,
            interstitialIndex: movieIdx + 1,
            interstitialTotal: chapters.length,
            coverUrl: ch.story.photosDetail[0]?.url,
            theme: ch.chapterTheme,
            affect:
              ch.story.segments[0]?.affect || ch.story.photosDetail[0]?.affect,
          },
          ch.chapterTheme
        )
      );
    }

    const storySlides = buildStorySlides({
      ...ch.story,
      theme: ch.chapterTheme || ch.story.theme,
      familyName,
    }).filter((s) => s.type === 'chapter');

    slides.push(...storySlides);
  });

  slides.push(
    attachMusic(
      {
        id: 'movie-outro',
        type: 'outro',
        title: movieTitle,
        summary: '感谢观看这段家庭记忆',
        familyName,
        affect: { archetype: '岁月回响', emotions: ['温暖', '怀念'] },
      },
      chapters[chapters.length - 1]?.chapterTheme
    )
  );

  return slides;
}
