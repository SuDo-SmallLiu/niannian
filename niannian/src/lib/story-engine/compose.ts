import { chatWithKeyAndModelFallback, extractAssistantText, getTextModelChain } from '@/lib/ai-model-fallback';
import { isAiConfigured } from '@/lib/ai';
import type { ComposedStory, MemoryCardSnapshot, ThemeResult } from './types';

const TEXT_MODELS = getTextModelChain();

function buildCardSummary(card: MemoryCardSnapshot, index: number): string {
  const extras = [
    card.significance ? `意义：${card.significance}` : '',
    card.user_notes ? `用户补充：${card.user_notes}` : '',
    card.storyLayer.change ? `变化：${card.storyLayer.change}` : '',
    card.narrativeFrame.storyline ? `故事线：${card.narrativeFrame.storyline}` : '',
    card.narrativeFrame.shotNote ? `镜头：${card.narrativeFrame.shotNote}` : '',
  ]
    .filter(Boolean)
    .join('；');

  return `照片${index + 1}（id=${card.photoId}）：人物[${card.people.join('、')}]，${card.location || '未知地点'}，${card.action || '未知行为'}，${card.taken_at || '未知时间'}${extras ? `；${extras}` : ''}`;
}

function fallbackCompose(
  familyName: string,
  themeResult: ThemeResult,
  cards: MemoryCardSnapshot[]
): Omit<ComposedStory, 'coverPhotoId' | 'memoryCardIds'> {
  const title = themeResult.titleCandidates[0] || `${familyName}的${themeResult.theme}`;
  const segments = cards.map((card) => ({
    photoId: card.photoId,
    memorySnippet: [card.action, card.significance].filter(Boolean).join(' — ') || card.action,
    narrative: card.significance || card.action || '这一瞬间被留在了记忆里。',
  }));

  const years = cards
    .map((c) => (c.taken_at || '').slice(0, 4))
    .filter((y) => /^\d{4}$/.test(y));
  const uniqueYears = [...new Set(years)].sort();

  const timeline = uniqueYears.map((year) => ({
    year,
    event: segments.find((s) => {
      const card = cards.find((c) => c.photoId === s.photoId);
      return card?.taken_at?.startsWith(year);
    })?.memorySnippet || `${year}年的家庭记忆`,
  }));

  const summary =
    segments.length > 0
      ? `围绕「${themeResult.theme}」，${segments.length} 张照片串起了${familyName}的一段记忆。`
      : `${familyName}的家庭故事`;

  return {
    title,
    summary,
    theme: themeResult.theme,
    connectionAction: '可以把这个故事分享给家人，一起回忆那些说不出口的细节。',
    timeline,
    segments,
  };
}

/** Theme + Memory Cards → 章节式 Story */
export async function composeStory(
  familyName: string,
  themeResult: ThemeResult,
  cards: MemoryCardSnapshot[]
): Promise<Omit<ComposedStory, 'coverPhotoId' | 'memoryCardIds'>> {
  if (cards.length === 0) {
    throw new Error('Scene 内没有可用的记忆卡');
  }

  if (!isAiConfigured()) {
    return fallbackCompose(familyName, themeResult, cards);
  }

  const photoSummaries = cards.map((c, i) => buildCardSummary(c, i)).join('\n');
  const titleHint = themeResult.titleCandidates.join(' / ');

  const prompt = `你是一名家庭记忆纪录片编剧。根据以下记忆卡，围绕主题「${themeResult.theme}」写一段章节式家庭故事。

家庭：${familyName}
标题候选（择一或微调）：${titleHint}

记忆卡（勿编造未出现的事实，用户补充优先）：
${photoSummaries}

只返回 JSON：
{
  "title": "故事标题",
  "summary": "一句摘要（40字内）",
  "theme": "${themeResult.theme}",
  "connectionAction": "具体可执行的分享建议（指向某位家人）",
  "timeline": [{"year": "年份", "event": "一句话"}],
  "segments": [
    {"photoId": "与输入一致的照片id", "memorySnippet": "来自记忆卡的事实摘要", "narrative": "50-120字叙述，纪录片口吻，写变化过程少写结果"}
  ]
}

要求：
1. segments 顺序与记忆卡叙事节奏一致（铺垫→发展→余韵）
2. 每段 narrative 只对应一张照片
3. 语言自然克制，不要煽情作文腔`;

  try {
    const { response } = await chatWithKeyAndModelFallback(
      TEXT_MODELS,
      {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2500,
        temperature: 0.75,
      },
      { kind: 'text' }
    );

    const text = extractAssistantText(response.choices[0]?.message || {});
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      const segments = Array.isArray(result.segments)
        ? result.segments.map((s: Record<string, string>) => ({
            photoId: String(s.photoId || ''),
            memorySnippet: String(s.memorySnippet || s.memoryFacts || ''),
            narrative: String(s.narrative || ''),
          }))
        : [];

      const cardIds = new Set(cards.map((c) => c.photoId));
      const validSegments = segments.filter((s) => cardIds.has(s.photoId));
      const used = new Set(validSegments.map((s) => s.photoId));
      for (const card of cards) {
        if (!used.has(card.photoId)) {
          validSegments.push({
            photoId: card.photoId,
            memorySnippet: card.action || '',
            narrative: card.significance || card.action || '',
          });
        }
      }

      return {
        title: String(result.title || themeResult.titleCandidates[0] || `${familyName}的故事`),
        summary: String(result.summary || result.emotionSummary || ''),
        theme: String(result.theme || themeResult.theme),
        connectionAction: String(
          result.connectionAction || '分享给家人，一起回忆那些温暖的细节。'
        ),
        timeline: Array.isArray(result.timeline) ? result.timeline : [],
        segments: validSegments,
      };
    }
  } catch (error) {
    console.error('composeStory AI 失败，使用规则兜底:', error);
  }

  return fallbackCompose(familyName, themeResult, cards);
}
