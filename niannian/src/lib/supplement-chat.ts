import {
  FIXED_SUPPLEMENT_QUESTIONS,
  MAX_AI_SUPPLEMENT_QUESTIONS,
  TOTAL_SUPPLEMENT_STEPS,
} from '@/lib/supplement-questions';
import type { ChatMessage } from '@/components/ui/accessible-chat';

export interface AiQuestion {
  id: string;
  question: string;
  answer: string;
}

export type QueueItem = { id: string; text: string; source: 'fixed' | 'ai' };

export const SUPPLEMENT_PHOTO_INTRO =
  '我已分析你上传的照片。为了更好地记住它，我需要问你几个问题～';

export function buildQuestionQueue(questions: AiQuestion[]): QueueItem[] {
  const queue: QueueItem[] = FIXED_SUPPLEMENT_QUESTIONS.map((text, i) => ({
    id: `fixed-${i}`,
    text,
    source: 'fixed' as const,
  }));
  for (const q of questions.slice(0, MAX_AI_SUPPLEMENT_QUESTIONS)) {
    queue.push({ id: q.id, text: q.question, source: 'ai' });
  }
  return queue;
}

export function getAnswerForItem(
  item: QueueItem,
  fixedAnswers: string[],
  aiQuestions: AiQuestion[]
): string {
  if (item.source === 'fixed') {
    const idx = FIXED_SUPPLEMENT_QUESTIONS.findIndex((t) => t === item.text);
    return fixedAnswers[idx]?.trim() || '';
  }
  return aiQuestions.find((q) => q.id === item.id)?.answer?.trim() || '';
}

export function formatQuestionLabel(index: number, total: number, text: string): string {
  return `问题 ${index + 1}/${total}：${text}`;
}

export function buildSupplementThread(
  queue: QueueItem[],
  fixedAnswers: string[],
  aiQuestions: AiQuestion[],
  options?: { numbered?: boolean }
): { thread: ChatMessage[]; answeredCount: number; allDone: boolean } {
  const numbered = options?.numbered ?? false;
  const total = queue.length || TOTAL_SUPPLEMENT_STEPS;
  const thread: ChatMessage[] = [];

  if (queue.length === 0) {
    return { thread, answeredCount: 0, allDone: true };
  }

  let answeredCount = 0;

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const answer = getAnswerForItem(item, fixedAnswers, aiQuestions);
    const content = numbered
      ? formatQuestionLabel(i, total, item.text)
      : item.text;

    thread.push({
      id: `q-${item.id}`,
      role: 'assistant',
      content,
      label: '念念',
    });

    if (answer) {
      thread.push({ id: `a-${item.id}`, role: 'user', content: answer });
      answeredCount = i + 1;
    } else {
      break;
    }
  }

  const allDone = answeredCount >= queue.length;
  if (allDone) {
    thread.push({
      id: 'done',
      role: 'assistant',
      content: '谢谢你的补充！可以保存，或让念念结合你的回答重新理解这张照片。',
      label: '念念',
    });
  }

  return { thread, answeredCount, allDone };
}

export function mergeFixedAnswers(prev: string[], index: number, text: string): string[] {
  const next = [...prev];
  while (next.length <= index) next.push('');
  next[index] = text;
  return next;
}

export function fixedAnswersToNotes(answers: string[]): string {
  return answers.map((a) => a.trim()).filter(Boolean).join('\n');
}

export function combinedNotes(fixedAnswers: string[], aiQuestions: AiQuestion[]): string {
  const parts = [
    fixedAnswersToNotes(fixedAnswers),
    ...aiQuestions.filter((q) => q.answer?.trim()).map((q) => q.answer.trim()),
  ].filter(Boolean);
  return parts.join('\n');
}

export function getSupplementProgressPercent(
  answeredCount: number,
  totalSteps = TOTAL_SUPPLEMENT_STEPS
): number {
  if (totalSteps <= 0) return 0;
  return Math.min(100, Math.round((answeredCount / totalSteps) * 100));
}

export async function saveMemoryCardSupplement(
  photoId: string,
  notes: string,
  questions: AiQuestion[],
  voiceTranscript = ''
): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
  const res = await fetch('/api/memory-card', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      photoId,
      user_notes: notes.trim(),
      voice_transcript: voiceTranscript.trim(),
      ai_questions: questions,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error || '保存失败' };
  }
  return { ok: true, data };
}
