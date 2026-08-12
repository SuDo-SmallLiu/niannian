/** 分享海报设计令牌 — 750×1334 移动端 9:16 */
export const POSTER_W = 750;
export const POSTER_H = 1334;

/** 底部分享卡左下角念念形象（透明 PNG） */
export const MASCOT_SHARE_CARD = '/niannian/mascot-share-card.png';

export const POSTER_COLORS = {
  bg: '#FFF6E6',
  card: '#FFFDF9',
  shareCardBg: '#FFF3D6',
  brandYellow: '#F6B51B',
  brandOrange: '#DF8B3A',
  darkCoffee: '#4A3326',
  bodyCoffee: '#6B5E4D',
  auxCoffee: '#8E7B6B',
  lightCoffee: '#B8A999',
  lightKhaki: '#F3E8D2',
  shareZoneBg: '#FFF3D6',
  divider: '#E8E1D6',
  photoBorder: '#FFFFFF',
  tape: '#EFD9B6',
  stamp: 'rgba(216, 201, 179, 0.6)',
} as const;

export const POSTER_FONTS = {
  brand: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", serif',
  body: '"PingFang SC", "HarmonyOS Sans SC", "Noto Sans SC", sans-serif',
  hand: '"ZCOOL XiaoWei", "Ma Shan Zheng", "KaiTi", cursive',
} as const;

export const POSTER_LAYOUT = {
  headerH: 220,
  photoH: { movie: 620, story: 620, memory: 520 },
  featureH: 132,
  shareCardH: 220,
  shareCardPad: 32,
  shareCardRadius: 28,
  mascotW: 220,
} as const;

export function workTypeLabel(type: 'story' | 'memory' | 'movie'): string {
  if (type === 'movie') return '人生电影';
  if (type === 'story') return '家庭故事';
  return '家庭记忆';
}

export interface PosterFeatureItem {
  title: string;
  desc: string;
}

export function buildMovieFeatures(input: {
  chapterCount?: number;
  memoryCount?: number;
}): PosterFeatureItem[] {
  const chapters = input.chapterCount ?? 5;
  const memories = input.memoryCount ?? 4;
  return [
    { title: `${chapters} 个故事章节`, desc: '记录旅途与成长' },
    { title: `${memories} 段家庭记忆`, desc: '珍藏家人美好时光' },
    { title: '沉浸式人生电影', desc: '属于我们的回忆影片' },
  ];
}

export function buildStoryFeatures(input: { memoryCount?: number }): PosterFeatureItem[] {
  const memories = input.memoryCount ?? 0;
  return [
    { title: memories > 0 ? `${memories} 段家庭记忆` : '家庭记忆', desc: '珍藏家人美好时光' },
    { title: '念念珍藏的家庭故事', desc: '来自记忆卡的真实叙事' },
    { title: '沉浸式阅读体验', desc: '章节串联的温暖故事' },
  ];
}

export function buildInfoItems(input: {
  type: 'story' | 'memory' | 'movie';
  subtitle?: string;
  familyName?: string;
  photoCount?: number;
}): string[] {
  const items: string[] = [];
  if (input.subtitle) items.push(input.subtitle);
  if (input.photoCount && input.photoCount > 0) {
    items.push(`${input.photoCount} 段家庭记忆`);
  } else if (input.familyName) {
    items.push(input.familyName);
  }
  if (input.type === 'movie') {
    items.push('沉浸式人生电影');
  } else if (input.type === 'story') {
    items.push('念念珍藏的家庭故事');
  } else {
    items.push('一张值得被记住的瞬间');
  }
  return items.slice(0, 3);
}
