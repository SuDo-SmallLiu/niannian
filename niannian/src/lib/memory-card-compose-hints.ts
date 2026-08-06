/** 人工组合故事时展示的记忆卡 AI 提示 */

export interface ComposeHintInput {
  action?: string;
  taken_at?: string;
  location?: string;
  people?: string[];
  significance?: string;
  understanding?: {
    archetype?: string;
    emotions?: string[];
  } | null;
  narrative_frame?: {
    storyline?: string;
    storylineNote?: string;
    shotType?: string;
  } | null;
  story_layer?: {
    scene_type?: string;
    meaning?: string;
    relationship?: string;
    change?: string;
    importance?: number;
  } | null;
}

export interface MemoryCardComposeHints {
  /** 一行事实：时间 · 地点 · 人物 */
  metaLine: string;
  /** 行为/动作 */
  action: string;
  /** AI 理解摘要（优先 significance / storylineNote） */
  aiHint: string;
  /** 编排标签：故事线、意义、场景等 */
  tags: string[];
}

export function getMemoryCardComposeHints(
  card: ComposeHintInput | null | undefined
): MemoryCardComposeHints {
  if (!card) {
    return { metaLine: '', action: '', aiHint: '', tags: [] };
  }

  const people = card.people?.filter(Boolean) || [];
  const metaParts = [card.taken_at, card.location, people.length ? people.join('、') : '']
    .filter(Boolean)
    .slice(0, 3);

  const tags: string[] = [];
  const nf = card.narrative_frame;
  const sl = card.story_layer;

  if (nf?.storyline) tags.push(`故事线·${nf.storyline}`);
  if (nf?.shotType) tags.push(`景别·${nf.shotType}`);
  if (sl?.meaning) tags.push(sl.meaning);
  if (sl?.scene_type) tags.push(sl.scene_type);
  if (sl?.relationship) tags.push(sl.relationship);
  if (card.understanding?.archetype) tags.push(card.understanding.archetype);

  const aiHint =
    card.significance?.trim() ||
    nf?.storylineNote?.trim() ||
    sl?.change?.trim() ||
    card.action?.trim() ||
    '';

  return {
    metaLine: metaParts.join(' · '),
    action: card.action?.trim() || '',
    aiHint,
    tags: [...new Set(tags)].slice(0, 5),
  };
}
