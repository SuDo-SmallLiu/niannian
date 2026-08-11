/** 分享海报设计令牌 — 750×1334 移动端 9:16 */
export const POSTER_W = 750;
export const POSTER_H = 1334;

export const POSTER_COLORS = {
  bg: '#FFF9F0',
  card: '#FFFDF9',
  brandYellow: '#F6B51B',
  brandOrange: '#DF8B3A',
  darkCoffee: '#4A3326',
  auxCoffee: '#8E7B6B',
  lightCoffee: '#B8A999',
  shareZoneBg: 'rgba(246, 181, 27, 0.12)',
  divider: 'rgba(184, 169, 153, 0.45)',
  photoBorder: '#FFFDF9',
  tape: 'rgba(223, 139, 58, 0.35)',
} as const;

export const POSTER_FONTS = {
  brand: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", serif',
  body: '"PingFang SC", "HarmonyOS Sans SC", "Noto Sans SC", sans-serif',
  hand: '"ZCOOL XiaoWei", "Ma Shan Zheng", "KaiTi", cursive',
} as const;

export function workTypeLabel(type: 'story' | 'memory' | 'movie'): string {
  if (type === 'movie') return '人生电影';
  if (type === 'story') return '家庭故事';
  return '家庭记忆';
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
