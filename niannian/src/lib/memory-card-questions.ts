import { generatePhotoQuestions } from '@/lib/ai';
import { getMemoryCardByPhoto, setMemoryCardQuestions, type AiQuestion } from '@/lib/db';

function generateQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/** 引导问题与当前记忆卡内容明显不符时，应重新生成 */
export function shouldRefreshMemoryCardQuestions(card: {
  ai_questions?: AiQuestion[];
  action?: string;
  significance?: string;
  location?: string;
  people?: string[];
}): boolean {
  if (!card.ai_questions?.length) return true;

  const questions = card.ai_questions.map((q) => q.question).join('');
  const context = [
    card.action || '',
    card.significance || '',
    card.location || '',
    ...(card.people || []),
  ].join('');

  const stalePairs: Array<[RegExp, RegExp]> = [
    [/孩子|骑车|松手|练习|庆祝/, /闺蜜|咖啡|自拍|饮品|好友|聚会/],
    [/爷爷|孙子|沙滩|玩沙|牵手散步/, /闺蜜|咖啡|好友|自拍/],
    [/春节|团聚|全家|饺子/, /闺蜜|咖啡|好友|复古/],
  ];

  return stalePairs.some(([questionPattern, contextPattern]) => {
    return questionPattern.test(questions) && contextPattern.test(context);
  });
}

export async function regenerateMemoryCardQuestions(photoId: string): Promise<AiQuestion[]> {
  const card = getMemoryCardByPhoto(photoId);
  if (!card) return [];

  const generated = await generatePhotoQuestions({
    people: card.people,
    location: card.location,
    action: card.action,
    significance: card.significance,
    archetype: card.understanding?.archetype,
    userNotes: card.user_notes?.trim() || undefined,
  });

  const ai_questions: AiQuestion[] = generated.map((item) => ({
    id: generateQuestionId(),
    question: item.question,
    answer: '',
  }));

  setMemoryCardQuestions(photoId, ai_questions);
  return ai_questions;
}
