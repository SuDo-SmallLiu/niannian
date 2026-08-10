export interface MusicLibraryTrack {
  id: string;
  title: string;
  file: string;
  mood: string[];
  category: 'warm' | 'nostalgic' | 'happy' | 'emotional' | 'calm';
  /** 情动构型名称（10 构型直选 BGM） */
  archetype?: string;
  source: string;
  license: string;
}

import libraryData from '@/data/music-library.json';

const tracks = (libraryData as { tracks: MusicLibraryTrack[] }).tracks;

const trackById = new Map(tracks.map((t) => [t.id, t]));
const trackByArchetype = new Map(
  tracks.filter((t) => t.archetype).map((t) => [t.archetype as string, t])
);

/** 故事主题 → 音乐分类 */
export const THEME_TO_CATEGORY: Record<string, MusicLibraryTrack['category']> = {
  成长: 'emotional',
  陪伴: 'warm',
  团圆: 'warm',
  传承: 'nostalgic',
  探索: 'happy',
  庆祝: 'happy',
  告别: 'nostalgic',
  爱: 'warm',
  第一次: 'emotional',
  勇气: 'emotional',
  责任: 'emotional',
  梦想: 'happy',
  家庭: 'warm',
  尝试: 'happy',
  日常: 'calm',
};

export function getAllMusicTracks(): MusicLibraryTrack[] {
  return tracks;
}

export function getMusicTrackById(id: string): MusicLibraryTrack | undefined {
  return trackById.get(id);
}

/** 按情动构型直选 BGM（优先于五类分类） */
export function pickTrackForArchetype(
  archetype: string,
  _variantSeed?: string
): MusicLibraryTrack | undefined {
  const name = archetype.trim();
  if (!name) return undefined;
  return trackByArchetype.get(name);
}

export function pickTrackForTheme(theme?: string): MusicLibraryTrack {
  const category = theme ? THEME_TO_CATEGORY[theme] : undefined;
  if (category) {
    const match = tracks.find((t) => t.category === category);
    if (match) return match;
  }
  return tracks.find((t) => t.id === 'calm-01') || tracks[0];
}

export function pickTrackForCategory(
  category: MusicLibraryTrack['category'],
  variantSeed?: string
): MusicLibraryTrack {
  const candidates = tracks.filter((t) => t.category === category);
  if (candidates.length === 0) return pickTrackForTheme(undefined);
  if (!variantSeed || candidates.length === 1) return candidates[0];
  let hash = 0;
  for (let i = 0; i < variantSeed.length; i++) {
    hash = (hash * 31 + variantSeed.charCodeAt(i)) | 0;
  }
  return candidates[Math.abs(hash) % candidates.length];
}

export function getMusicSrcForTheme(theme?: string): string {
  return pickTrackForTheme(theme).file;
}

export function getMusicVolumeForTheme(_theme?: string): number {
  return 0.32;
}
