import OpenAI from 'openai';

// 创建 OpenAI 兼容客户端（火山引擎 Ark / 其他兼容 API）
function getClient(): OpenAI | null {
  const apiKey = process.env.ARK_API_KEY;
  const baseURL = process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';

  if (!apiKey) {
    console.warn('⚠️ ARK_API_KEY 未配置，将使用演示模式');
    return null;
  }

  console.log(`🔗 使用火山引擎 Ark API: ${baseURL}`);
  return new OpenAI({ apiKey, baseURL });
}

// 模型名称配置
const VISION_MODEL = process.env.ARK_VISION_MODEL || 'doubao-vision-pro-32k';
const TEXT_MODEL = process.env.ARK_TEXT_MODEL || 'doubao-pro-32k';

// ============================================================
// Step 1: 图片理解 — AI提取人物、场景、行为、时间
// ============================================================

export interface PhotoAnalysis {
  people: string[];
  scene: string;
  action: string;
  time: string;
  tags: string[];
  emotions: string[];
  changes: string[];
  significance: string;
  layeredTags: {
    objective: Array<{ key: string; value: string }>;
    behavior: Array<{ key: string; value: string }>;
    change: Array<{ key: string; value: string }>;
    family_value: Array<{ key: string; value: string }>;
  };
}

export async function analyzePhoto(imageBase64: string): Promise<PhotoAnalysis> {
  const client = getClient();

  if (!client) {
    // 演示模式：返回模拟数据
    return getMockPhotoAnalysis();
  }

  const prompt = `你是一位家庭记忆整理师。请分析这张家庭照片，生成一张「记忆卡」。

请以JSON格式返回（只返回JSON，不要其他内容）：
{
  "people": ["人物1", "人物2"],
  "scene": "地点/场景",
  "action": "行为描述",
  "time": "估计的时间，不确定填"未知"",
  "tags": ["标签1", "标签2"],
  "emotions": ["可能情绪1", "可能情绪2"],
  "changes": ["变化标签，如：第一次、长大、重逢，没有则[]"],
  "significance": "一句话说明这张照片值得记住的原因",
  "layeredTags": {
    "objective": [{"key": "人物", "value": "爸爸"}, {"key": "地点", "value": "杭州"}],
    "behavior": [{"key": "行为", "value": "一起吃冰淇淋"}],
    "change": [{"key": "变化", "value": "第一次"}],
    "family_value": [{"key": "价值", "value": "爱与滋养"}]
  }
}

四层标签说明：
1. objective（客观）：人物、时间、地点
2. behavior（行为）：拥抱、骑车、旅行、做饭等
3. change（变化）：第一次、重新开始、毕业、长大、重逢
4. family_value（家庭价值）：爱与滋养、冒险成长、创造玩乐、传承根基

注意：不确定的信息标注"未知"或"可能"，不要编造。`;

  try {
    const response = await client.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const text = response.choices[0]?.message?.content?.trim() || '';
    // 尝试提取JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return normalizePhotoAnalysis(result);
    }
  } catch (error) {
    console.error('图片分析失败:', error);
  }

  return getMockPhotoAnalysis();
}

function normalizePhotoAnalysis(result: Record<string, unknown>): PhotoAnalysis {
  const layered = (result.layeredTags || {}) as Record<string, Array<{ key: string; value: string }>>;
  return {
    people: (result.people as string[]) || [],
    scene: (result.scene as string) || '未知',
    action: (result.action as string) || '未知',
    time: (result.time as string) || '未知',
    tags: (result.tags as string[]) || [],
    emotions: (result.emotions as string[]) || [],
    changes: (result.changes as string[]) || [],
    significance: (result.significance as string) || '',
    layeredTags: {
      objective: layered.objective || [],
      behavior: layered.behavior || [],
      change: layered.change || [],
      family_value: layered.family_value || [],
    },
  };
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
  }>,
  relations: PhotoRelation[]
): Promise<StoryOutput> {
  const client = getClient();

  if (!client) {
    return getMockStory(familyName, members, photos, relations);
  }

  // 构建照片摘要
  const photoSummaries = photos
    .map(
      (p, i) =>
        `照片${i + 1}：人物[${p.people.join('、')}]，场景"${p.scene}"，行为"${p.action}"，时间"${p.time}"，标签[${p.tags.join('、')}]`
    )
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
    const response = await client.chat.completions.create({
      model: TEXT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.8,
    });

    const text = response.choices[0]?.message?.content?.trim() || '';
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

function getMockPhotoAnalysis(): PhotoAnalysis {
  const mocks: PhotoAnalysis[] = [
    {
      people: ['爷爷', '孙子'],
      scene: '公园',
      action: '牵手散步',
      time: '2020年秋天',
      tags: ['温馨', '陪伴', '成长'],
      emotions: ['开心', '放松', '亲密'],
      changes: ['陪伴成长'],
      significance: '祖孙俩在公园牵手的日常瞬间，记录了无声的陪伴。',
      layeredTags: {
        objective: [{ key: '人物', value: '爷爷' }, { key: '人物', value: '孙子' }, { key: '地点', value: '公园' }],
        behavior: [{ key: '行为', value: '牵手散步' }],
        change: [{ key: '变化', value: '陪伴成长' }],
        family_value: [{ key: '价值', value: '爱与滋养' }],
      },
    },
    {
      people: ['全家'],
      scene: '家中客厅',
      action: '春节团聚',
      time: '2023年春节',
      tags: ['团聚', '幸福', '传统'],
      emotions: ['温暖', '喜悦'],
      changes: ['重逢'],
      significance: '一家人围坐在一起的春节时刻，是传承根基的见证。',
      layeredTags: {
        objective: [{ key: '人物', value: '全家' }, { key: '地点', value: '家中' }, { key: '时间', value: '2023年春节' }],
        behavior: [{ key: '行为', value: '团聚' }],
        change: [{ key: '变化', value: '重逢' }],
        family_value: [{ key: '价值', value: '传承根基' }],
      },
    },
    {
      people: ['妈妈', '孩子'],
      scene: '海边',
      action: '一起玩沙子',
      time: '2021年夏天',
      tags: ['快乐', '亲子', '旅行'],
      emotions: ['兴奋', '自由'],
      changes: ['第一次'],
      significance: '孩子第一次在海边玩沙子，是冒险成长的开始。',
      layeredTags: {
        objective: [{ key: '人物', value: '妈妈' }, { key: '人物', value: '孩子' }, { key: '地点', value: '海边' }],
        behavior: [{ key: '行为', value: '玩沙子' }, { key: '行为', value: '旅行' }],
        change: [{ key: '变化', value: '第一次' }],
        family_value: [{ key: '价值', value: '冒险成长' }],
      },
    },
    {
      people: ['爸爸', '孩子'],
      scene: '户外',
      action: '教骑车',
      time: '2022年春天',
      tags: ['成长', '父爱', '陪伴'],
      emotions: ['紧张', '期待', '骄傲'],
      changes: ['第一次', '长大'],
      significance: '爸爸教孩子骑车的瞬间，标志着独立成长的里程碑。',
      layeredTags: {
        objective: [{ key: '人物', value: '爸爸' }, { key: '人物', value: '孩子' }, { key: '地点', value: '户外' }],
        behavior: [{ key: '行为', value: '教骑车' }],
        change: [{ key: '变化', value: '第一次' }, { key: '变化', value: '长大' }],
        family_value: [{ key: '价值', value: '创造玩乐' }],
      },
    },
  ];
  return mocks[Math.floor(Math.random() * mocks.length)];
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
