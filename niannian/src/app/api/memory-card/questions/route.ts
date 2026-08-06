import { NextRequest, NextResponse } from 'next/server';
import {
  getMemoryCardByPhoto,
  setMemoryCardQuestions,
  type AiQuestion,
} from '@/lib/db';
import { generatePhotoQuestions } from '@/lib/ai';

function generateQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export async function POST(request: NextRequest) {
  try {
    const { photoId } = await request.json();
    if (!photoId) {
      return NextResponse.json({ error: '缺少 photoId' }, { status: 400 });
    }

    const card = getMemoryCardByPhoto(photoId);
    if (!card) {
      return NextResponse.json({ error: '记忆卡不存在，请先完成 AI 解析' }, { status: 404 });
    }

    // 已有提问且未强制刷新时直接返回
    if (card.ai_questions && card.ai_questions.length > 0) {
      return NextResponse.json({ ai_questions: card.ai_questions });
    }

    const generated = await generatePhotoQuestions({
      people: card.people,
      location: card.location,
      action: card.action,
      significance: card.significance,
      archetype: card.understanding?.archetype,
    });

    const ai_questions: AiQuestion[] = generated.map((item) => ({
      id: generateQuestionId(),
      question: item.question,
      answer: '',
    }));

    setMemoryCardQuestions(photoId, ai_questions);

    return NextResponse.json({ ai_questions });
  } catch (error) {
    console.error('生成 AI 提问失败:', error);
    return NextResponse.json({ error: '生成提问失败' }, { status: 500 });
  }
}
