import type { MemoryCardSnapshot } from './types';

/** 选封面：importance 最高，其次人物数量 */
export function pickCoverPhoto(cards: MemoryCardSnapshot[]): string {
  if (cards.length === 0) return '';

  const sorted = [...cards].sort((a, b) => {
    const imp = b.storyLayer.importance - a.storyLayer.importance;
    if (imp !== 0) return imp;
    return b.people.length - a.people.length;
  });

  return sorted[0].photoId;
}
