import type { MemoryCardSnapshot, ThemeResult } from './types';

function countField(cards: MemoryCardSnapshot[], pick: (c: MemoryCardSnapshot) => string): string {
  const counts = new Map<string, number>();
  for (const card of cards) {
    const v = pick(card).trim();
    if (!v) continue;
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  let best = '';
  let max = 0;
  for (const [k, n] of counts) {
    if (n > max) {
      max = n;
      best = k;
    }
  }
  return best;
}

function buildTitleCandidates(
  theme: string,
  relationship: string,
  change: string,
  cards: MemoryCardSnapshot[]
): string[] {
  const candidates = new Set<string>();
  if (change && change.includes('→')) {
    const [from, to] = change.split('→').map((s) => s.trim());
    if (from && to) candidates.add(`从${from}到${to}`);
  }
  if (relationship && theme) {
    candidates.add(`${relationship}与${theme}`);
  }
  if (theme) {
    candidates.add(`${theme}的故事`);
    candidates.add(`那些${theme}的时刻`);
  }
  const action = cards.find((c) => c.action)?.action;
  if (action && action.length <= 12) {
    candidates.add(`我们一起${action.replace(/[。！？]/g, '')}`);
  }
  candidates.add('家人之间的温度');
  return Array.from(candidates).slice(0, 3);
}

/** Scene → 主题 + 标题候选（规则 MVP，后续可换 AI） */
export function deriveTheme(cards: MemoryCardSnapshot[]): ThemeResult {
  const meaning = countField(cards, (c) => c.storyLayer.meaning);
  const sceneType = countField(cards, (c) => c.storyLayer.scene_type);
  const relationship = countField(cards, (c) => c.storyLayer.relationship);
  const change = countField(cards, (c) => c.storyLayer.change);

  const theme = meaning || sceneType || '陪伴';
  const titleCandidates = buildTitleCandidates(theme, relationship, change, cards);

  return { theme, titleCandidates };
}
