import type { MemoryCardSnapshot, Scene } from './types';
import { STORYLINE_ORDER } from './storyline-order';

const MIN_SCENES = 1;
const MAX_SCENES = 5;
const TARGET_MIN = 3;

function clusterKey(card: MemoryCardSnapshot): string {
  const sl = card.storyLayer;
  const meaning = sl.meaning || '家庭';
  const relationship = sl.relationship || '多人';
  const sceneType = sl.scene_type || '日常';
  return `${meaning}|${relationship}|${sceneType}`;
}

function sortCards(cards: MemoryCardSnapshot[]): MemoryCardSnapshot[] {
  return [...cards].sort((a, b) => {
    const ta = a.taken_at || '';
    const tb = b.taken_at || '';
    if (ta !== tb) return ta.localeCompare(tb);

    const sa = STORYLINE_ORDER[a.narrativeFrame.storyline] ?? 50;
    const sb = STORYLINE_ORDER[b.narrativeFrame.storyline] ?? 50;
    return sa - sb;
  });
}

function makeScene(id: string, cards: MemoryCardSnapshot[], label?: string): Scene {
  const sorted = sortCards(cards);
  const dominant = cards[0]?.storyLayer.meaning || cards[0]?.storyLayer.scene_type || '记忆';
  return {
    id,
    memoryCardIds: sorted.map((c) => c.photoId),
    label: label || dominant,
  };
}

function splitByTimeGap(cards: MemoryCardSnapshot[]): MemoryCardSnapshot[][] {
  if (cards.length < 4) return [cards];

  const sorted = sortCards(cards);
  let bestIdx = 1;
  let bestGap = 0;

  for (let i = 1; i < sorted.length; i++) {
    const prev = Date.parse(sorted[i - 1].taken_at || '') || 0;
    const curr = Date.parse(sorted[i].taken_at || '') || 0;
    const gap = curr - prev;
    if (gap > bestGap) {
      bestGap = gap;
      bestIdx = i;
    }
  }

  if (bestGap < 86400000 * 30) return [cards]; // 小于 30 天不切
  return [sorted.slice(0, bestIdx), sorted.slice(bestIdx)];
}

function mergeSmallestScenes(scenes: Scene[], cardsById: Map<string, MemoryCardSnapshot>): Scene[] {
  if (scenes.length <= MAX_SCENES) return scenes;

  const sorted = [...scenes].sort((a, b) => a.memoryCardIds.length - b.memoryCardIds.length);
  const a = sorted[0];
  const b = sorted.find((s) => s.id !== a.id && s.label === a.label) || sorted[1];
  if (!b) return scenes;

  const mergedIds = [...new Set([...a.memoryCardIds, ...b.memoryCardIds])];
  const mergedCards = mergedIds
    .map((id) => cardsById.get(id))
    .filter((c): c is MemoryCardSnapshot => !!c);

  const merged = makeScene(`${a.id}_${b.id}`, mergedCards, a.label);
  return scenes.filter((s) => s.id !== a.id && s.id !== b.id).concat(merged);
}

function expandScenes(scenes: Scene[], cardsById: Map<string, MemoryCardSnapshot>): Scene[] {
  let result = [...scenes];
  while (result.length < TARGET_MIN && result.some((s) => s.memoryCardIds.length >= 4)) {
    const largest = [...result].sort(
      (a, b) => b.memoryCardIds.length - a.memoryCardIds.length
    )[0];
    const cards = largest.memoryCardIds
      .map((id) => cardsById.get(id))
      .filter((c): c is MemoryCardSnapshot => !!c);
    const parts = splitByTimeGap(cards);
    if (parts.length < 2) break;

    result = result.filter((s) => s.id !== largest.id);
    for (let i = 0; i < parts.length; i++) {
      result.push(makeScene(`${largest.id}_p${i}`, parts[i], largest.label));
    }
  }
  return result;
}

/** Memory Cards → 3–5 个 Scene（规则聚类 MVP） */
export function clusterMemoryCards(cards: MemoryCardSnapshot[]): Scene[] {
  if (cards.length === 0) return [];

  const cardsById = new Map(cards.map((c) => [c.photoId, c]));
  const groups = new Map<string, MemoryCardSnapshot[]>();

  for (const card of cards) {
    const key = clusterKey(card);
    const list = groups.get(key) || [];
    list.push(card);
    groups.set(key, list);
  }

  let scenes = Array.from(groups.entries()).map(([key, groupCards], idx) =>
    makeScene(`scene_${idx}_${key.replace(/\|/g, '_')}`, groupCards, key.split('|')[0])
  );

  scenes = expandScenes(scenes, cardsById);

  while (scenes.length > MAX_SCENES) {
    const before = scenes.length;
    scenes = mergeSmallestScenes(scenes, cardsById);
    if (scenes.length === before) break;
  }

  if (scenes.length > MAX_SCENES) {
    scenes = scenes
      .sort((a, b) => b.memoryCardIds.length - a.memoryCardIds.length)
      .slice(0, MAX_SCENES);
  }

  if (scenes.length < MIN_SCENES) {
    scenes = [makeScene('scene_all', cards, '家庭记忆')];
  }

  return scenes.sort((a, b) => {
    const ca = a.memoryCardIds[0] ? cardsById.get(a.memoryCardIds[0]) : undefined;
    const cb = b.memoryCardIds[0] ? cardsById.get(b.memoryCardIds[0]) : undefined;
    return (ca?.taken_at || '').localeCompare(cb?.taken_at || '');
  });
}
