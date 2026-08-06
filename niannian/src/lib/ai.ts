import { type PhotoSourceFacts, buildSourceFactsPrompt } from '@/lib/google-photos-metadata';
import {
  type AffectUnderstanding,
  type ChangeDetail,
  buildAffectTheoryPrompt,
  normalizeUnderstanding,
  normalizeChangeDetail,
} from '@/lib/affect-theory';
import {
  type NarrativeFrame,
  buildNarrativeFramePrompt,
  normalizeNarrativeFrame,
} from '@/lib/narrative-frame';
import {
  type StoryLayer,
  buildStoryLayerPrompt,
  normalizeStoryLayer,
} from '@/lib/story-layer';
import { AiServiceError, formatAiError } from '@/lib/ai-errors';
import { chatWithKeyAndModelFallback, extractAssistantText, extractJsonBlob, getApiKeyChain, getTextModelChain, getVisionModelChain } from '@/lib/ai-model-fallback';

export { AiServiceError } from '@/lib/ai-errors';

export function isAiConfigured(): boolean {
  return getApiKeyChain().length > 0;
}

// 模型链：主模型额度用尽时自动尝试备用（见 ARK_*_MODEL_FALLBACKS）
const VISION_MODELS = getVisionModelChain();
const TEXT_MODELS = getTextModelChain();

// ============================================================
// Step 1: 图片理解 — AI提取人物、场景、行为、时间
// ============================================================

export interface PhotoAnalysis {
  people: string[];
  scene: string;
  action: string;
  time: string;
  tags: string[];
  /** @deprecated 使用 understanding.emotions，保留兼容 */
  emotions: string[];
  /** @deprecated 使用 changeDetail，保留兼容 */
  changes: string[];
  significance: string;
  /** 情动理论 — 理解层 */
  understanding: AffectUnderstanding;
  /** 情动理论 — 变化层 */
  changeDetail: ChangeDetail;
  /** 叙事层 — 故事线 + 镜头语言（供 Story Engine 聚类编排） */
  narrativeFrame: NarrativeFrame;
  /** Story Layer — 聚类语义字段 */
  storyLayer: StoryLayer;
  layeredTags: {
    objective: Array<{ key: string; value: string }>;
    behavior: Array<{ key: string; value: string }>;
    change: Array<{ key: string; value: string }>;
    family_value: Array<{ key: string; value: string }>;
  };
}

export interface UserSupplementContext {
  userNotes: string;
  voiceTranscript: string;
  questions: Array<{ question: string; answer: string }>;
}

function buildSupplementPrompt(supplement: UserSupplementContext): string {
  const parts: string[] = ['\n\n## 用户补充信息（请优先采信，用于修正 AI 推测）'];
  if (supplement.userNotes) {
    parts.push(`- 用户文字补充：${supplement.userNotes}`);
  }
  if (supplement.voiceTranscript) {
    parts.push(`- 用户语音转写：${supplement.voiceTranscript}`);
  }
  for (const qa of supplement.questions) {
    if (qa.answer) {
      parts.push(`- 问：${qa.question}\n  答：${qa.answer}`);
    }
  }
  if (parts.length === 1) return '';
  parts.push('\n请结合用户补充，修正事实层（人物/时间/地点/动作）和理解层（情动构型/变化），用户明确说过的信息优先于视觉推测。');
  return parts.join('\n');
}

export async function analyzePhoto(
  imageBase64: string,
  sourceFacts?: PhotoSourceFacts,
  supplement?: UserSupplementContext,
  options?: { allowDemo?: boolean; mimeType?: string; familyName?: string }
): Promise<PhotoAnalysis> {
  if (!isAiConfigured()) {
    if (options?.allowDemo !== false) {
      console.warn('⚠️ 演示模式：返回样例数据（未配置 ARK_API_KEY）');
      return getMockPhotoAnalysis(sourceFacts);
    }
    throw new AiServiceError('未配置 ARK_API_KEY，无法调用 AI 解析');
  }

  const mimeType = options?.mimeType || 'image/jpeg';

  const sourceContext = sourceFacts ? `\n\n${buildSourceFactsPrompt(sourceFacts)}\n` : '';
  const familyContext = options?.familyName
    ? `\n\n相册名称：${options.familyName}（可作为关系线索；画面与用户补充优先，勿编造亲属关系）`
    : '';

  const affectPrompt = buildAffectTheoryPrompt();

  const supplementContext = supplement ? buildSupplementPrompt(supplement) : '';
  const useCompactPrompt = (process.env.ARK_BASE_URL || '').includes('cucloud');

  const prompt = useCompactPrompt
    ? `分析这张照片，生成记忆卡。${familyContext}${sourceContext}${supplementContext}
只返回JSON（人物用简短中文，不确定关系时用外貌描述，不要编造爷爷/爸爸等）：
{"people":[],"scene":"","action":"","time":"","tags":[],"understanding":{"archetype":"","valence":"positive","arousal":"medium","quadrant":"","indicators":[],"emotions":[],"confidence":"medium"},"changeDetail":{"transitions":[],"summary":""},"significance":"","narrativeFrame":{"storyline":"","storylineNote":"","shotType":"","shotNote":"","shotTags":[]},"storyLayer":{"scene_type":"","change":"","relationship":"","meaning":"","importance":3},"layeredTags":{"objective":[],"behavior":[],"change":[],"family_value":[]}}`
    : `你是一位家庭记忆整理师，熟悉情动理论（DH2012 + Russell 环形模型）。
请分析这张照片，生成一张「记忆卡」。
${familyContext}${sourceContext}${supplementContext}
${affectPrompt}
${buildNarrativeFramePrompt()}
${buildStoryLayerPrompt()}

请以JSON格式返回（只返回JSON，不要其他内容）：
{
  "people": ["人物1", "人物2"],
  "scene": "地点/场景",
  "action": "行为描述",
  "time": "估计的时间，不确定填"未知"",
  "tags": ["标签1", "标签2"],
  "understanding": {
    "archetype": "主情动构型名称，如：温暖相依",
    "secondaryArchetypes": ["次要构型，可选"],
    "valence": "negative|neutral|positive",
    "arousal": "low|medium|high",
    "quadrant": "如：高愉悦·低唤醒",
    "indicators": ["画面中的情动指示词，如：牵手、日落、生日蛋糕"],
    "emotions": ["表层情绪词，辅助用，如：开心、放松"],
    "confidence": "high|medium|low"
  },
  "changeDetail": {
    "transitions": [
      {
        "type": "变化类型，如：首次",
        "marker": "具体变化，如：第一次独自上学",
        "lifePhase": "童年",
        "affectShift": "紧张 → 骄傲"
      }
    ],
    "summary": "一句话概括这张照片标记的变化意义"
  },
  "significance": "一句话说明这张照片值得记住的原因",
  "narrativeFrame": {
    "storyline": "故事线角色，如：陪伴",
    "storylineNote": "组合成故事时的叙事功能，一句话",
    "shotType": "景别，如：中景",
    "shotNote": "镜头语言描述",
    "shotTags": ["面向镜头", "自然光"]
  },
  "storyLayer": {
    "scene_type": "陪伴",
    "change": "陌生→熟悉",
    "relationship": "父亲",
    "meaning": "陪伴",
    "importance": 4
  },
  "layeredTags": {
    "objective": [{"key": "人物", "value": "爸爸"}, {"key": "地点", "value": "杭州"}],
    "behavior": [{"key": "行为", "value": "一起吃冰淇淋"}],
    "change": [{"key": "变化", "value": "首次"}, {"key": "阶段", "value": "童年"}],
    "family_value": [{"key": "主题", "value": "爱与滋养"}]
  }
}

四层标签说明：
1. objective（客观）：人物、时间、地点
2. behavior（行为）：拥抱、骑车、旅行、做饭等
3. change（变化）：变化类型 + 人生阶段 + 情动位移（从 changeDetail 提取）
4. family_value（主题价值）：爱与滋养、冒险成长、创造玩乐、传承根基

注意：不确定的信息标注"未知"或"可能"，不要编造。
人物识别规则：
- 无法确认身份时，用外貌/年龄段描述（如「中年男性」「穿红裙的女孩」），不要臆测「爷爷/孙子/爸爸」等亲属关系
- 只有画面或用户补充明确显示关系时，才使用具体称呼
- 人物数量以画面实际为准，不要凑典型家庭组合`;

  try {
    const { response } = await chatWithKeyAndModelFallback(VISION_MODELS, {
      messages: [
        {
          role: 'system',
          content: '你是家庭记忆整理师。只输出合法 JSON，不要输出思考过程或 markdown。',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }, { kind: 'vision' });

    const text = extractAssistantText(response.choices[0]?.message || {});
    const jsonBlob = extractJsonBlob(text) || text.match(/\{[\s\S]*\}/)?.[0];
    if (jsonBlob) {
      try {
        const result = JSON.parse(jsonBlob);
        return normalizePhotoAnalysis(result);
      } catch (parseErr) {
        console.error('JSON 解析失败，原始片段:', jsonBlob.slice(0, 300), parseErr);
      }
    }
    throw new AiServiceError('AI 返回格式无效，请重试');
  } catch (error) {
    if (error instanceof AiServiceError) throw error;
    console.error('图片分析失败:', error);
    throw formatAiError(error);
  }
}

function normalizeTagItems(items: unknown): Array<{ key: string; value: string }> {
  if (!Array.isArray(items)) return [];
  const normalized: Array<{ key: string; value: string }> = [];
  for (const item of items) {
    if (typeof item === 'string' && item.trim()) {
      normalized.push({ key: '标签', value: item.trim() });
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const value = String(row.value || row.name || row.text || row.label || '').trim();
    if (!value) continue;
    const key = String(row.key || row.type || row.category || '标签').trim() || '标签';
    normalized.push({ key, value });
  }
  return normalized;
}

function normalizePeople(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => {
    if (typeof p === 'string') return p;
    if (p && typeof p === 'object') {
      const o = p as Record<string, unknown>;
      const parts = [o.name, o.role, o.appearance, o.description].filter(
        (v) => typeof v === 'string' && v.trim()
      ) as string[];
      return parts[0] || parts.join('·') || '未知人物';
    }
    return String(p);
  });
}

function normalizePhotoAnalysis(result: Record<string, unknown>): PhotoAnalysis {
  const layeredRaw = (result.layeredTags || {}) as Record<string, unknown>;
  const layered = {
    objective: normalizeTagItems(layeredRaw.objective),
    behavior: normalizeTagItems(layeredRaw.behavior),
    change: normalizeTagItems(layeredRaw.change),
    family_value: normalizeTagItems(layeredRaw.family_value),
  };
  const understanding = normalizeUnderstanding(
    (result.understanding as Record<string, unknown>) || {
      emotions: result.emotions,
    }
  );
  const changeDetail = normalizeChangeDetail(
    (result.changeDetail as Record<string, unknown>) || {
      transitions: ((result.changes as string[]) || []).map((c) => ({ type: c, marker: c })),
    }
  );
  const narrativeFrame = normalizeNarrativeFrame(result.narrativeFrame);
  const storyLayer = normalizeStoryLayer(result.storyLayer);

  // 从 changeDetail 补充第三层标签
  const changeTags = [...(layered.change || [])];
  for (const t of changeDetail.transitions) {
    if (t.type && !changeTags.some((tag) => tag.value === t.type)) {
      changeTags.push({ key: '变化', value: t.type });
    }
    if (t.lifePhase && !changeTags.some((tag) => tag.value === t.lifePhase)) {
      changeTags.push({ key: '阶段', value: t.lifePhase });
    }
    if (t.affectShift && !changeTags.some((tag) => tag.value === t.affectShift)) {
      changeTags.push({ key: '情动位移', value: t.affectShift });
    }
  }

  // 从 understanding 补充情动指示词到 tags（便于筛选）
  const flatTags = (result.tags as string[]) || [];
  for (const indicator of understanding.indicators) {
    if (!flatTags.includes(indicator)) flatTags.push(indicator);
  }
  for (const tag of narrativeFrame.shotTags) {
    if (!flatTags.includes(tag)) flatTags.push(tag);
  }

  return {
    people: normalizePeople(result.people),
    scene: (result.scene as string) || '未知',
    action: (result.action as string) || '未知',
    time: (result.time as string) || '未知',
    tags: flatTags,
    emotions: understanding.emotions.length > 0
      ? understanding.emotions
      : ((result.emotions as string[]) || []),
    changes: changeDetail.transitions.map((t) => t.marker || t.type).filter(Boolean),
    significance: (result.significance as string) || changeDetail.summary || '',
    understanding,
    changeDetail,
    narrativeFrame,
    storyLayer,
    layeredTags: {
      objective: layered.objective,
      behavior: layered.behavior,
      change: changeTags,
      family_value: layered.family_value,
    },
  };
}

// ============================================================
// Sprint 2: AI 提问 + 结合用户补充
// ============================================================

export interface PhotoQuestionContext {
  people: string[];
  location: string;
  action: string;
  significance: string;
  archetype?: string;
  userNotes?: string;
}

const DEFAULT_QUESTION_POOL = [
  '这张照片里发生了什么？',
  '你为什么会拍下这一瞬间？',
  '后来发生了什么？',
  '当时在场的人都有谁？',
  '这张照片对你意味着什么？',
  '有什么画面里看不出来、但你想记住的细节？',
];

function pickRandomQuestions(count: number): string[] {
  const shuffled = [...DEFAULT_QUESTION_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function generatePhotoQuestions(
  context: PhotoQuestionContext
): Promise<Array<{ question: string }>> {
  const count = 2 + Math.floor(Math.random() * 2); // 2–3

  if (!isAiConfigured()) {
    return pickRandomQuestions(count).map((question) => ({ question }));
  }

  const prompt = `你是一位家庭记忆整理师。根据以下照片 AI 解析摘要，生成 ${count} 个引导用户补充记忆的问题。
问题要具体、温暖、易回答，帮助挖掘照片背后 AI 看不到的故事。

照片摘要：
- 人物：${context.people.join('、') || '未知'}
- 地点：${context.location || '未知'}
- 动作：${context.action || '未知'}
- 意义：${context.significance || '未知'}
${context.archetype ? `- 情动构型：${context.archetype}` : ''}
${context.userNotes ? `- 用户已补充：${context.userNotes}` : ''}

请以 JSON 数组返回（只返回 JSON）：
[{"question": "问题1"}, {"question": "问题2"}]

要求：
- 每个问题一句话，口语化
- 不要重复问同一件事
- 不要问拍摄时间、地点、人物（页面已有固定引导）
- 优先问「发生了什么」「为什么拍」「后来怎样」类问题`;

  try {
    const { response } = await chatWithKeyAndModelFallback(TEXT_MODELS, {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.8,
    }, { kind: 'text' });

    const text = extractAssistantText(response.choices[0]?.message || {});
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const items = JSON.parse(jsonMatch[0]) as Array<{ question: string }>;
      return items.filter((q) => q.question).slice(0, 3);
    }
  } catch (error) {
    console.error('生成提问失败:', error);
  }

  return pickRandomQuestions(count).map((question) => ({ question }));
}

// ============================================================
// Step 2: 建立照片关系 — 寻找共同人物
// ============================================================

export interface PhotoRelation {
  person: string;
  photoIds: string[];
  count: number;
}

export function buildPhotoRelations(
  photos: Array<{ id: string; people: string[] }>
): PhotoRelation[] {
  const personMap = new Map<string, string[]>();

  for (const photo of photos) {
    for (const person of photo.people) {
      if (!personMap.has(person)) {
        personMap.set(person, []);
      }
      personMap.get(person)!.push(photo.id);
    }
  }

  const relations: PhotoRelation[] = [];
  for (const [person, photoIds] of personMap.entries()) {
    if (photoIds.length >= 2) {
      relations.push({ person, photoIds, count: photoIds.length });
    }
  }

  return relations.sort((a, b) => b.count - a.count);
}

// ============================================================
// Step 3: 生成故事标签 — "动词电影"逻辑
// ============================================================

export interface StoryOutput {
  title: string;
  timeline: Array<{ year: string; event: string }>;
  emotionSummary: string;
  connectionAction: string;
}

export async function generateFamilyStory(
  familyName: string,
  members: string[],
  photos: Array<{
    id: string;
    people: string[];
    scene: string;
    action: string;
    time: string;
    tags: string[];
    significance?: string;
    userNotes?: string;
    narrativeFrame?: import('@/lib/narrative-frame').NarrativeFrame | null;
  }>,
  relations: PhotoRelation[]
): Promise<StoryOutput> {
  if (!isAiConfigured()) {
    return getMockStory(familyName, members, photos, relations);
  }

  // 构建照片摘要
  const photoSummaries = photos
    .map((p, i) => {
      const extras = [
        p.significance ? `意义"${p.significance}"` : '',
        p.userNotes ? `用户补充"${p.userNotes}"` : '',
        p.narrativeFrame?.storyline ? `故事线"${p.narrativeFrame.storyline}"` : '',
        p.narrativeFrame?.shotType ? `景别"${p.narrativeFrame.shotType}"` : '',
        p.narrativeFrame?.shotNote ? `镜头"${p.narrativeFrame.shotNote}"` : '',
      ]
        .filter(Boolean)
        .join('，');
      const suffix = extras ? `，${extras}` : '';
      return `照片${i + 1}：人物[${p.people.join('、')}]，场景"${p.scene}"，行为"${p.action}"，时间"${p.time}"，标签[${p.tags.join('、')}]${suffix}`;
    })
    .join('\n');

  // 构建人物关系摘要
  const relationSummary = relations
    .map((r) => `${r.person}出现在${r.count}张照片中`)
    .join('；');

  const prompt = `你是一名家庭记忆整理师。
你的任务不是简单描述照片，而是发现照片背后的家庭关系与情感连接。

家庭名称：${familyName}
家庭成员：${members.join('、')}

照片分析结果：
${photoSummaries}

人物出现频率：
${relationSummary || '暂无明显的共同人物关系'}

请以JSON格式生成一个家庭记忆故事（只返回JSON，不要其他内容）：

{
  "title": "故事标题",
  "timeline": [
    {"year": "年份", "event": "事件描述"}
  ],
  "emotionSummary": "情感总结段落（100字以内）",
  "connectionAction": "连接建议（例如：这张照片已经过去X年，可以分享给XX，问问他还记不记得那一天。）"
}

要求：
1. 标题使用"从A到B"或"我们一起……"的句式，有温度不夸张
2. 时间线按年份排列，每个事件一句话
3. 情感总结要有真实感，不说空话
4. 连接建议必须具体、可执行，指向某个家庭成员
5. 不确定的信息不要编造
6. 不要夸张，不要煽情过度`;

  try {
    const { response } = await chatWithKeyAndModelFallback(TEXT_MODELS, {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.8,
    }, { kind: 'text' });

    const text = extractAssistantText(response.choices[0]?.message || {});
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        title: result.title || `${familyName}的故事`,
        timeline: result.timeline || [],
        emotionSummary:
          result.emotionSummary || '这些照片记录了一家人珍贵的回忆。',
        connectionAction:
          result.connectionAction || '可以把这些故事分享给家人，一起回忆美好时光。',
      };
    }
  } catch (error) {
    console.error('故事生成失败:', error);
  }

  return getMockStory(familyName, members, photos, relations);
}

// ============================================================
// 演示模式模拟数据
// ============================================================

function getMockPhotoAnalysis(sourceFacts?: PhotoSourceFacts): PhotoAnalysis {
  const mocks: PhotoAnalysis[] = [
    {
      people: ['爷爷', '孙子'],
      scene: '公园',
      action: '牵手散步',
      time: '2020年秋天',
      tags: ['温馨', '陪伴', '成长', '牵手', '祖孙'],
      emotions: ['安心', '亲密'],
      changes: ['陪伴成长'],
      significance: '祖孙俩在公园牵手的日常瞬间，记录了无声的陪伴。',
      understanding: {
        archetype: '温暖相依',
        valence: 'positive',
        arousal: 'low',
        quadrant: '高愉悦·低唤醒',
        indicators: ['牵手', '祖孙', '公园'],
        emotions: ['安心', '亲密'],
        confidence: 'high',
      },
      changeDetail: {
        transitions: [{ type: '日常沉淀', marker: '陪伴成长', lifePhase: '童年' }],
        summary: '日常陪伴中积累的成长记忆',
      },
      layeredTags: {
        objective: [{ key: '人物', value: '爷爷' }, { key: '人物', value: '孙子' }, { key: '地点', value: '公园' }],
        behavior: [{ key: '行为', value: '牵手散步' }],
        change: [{ key: '变化', value: '日常沉淀' }, { key: '阶段', value: '童年' }],
        family_value: [{ key: '主题', value: '爱与滋养' }],
      },
      narrativeFrame: {
        storyline: '陪伴',
        storylineNote: '可作为成长故事中的安静陪伴段落',
        shotType: '中景',
        shotNote: '祖孙并肩行走，人物与背景均衡，情绪内敛',
        shotTags: ['牵手', '自然光', '背影感'],
      },
      storyLayer: {
        scene_type: '陪伴',
        change: '依赖→独立',
        relationship: '祖孙',
        meaning: '陪伴',
        importance: 4,
      },
    },
    {
      people: ['全家'],
      scene: '家中客厅',
      action: '春节团聚',
      time: '2023年春节',
      tags: ['团聚', '幸福', '传统', '全家福', '餐桌'],
      emotions: ['温暖', '喜悦'],
      changes: ['重聚'],
      significance: '一家人围坐在一起的春节时刻，是传承根基的见证。',
      understanding: {
        archetype: '仪式传承',
        secondaryArchetypes: ['欢聚庆典'],
        valence: 'positive',
        arousal: 'medium',
        quadrant: '高愉悦·低唤醒',
        indicators: ['全家福', '餐桌', '春节'],
        emotions: ['温暖', '喜悦'],
        confidence: 'high',
      },
      changeDetail: {
        transitions: [{ type: '重聚', marker: '春节团聚', lifePhase: '全龄', affectShift: '思念 → 团圆' }],
        summary: '久别后的春节重聚，标记家庭团圆时刻',
      },
      layeredTags: {
        objective: [{ key: '人物', value: '全家' }, { key: '地点', value: '家中' }, { key: '时间', value: '2023年春节' }],
        behavior: [{ key: '行为', value: '团聚' }],
        change: [{ key: '变化', value: '重聚' }, { key: '情动位移', value: '思念 → 团圆' }],
        family_value: [{ key: '主题', value: '传承根基' }],
      },
      narrativeFrame: {
        storyline: '高潮',
        storylineNote: '团圆主题故事的情感高点镜头',
        shotType: '全景',
        shotNote: '多人同框，画面信息丰富，节庆氛围集中',
        shotTags: ['合影', '多人同框', '室内光'],
      },
      storyLayer: {
        scene_type: '庆祝',
        change: '分散→团圆',
        relationship: '多人',
        meaning: '传承',
        importance: 5,
      },
    },
    {
      people: ['妈妈', '孩子'],
      scene: '海边',
      action: '一起玩沙子',
      time: '2021年夏天',
      tags: ['快乐', '亲子', '旅行', '海边', '第一次'],
      emotions: ['兴奋', '自由'],
      changes: ['第一次去海边'],
      significance: '孩子第一次在海边玩沙子，是冒险成长的开始。',
      understanding: {
        archetype: '探索新奇',
        valence: 'positive',
        arousal: 'high',
        quadrant: '高愉悦·高唤醒',
        indicators: ['海边', '亲子', '沙滩'],
        emotions: ['兴奋', '自由'],
        confidence: 'high',
      },
      changeDetail: {
        transitions: [{ type: '首次', marker: '第一次去海边', lifePhase: '童年', affectShift: '好奇 → 兴奋' }],
        summary: '孩子第一次接触大海的冒险时刻',
      },
      layeredTags: {
        objective: [{ key: '人物', value: '妈妈' }, { key: '人物', value: '孩子' }, { key: '地点', value: '海边' }],
        behavior: [{ key: '行为', value: '玩沙子' }, { key: '行为', value: '旅行' }],
        change: [{ key: '变化', value: '首次' }, { key: '阶段', value: '童年' }],
        family_value: [{ key: '主题', value: '冒险成长' }],
      },
      narrativeFrame: {
        storyline: '探索',
        storylineNote: '旅行/第一次类故事的开场或发展镜头',
        shotType: '全景',
        shotNote: '环境占比较大，人物互动居中，空间感强',
        shotTags: ['户外', '亲子', '广角感'],
      },
      storyLayer: {
        scene_type: '探索',
        change: '陌生→熟悉',
        relationship: '母亲',
        meaning: '成长',
        importance: 4,
      },
    },
    {
      people: ['爸爸', '孩子'],
      scene: '户外',
      action: '教骑车',
      time: '2022年春天',
      tags: ['成长', '父爱', '陪伴', '自行车'],
      emotions: ['紧张', '期待', '骄傲'],
      changes: ['第一次骑车', '长大'],
      significance: '爸爸教孩子骑车的瞬间，标志着独立成长的里程碑。',
      understanding: {
        archetype: '挑战突破',
        secondaryArchetypes: ['成长见证'],
        valence: 'positive',
        arousal: 'high',
        quadrant: '低愉悦·高唤醒',
        indicators: ['自行车', '亲子', '户外'],
        emotions: ['紧张', '期待', '骄傲'],
        confidence: 'high',
      },
      changeDetail: {
        transitions: [
          { type: '首次', marker: '第一次骑车', lifePhase: '童年', affectShift: '紧张 → 骄傲' },
          { type: '成长', marker: '学会独立', lifePhase: '童年' },
        ],
        summary: '从依赖到独立的成长里程碑',
      },
      layeredTags: {
        objective: [{ key: '人物', value: '爸爸' }, { key: '人物', value: '孩子' }, { key: '地点', value: '户外' }],
        behavior: [{ key: '行为', value: '教骑车' }],
        change: [{ key: '变化', value: '首次' }, { key: '情动位移', value: '紧张 → 骄傲' }],
        family_value: [{ key: '主题', value: '创造玩乐' }],
      },
      narrativeFrame: {
        storyline: '转折',
        storylineNote: '成长故事中「学会独立」的关键转折镜头',
        shotType: '中景',
        shotNote: '亲子互动清晰，动作是画面焦点，有轻微紧张感',
        shotTags: ['抓拍', '动作焦点', '户外'],
      },
      storyLayer: {
        scene_type: '成长',
        change: '不会→学会',
        relationship: '父亲',
        meaning: '勇气',
        importance: 5,
      },
    },
  ];
  const base = mocks[Math.floor(Math.random() * mocks.length)];
  if (!sourceFacts) return base;

  return {
    ...base,
    people: sourceFacts.people.length > 0 ? sourceFacts.people : base.people,
    scene: sourceFacts.location || base.scene,
    time: sourceFacts.takenAtFormatted || base.time,
    significance: sourceFacts.description || base.significance,
  };
}

function getMockStory(
  familyName: string,
  members: string[],
  photos: Array<{ people: string[]; scene: string; action: string; time: string; tags: string[] }>,
  relations: PhotoRelation[]
): StoryOutput {
  const mainRelations =
    relations.length > 0
      ? relations.slice(0, 2).map((r) => r.person).join('和')
      : members.slice(0, 2).join('和');

  return {
    title: `从牵着你的手，到看你独立成长`,
    timeline: photos
      .filter((p) => p.time !== '未知')
      .map((p) => ({
        year: p.time,
        event: `${p.scene} - ${p.action}`,
      }))
      .slice(0, 5),
    emotionSummary: `这些照片记录的不只是${photos[0]?.scene || '某个场景'}，而是一家人陪伴彼此成长的过程。每一张照片背后，都是无法重来的珍贵时光。`,
    connectionAction: `这些照片已经过去了很久，不妨分享给${mainRelations}，一起重温那些温暖的时刻。`,
  };
}
