/**
 * 情动理论框架 — 基于 DH2012 (Liu & Peng) + Russell 环形模型
 * 适配念念年年家庭记忆场景
 *
 * 核心逻辑：视觉/场景指示词 → 情动构型 → 用户可理解的情动取向
 * 不直接把 12 个情动词作为最终输出，而是以指示词为锚点映射到 8–10 个家庭情动构型
 */

// Russell 环形模型四象限
export const AFFECT_QUADRANTS = {
  high_positive_high_arousal: { label: '高愉悦·高唤醒', valence: 'positive', arousal: 'high' },
  high_positive_low_arousal: { label: '高愉悦·低唤醒', valence: 'positive', arousal: 'low' },
  low_positive_high_arousal: { label: '低愉悦·高唤醒', valence: 'negative', arousal: 'high' },
  low_positive_low_arousal: { label: '低愉悦·低唤醒', valence: 'negative', arousal: 'low' },
} as const;

export type Valence = 'negative' | 'neutral' | 'positive';
export type Arousal = 'low' | 'medium' | 'high';

/** 家庭记忆场景的 10 个情动构型 */
export const AFFECT_ARCHETYPES = [
  {
    id: 'warm_togetherness',
    name: '温暖相依',
    quadrant: 'high_positive_low_arousal',
    description: '亲密陪伴、安静相守、被照顾与被看见',
    examples: ['牵手', '依偎', '祖孙同行', '哄睡'],
  },
  {
    id: 'celebration_joy',
    name: '欢聚庆典',
    quadrant: 'high_positive_high_arousal',
    description: '节庆、生日、婚礼等集体欢庆的高能量时刻',
    examples: ['吹蜡烛', '全家福', '举杯', '放烟花'],
  },
  {
    id: 'curious_adventure',
    name: '探索新奇',
    quadrant: 'high_positive_high_arousal',
    description: '第一次、新地方、新体验带来的兴奋与好奇',
    examples: ['第一次去海边', '旅行', '动物园', '新学校'],
  },
  {
    id: 'peaceful_serenity',
    name: '宁静安放',
    quadrant: 'high_positive_low_arousal',
    description: '日落、阅读、午睡等低唤醒的安心与满足',
    examples: ['夕阳', '读书', '熟睡', '窗边发呆'],
  },
  {
    id: 'growth_witness',
    name: '成长见证',
    quadrant: 'high_positive_high_arousal',
    description: '毕业、学会新技能、明显长大等里程碑时刻',
    examples: ['毕业典礼', '学会骑车', '身高线', '获奖'],
  },
  {
    id: 'separation_longing',
    name: '暂别思念',
    quadrant: 'low_positive_low_arousal',
    description: '离别、空位、远行的低唤醒失落与牵挂',
    examples: ['空椅子', '挥手告别', '机场送别', '空房间'],
  },
  {
    id: 'challenge_breakthrough',
    name: '挑战突破',
    quadrant: 'low_positive_high_arousal',
    description: '紧张、尝试、突破前的张力与之后的释放',
    examples: ['学走路', '第一次上台', '考试前', '学游泳'],
  },
  {
    id: 'ritual_legacy',
    name: '仪式传承',
    quadrant: 'high_positive_low_arousal',
    description: '年节、祭祖、教手艺等代际连接与根的记忆',
    examples: ['包饺子', '贴春联', '教书法', '家族聚餐'],
  },
  {
    id: 'time_echo',
    name: '岁月回响',
    quadrant: 'low_positive_low_arousal',
    description: '旧照重现、对比今昔、衰老与时光流逝的感怀',
    examples: ['同地点重拍', '老照片对比', '白发', '空 nest'],
  },
  {
    id: 'daily_warmth',
    name: '日常烟火',
    quadrant: 'high_positive_low_arousal',
    description: '做饭、吃饭、收拾等日常照料中蕴含的细水长流',
    examples: ['厨房', '餐桌', '晾衣服', '接送上学'],
  },
] as const;

/** DH2012 386 指示词的家庭场景精选子集（按类别组织，供 AI 锚定视觉证据） */
export const AFFECT_INDICATOR_CATEGORIES: Record<string, string[]> = {
  人物姿态: [
    '牵手', '拥抱', '背影', '空椅子', '全家福', '祖孙', '亲子', '对视', '挥手',
  ],
  自然光线: [
    '日落', '夕阳', '彩虹', '雪景', '雾气', '晨光', '星空', '雨天', '花开',
  ],
  场景物件: [
    '生日蛋糕', '毕业帽', '书包', '婴儿车', '轮椅', '行李箱', '奖状', '蜡烛',
    '半满的杯子', '铁门', '门槛', '餐桌', '厨房',
  ],
  空间状态: [
    '空房间', '拥挤的饭桌', '门口', '车站', '机场', '医院', '学校', '公园', '海边',
  ],
  时间痕迹: [
    '老照片', '对比照', '身高线', '日历', '时钟', '季节变换', '年轮',
  ],
};

export const ALL_AFFECT_INDICATORS = Object.values(AFFECT_INDICATOR_CATEGORIES).flat();

/** 变化层构型 — 人生/家庭阶段的转变类型 */
export const CHANGE_TYPES = [
  { id: 'first_time', name: '首次', description: '第一次经历某事', examples: ['第一次走路', '第一次去海边'] },
  { id: 'farewell', name: '告别', description: '离开、送别、结束一个阶段', examples: ['离家上学', '送别', '最后一班'] },
  { id: 'reunion', name: '重聚', description: '久别后的再次相聚', examples: ['春节团聚', '异地归来'] },
  { id: 'growing_up', name: '成长', description: '身体、能力或角色的明显变化', examples: ['明显长高', '学会独立'] },
  { id: 'legacy', name: '传承', description: '知识、习俗、情感的代际传递', examples: ['教包饺子', '讲家族故事'] },
  { id: 'fresh_start', name: '新开始', description: '搬家、康复、新工作等新篇章', examples: ['搬新家', '入职', '康复出院'] },
  { id: 'role_shift', name: '角色转换', description: '家庭角色身份的变化', examples: ['成为父母', '成为祖辈', '毕业'] },
  { id: 'daily_accumulation', name: '日常沉淀', description: '非重大事件但长期积累意义的日常', examples: ['每周家庭晚餐', '固定散步路线'] },
] as const;

export const LIFE_PHASES = [
  '婴幼儿', '童年', '少年', '青年', '成年', '长辈', '全龄',
] as const;

export interface AffectUnderstanding {
  /** 主情动构型 */
  archetype: string;
  /** 次要构型（混合情动时） */
  secondaryArchetypes?: string[];
  valence: Valence;
  arousal: Arousal;
  /** Russell 象限描述 */
  quadrant: string;
  /** 情动指示词 — 画面中的视觉/场景证据 */
  indicators: string[];
  /** 表层情绪词（辅助，非主输出） */
  emotions: string[];
  /** 推断置信度 */
  confidence: 'high' | 'medium' | 'low';
}

export interface ChangeTransition {
  /** 变化类型 ID 或名称 */
  type: string;
  /** 具体变化标记，如「第一次骑车」 */
  marker: string;
  /** 人生阶段 */
  lifePhase?: string;
  /** 情动位移，如「紧张 → 骄傲」 */
  affectShift?: string;
}

export interface ChangeDetail {
  transitions: ChangeTransition[];
  /** 一句话概括变化意义 */
  summary: string;
}

/** 构建 AI prompt 用的情动理论说明 */
export function buildAffectTheoryPrompt(): string {
  const archetypeList = AFFECT_ARCHETYPES.map(
    (a) => `- ${a.name}：${a.description}（如：${a.examples.join('、')}）`
  ).join('\n');

  const changeTypeList = CHANGE_TYPES.map(
    (c) => `- ${c.name}：${c.description}（如：${c.examples.join('、')}）`
  ).join('\n');

  const indicatorSamples = Object.entries(AFFECT_INDICATOR_CATEGORIES)
    .map(([cat, words]) => `  ${cat}：${words.slice(0, 6).join('、')}…`)
    .join('\n');

  return `
## 情动理论分析框架（参考 DH2012 + Russell 环形模型）

分析分两步，不要跳步：

### 第一步：识别情动指示词（视觉/场景证据）
先从画面中找出具体的视觉、物件、姿态、光线、空间线索——这些是指向情动的「证据」，不是情绪词本身。
参考类别：
${indicatorSamples}

### 第二步：映射到情动构型
根据指示词，推断 1 个主情动构型（可附 1 个次要构型），并给出 Russell 维度：
- valence（效价）：negative / neutral / positive
- arousal（唤醒）：low / medium / high
- quadrant（象限）：如「高愉悦·低唤醒」

可选情动构型：
${archetypeList}

### 变化层分析
识别照片标记的人生/家庭转变（可多个）：
${changeTypeList}

人生阶段：${LIFE_PHASES.join('、')}

每个变化需给出：
- type：变化类型名称
- marker：具体变化描述（如「第一次独自上学」）
- lifePhase：涉及的人生阶段（可选）
- affectShift：情动位移（如「不安 → 骄傲」，可选）

注意：
- 指示词要来自画面可见内容，不要编造
- 情动构型是最终输出，表层情绪词（emotions）仅作辅助
- 没有明显变化时 transitions 可为空数组
- 不确定时 confidence 设为 low，并在 significance 中说明`;
}

export function normalizeUnderstanding(raw: Record<string, unknown>): AffectUnderstanding {
  return {
    archetype: (raw.archetype as string) || '日常烟火',
    secondaryArchetypes: (raw.secondaryArchetypes as string[]) || [],
    valence: (['negative', 'neutral', 'positive'].includes(raw.valence as string)
      ? raw.valence
      : 'neutral') as Valence,
    arousal: (['low', 'medium', 'high'].includes(raw.arousal as string)
      ? raw.arousal
      : 'medium') as Arousal,
    quadrant: (raw.quadrant as string) || '',
    indicators: (raw.indicators as string[]) || [],
    emotions: (raw.emotions as string[]) || [],
    confidence: (['high', 'medium', 'low'].includes(raw.confidence as string)
      ? raw.confidence
      : 'medium') as 'high' | 'medium' | 'low',
  };
}

export function normalizeChangeDetail(raw: Record<string, unknown>): ChangeDetail {
  const transitions = ((raw.transitions as ChangeTransition[]) || []).map((t) => ({
    type: t.type || '',
    marker: t.marker || '',
    lifePhase: t.lifePhase,
    affectShift: t.affectShift,
  }));
  return {
    transitions,
    summary: (raw.summary as string) || transitions.map((t) => t.marker).join('；') || '',
  };
}
