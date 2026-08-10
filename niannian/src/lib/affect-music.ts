/**
 * 记忆卡情动推测 → 配乐分类
 * 优先：情动构型 archetype → 表层情绪 emotions → Russell 效价/唤醒 → 故事主题
 */

import type { Valence, Arousal } from '@/lib/affect-theory';
import {
  pickTrackForCategory,
  pickTrackForArchetype,
  pickTrackForTheme,
  type MusicLibraryTrack,
} from '@/lib/music-library';

export type MusicCategory = MusicLibraryTrack['category'];

export interface AffectMusicInput {
  archetype?: string;
  emotions?: string[];
  valence?: Valence;
  arousal?: Arousal;
  theme?: string;
}

const ARCHETYPE_TO_CATEGORY: Record<string, MusicCategory> = {
  温暖相依: 'warm',
  欢聚庆典: 'happy',
  探索新奇: 'happy',
  宁静安放: 'calm',
  成长见证: 'emotional',
  暂别思念: 'nostalgic',
  挑战突破: 'emotional',
  仪式传承: 'nostalgic',
  岁月回响: 'nostalgic',
  日常烟火: 'calm',
};

const EMOTION_KEYWORDS: Array<{ keywords: string[]; category: MusicCategory }> = [
  {
    keywords: ['开心', '喜悦', '兴奋', '欢乐', '快乐', '自由', '欢庆', '热闹'],
    category: 'happy',
  },
  {
    keywords: ['温暖', '安心', '亲密', '放松', '幸福', '爱', '相依', '陪伴'],
    category: 'warm',
  },
  {
    keywords: ['思念', '告别', '失落', '伤感', '牵挂', '怀念', '离别', '不舍'],
    category: 'nostalgic',
  },
  {
    keywords: ['紧张', '骄傲', '期待', '成长', '突破', '勇敢', '激动', '感动'],
    category: 'emotional',
  },
  {
    keywords: ['平静', '安静', '宁静', '日常', '满足', '淡定'],
    category: 'calm',
  },
];

function matchEmotionCategory(emotions: string[]): MusicCategory | undefined {
  for (const emotion of emotions) {
    const e = emotion.trim();
    if (!e) continue;
    for (const group of EMOTION_KEYWORDS) {
      if (group.keywords.some((k) => e.includes(k) || k.includes(e))) {
        return group.category;
      }
    }
  }
  return undefined;
}

function categoryFromValenceArousal(
  valence?: Valence,
  arousal?: Arousal
): MusicCategory | undefined {
  if (!valence || valence === 'neutral') {
    if (arousal === 'low') return 'calm';
    return undefined;
  }
  if (valence === 'positive') {
    if (arousal === 'high') return 'happy';
    return 'warm';
  }
  if (arousal === 'high') return 'emotional';
  return 'nostalgic';
}

export function pickMusicCategoryFromAffect(input: AffectMusicInput): MusicCategory {
  const archetype = input.archetype?.trim();
  if (archetype && ARCHETYPE_TO_CATEGORY[archetype]) {
    return ARCHETYPE_TO_CATEGORY[archetype];
  }

  const fromEmotion = matchEmotionCategory((input.emotions || []).filter(Boolean));
  if (fromEmotion) return fromEmotion;

  const fromRussell = categoryFromValenceArousal(input.valence, input.arousal);
  if (fromRussell) return fromRussell;

  if (input.theme) {
    return pickTrackForTheme(input.theme).category;
  }

  return 'calm';
}

export function pickTrackFromAffect(
  input: AffectMusicInput,
  variantSeed?: string
): MusicLibraryTrack {
  const archetype = input.archetype?.trim();
  if (archetype) {
    const byArchetype = pickTrackForArchetype(archetype, variantSeed);
    if (byArchetype) return byArchetype;
  }

  const category = pickMusicCategoryFromAffect(input);
  return pickTrackForCategory(category, variantSeed);
}
