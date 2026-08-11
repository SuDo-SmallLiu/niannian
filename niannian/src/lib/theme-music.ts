/**
 * 幻灯片 / 情动 → 背景音乐（CC0 音乐库）
 */

import { pickTrackFromAffect, type AffectMusicInput } from '@/lib/affect-music';
import {
  getMusicTrackById,
  getMusicSrcForTheme,
  getMusicVolumeForTheme,
  pickTrackForTheme,
  type MusicLibraryTrack,
} from '@/lib/music-library';
import type { H5Slide } from '@/lib/h5-story-slides';

export interface ThemeMusicTrack {
  id: string;
  mood: string;
  volume: number;
  file: string;
  title: string;
  license: string;
  source: string;
}

function toThemeMusicTrack(track: MusicLibraryTrack, theme?: string): ThemeMusicTrack {
  return {
    id: track.id,
    mood: track.mood.join('、'),
    volume: getMusicVolumeForTheme(theme),
    file: track.file,
    title: track.title,
    license: track.license,
    source: track.source,
  };
}

export function getMusicForTheme(theme?: string): ThemeMusicTrack {
  return toThemeMusicTrack(pickTrackForTheme(theme), theme);
}

export function getMusicSrc(theme?: string): string {
  return getMusicSrcForTheme(theme);
}

export function getThemeFromSlide(slide: {
  type: string;
  theme?: string;
  interstitialTheme?: string;
}): string | undefined {
  if (slide.type === 'cover' && slide.theme) return slide.theme;
  if (slide.type === 'interstitial' && slide.interstitialTheme) return slide.interstitialTheme;
  if (slide.type === 'chapter' && slide.theme) return slide.theme;
  return undefined;
}

/** 根据当前幻灯片的情动推测选曲（优先于故事主题） */
export function getMusicFromSlide(slide: H5Slide | undefined): ThemeMusicTrack {
  if (!slide) return getMusicForTheme(undefined);

  if (slide.musicTrackId) {
    const preset = getMusicTrackById(slide.musicTrackId);
    if (preset) return toThemeMusicTrack(preset, slide.theme);
  }

  const theme = getThemeFromSlide(slide);
  const affectInput: AffectMusicInput = {
    ...slide.affect,
    theme,
  };

  if (slide.affect?.archetype || (slide.affect?.emotions?.length ?? 0) > 0) {
    const track = pickTrackFromAffect(affectInput, slide.id);
    return toThemeMusicTrack(track, theme);
  }

  return getMusicForTheme(theme);
}

export function getWorkMusicFromSlides(slides: H5Slide[]): ThemeMusicTrack {
  const anchor =
    slides.find((s) => s.type === 'chapter' || s.type === 'cover') || slides[0];
  return getMusicFromSlide(anchor);
}

export type { MusicLibraryTrack };
