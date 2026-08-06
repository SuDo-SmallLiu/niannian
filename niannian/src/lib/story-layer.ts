/** Story Layer — 供 Life Story Engine 聚类与选片 */

export const SCENE_TYPES = [
  '尝试',
  '成长',
  '陪伴',
  '告别',
  '庆祝',
  '探索',
  '日常',
] as const;

export const RELATIONSHIPS = [
  '父亲',
  '母亲',
  '祖孙',
  '夫妻',
  '兄弟',
  '朋友',
  '自己',
  '多人',
] as const;

export const MEANINGS = [
  '成长',
  '勇气',
  '责任',
  '陪伴',
  '传承',
  '梦想',
  '家庭',
  '爱',
] as const;

export interface StoryLayer {
  scene_type: string;
  change: string;
  relationship: string;
  meaning: string;
  /** 1–5，越高越优先进入 Story / 封面候选 */
  importance: number;
}

export function normalizeStoryLayer(raw: unknown): StoryLayer {
  const empty: StoryLayer = {
    scene_type: '',
    change: '',
    relationship: '',
    meaning: '',
    importance: 3,
  };
  if (!raw || typeof raw !== 'object') return empty;

  const o = raw as Record<string, unknown>;
  let importance = Number(o.importance);
  if (!Number.isFinite(importance) || importance < 1) importance = 3;
  if (importance > 5) importance = 5;

  return {
    scene_type: String(o.scene_type || o.sceneType || '').trim(),
    change: String(o.change || o.changeArc || '').trim(),
    relationship: String(o.relationship || '').trim(),
    meaning: String(o.meaning || '').trim(),
    importance: Math.round(importance),
  };
}

/** 旧记忆卡无 story_layer 时，从 narrative_frame / understanding 推断 */
export function inferStoryLayer(input: {
  storyLayer?: StoryLayer | null;
  narrativeFrame?: { storyline?: string; storylineNote?: string };
  understanding?: { archetype?: string; emotions?: string[] };
  changeDetail?: { summary?: string; transitions?: Array<{ type?: string }> };
  significance?: string;
  people?: string[];
}): StoryLayer {
  const base = normalizeStoryLayer(input.storyLayer);
  if (base.meaning && base.scene_type) return base;

  const storyline = input.narrativeFrame?.storyline || '';
  const archetype = input.understanding?.archetype || '';
  const changeSummary =
    input.changeDetail?.summary ||
    input.changeDetail?.transitions?.map((t) => t.type).filter(Boolean).join('→') ||
    '';

  const scene_type =
    base.scene_type ||
    (storyline === '探索' ? '探索' : storyline === '告别' ? '告别' : storyline === '纪念' ? '庆祝' : '日常');

  const meaning =
    base.meaning ||
    (input.significance?.includes('成长') ? '成长' : '') ||
    (archetype.includes('成长') ? '成长' : '') ||
    '陪伴';

  const relationship =
    base.relationship ||
    (input.people && input.people.length >= 3
      ? '多人'
      : input.people?.some((p) => /爷|奶|外公|外婆|祖/.test(p))
        ? '祖孙'
        : input.people?.some((p) => /爸|父/.test(p))
          ? '父亲'
          : input.people?.some((p) => /妈|母/.test(p))
            ? '母亲'
            : '家人');

  return {
    scene_type,
    change: base.change || changeSummary,
    relationship,
    meaning,
    importance: base.importance || 3,
  };
}

export function buildStoryLayerPrompt(): string {
  return `
Story Layer（storyLayer）— 供故事引擎聚类，与 narrativeFrame 配合：
- scene_type（场景类型，选一）：${SCENE_TYPES.join('、')}
- change（变化弧线，如：不会→学会、陌生→熟悉、依赖→独立）
- relationship（核心关系，选一）：${RELATIONSHIPS.join('、')}
- meaning（意义主题，选一）：${MEANINGS.join('、')}
- importance（1–5 整数）：这张照片进入家庭故事的重要程度，5 最高`;
}
