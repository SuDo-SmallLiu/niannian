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
}

export async function analyzePhoto(imageBase64: string): Promise<PhotoAnalysis> {
  const client = getClient();

  if (!client) {
    // 演示模式：返回模拟数据
    return getMockPhotoAnalysis();
  }

  const prompt = `你是一位家庭记忆整理师。请分析这张家庭照片。

请以JSON格式返回以下信息（只返回JSON，不要其他内容）：
{
  "people": ["人物1", "人物2"],  // 照片中的人物角色（如：爷爷、奶奶、爸爸、妈妈、孩子等）
  "scene": "地点/场景",          // 例如：公园、家中、海边、餐厅等
  "action": "行为描述",           // 例如：牵手散步、一起吃饭、拍照合影等
  "time": "估计的时间",           // 例如：2020年夏天、2023年春节等，不确定填"未知"
  "tags": ["标签1", "标签2"]     // 3-5个情感标签，如：温馨、成长、旅行、团聚、怀旧
}

注意：
- 不要编造确定的信息
- 不确定的信息请标注"未知"或"可能"
- 人物角色从家庭关系角度描述`;

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
      return {
        people: result.people || [],
        scene: result.scene || '未知',
        action: result.action || '未知',
        time: result.time || '未知',
        tags: result.tags || [],
      };
    }
  } catch (error) {
    console.error('图片分析失败:', error);
  }

  return getMockPhotoAnalysis();
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
  const mocks = [
    {
      people: ['爷爷', '孙子'],
      scene: '公园',
      action: '牵手散步',
      time: '2020年秋天',
      tags: ['温馨', '陪伴', '成长'],
    },
    {
      people: ['全家'],
      scene: '家中客厅',
      action: '春节团聚',
      time: '2023年春节',
      tags: ['团聚', '幸福', '传统'],
    },
    {
      people: ['妈妈', '孩子'],
      scene: '海边',
      action: '一起玩沙子',
      time: '2021年夏天',
      tags: ['快乐', '亲子', '旅行'],
    },
    {
      people: ['爸爸', '孩子'],
      scene: '户外',
      action: '教骑车',
      time: '2022年春天',
      tags: ['成长', '父爱', '陪伴'],
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
