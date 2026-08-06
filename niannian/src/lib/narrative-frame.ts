/** 叙事层：故事线 + 镜头语言，供 Life Story Engine 聚类与编排 */

export const STORYLINE_ROLES = [
  '铺垫',
  '日常',
  '陪伴',
  '探索',
  '转折',
  '高潮',
  '告别',
  '余韵',
  '纪念',
] as const;

export const SHOT_TYPES = [
  '特写',
  '中景',
  '全景',
  '合影',
  '自拍',
  '抓拍',
  '空镜',
  '远景',
] as const;

export interface NarrativeFrame {
  /** 故事线角色：在更大叙事中的功能位 */
  storyline: string;
  /** 组合成故事时的叙事提示（一句话） */
  storylineNote: string;
  /** 景别/镜头类型 */
  shotType: string;
  /** 镜头语言描述：构图、视角、画面张力 */
  shotNote: string;
  /** 可检索标签，如：面向镜头、多人同框、留白 */
  shotTags: string[];
}

export function normalizeNarrativeFrame(raw: unknown): NarrativeFrame {
  const empty: NarrativeFrame = {
    storyline: '',
    storylineNote: '',
    shotType: '',
    shotNote: '',
    shotTags: [],
  };
  if (!raw || typeof raw !== 'object') return empty;

  const o = raw as Record<string, unknown>;
  const shotTags = Array.isArray(o.shotTags)
    ? o.shotTags.map(String).filter(Boolean)
    : [];

  return {
    storyline: String(o.storyline || o.storyLine || o.role || '').trim(),
    storylineNote: String(o.storylineNote || o.storyline_hint || o.narrativeHint || '').trim(),
    shotType: String(o.shotType || o.shot_type || o.framing || '').trim(),
    shotNote: String(o.shotNote || o.shot_note || o.cinematic || '').trim(),
    shotTags,
  };
}

export function buildNarrativeFramePrompt(): string {
  return `
叙事层（narrativeFrame）— 为后续 Life Story Engine 聚类与编排服务：
- storyline（故事线角色，选一）：${STORYLINE_ROLES.join('、')}
- storylineNote：若把多张照片剪成故事，这张承担什么叙事功能（一句话）
- shotType（景别，选一）：${SHOT_TYPES.join('、')}
- shotNote：镜头语言描述（构图、视角、人物在画面中的位置与张力）
- shotTags：2–4 个镜头标签，如「面向镜头」「多人同框」「自然光」「抓拍感」`;
}
