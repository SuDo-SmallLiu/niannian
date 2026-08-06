/**
 * 故事主题 → 背景音乐配置
 * 将 MEANINGS / SCENE_TYPES / 人生电影章节主题映射到情绪相近的曲目。
 * 音频文件位于 /public/audio/
 */

export interface ThemeMusicTrack {
  /** 曲目 ID，对应 public/audio/{id}.mp3 */
  id: string;
  /** 情绪描述（便于调试与后续替换素材） */
  mood: string;
  /** 默认音量 0–1 */
  volume: number;
}

/** 曲目库：按情绪分组 */
export const MUSIC_TRACKS: Record<string, ThemeMusicTrack> = {
  warm: { id: 'warm', mood: '温暖相依', volume: 0.35 },
  growth: { id: 'growth', mood: '成长见证', volume: 0.32 },
  explore: { id: 'explore', mood: '探索新奇', volume: 0.3 },
  celebrate: { id: 'celebrate', mood: '欢聚庆典', volume: 0.38 },
  farewell: { id: 'farewell', mood: '暂别思念', volume: 0.28 },
  heritage: { id: 'heritage', mood: '仪式传承', volume: 0.3 },
  default: { id: 'default', mood: '日常烟火', volume: 0.3 },
};

/** 故事主题 → 曲目 */
export const THEME_TO_TRACK: Record<string, keyof typeof MUSIC_TRACKS> = {
  // 核心人生主题
  成长: 'growth',
  陪伴: 'warm',
  团圆: 'warm',
  传承: 'heritage',
  探索: 'explore',
  庆祝: 'celebrate',
  告别: 'farewell',
  爱: 'warm',
  第一次: 'growth',
  // Story Layer meanings
  勇气: 'growth',
  责任: 'heritage',
  梦想: 'explore',
  家庭: 'warm',
  // Scene types
  尝试: 'growth',
  日常: 'default',
};

export function getMusicForTheme(theme?: string): ThemeMusicTrack {
  const key = theme ? THEME_TO_TRACK[theme] : undefined;
  return MUSIC_TRACKS[key || 'default'];
}

export function getMusicSrc(theme?: string): string {
  const track = getMusicForTheme(theme);
  return `/audio/${track.id}.mp3`;
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
