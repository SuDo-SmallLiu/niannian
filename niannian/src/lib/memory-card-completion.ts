/** Memory Card 完成度与四态（MVP V3） */

export type MemoryCardStatus = 'pending' | 'analyzed' | 'needs_supplement' | 'completed';

export interface MemoryCardCompletionInput {
  analysis_status?: string | null;
  significance?: string | null;
  user_notes?: string | null;
  voice_transcript?: string | null;
  ai_questions?: unknown;
}

const STATUS_LABELS: Record<MemoryCardStatus, string> = {
  pending: '待解析',
  analyzed: '解析完成',
  needs_supplement: '待补充',
  completed: '已完成',
};

export function getMemoryCardStatus(card: MemoryCardCompletionInput | null | undefined): MemoryCardStatus {
  if (!card || card.analysis_status !== 'analyzed') return 'pending';

  const hasSupplement = Boolean(
    card.user_notes?.trim() || card.voice_transcript?.trim()
  );
  const completion = computeMemoryCardCompletion(card);

  if (completion >= 70) return 'completed';
  if (hasSupplement) return 'analyzed';
  return 'needs_supplement';
}

export function getMemoryCardStatusLabel(status: MemoryCardStatus): string {
  return STATUS_LABELS[status];
}

/** 完成度 0–100 */
export function computeMemoryCardCompletion(
  card: MemoryCardCompletionInput | null | undefined
): number {
  if (!card) return 0;
  if (card.analysis_status !== 'analyzed') return 10;

  let score = 45;
  if (card.significance?.trim()) score += 15;
  if (card.user_notes?.trim()) score += 25;
  if (card.voice_transcript?.trim()) score += 10;

  const questions = parseQuestions(card.ai_questions);
  if (questions.length > 0) score -= 5;

  return Math.min(100, Math.max(0, score));
}

function parseQuestions(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function aggregateCompletion(
  cards: Array<MemoryCardCompletionInput | null | undefined>
): number {
  if (cards.length === 0) return 0;
  const sum = cards.reduce((acc, c) => acc + computeMemoryCardCompletion(c), 0);
  return Math.round(sum / cards.length);
}

export function countReadyForStory(
  cards: Array<MemoryCardCompletionInput | null | undefined>,
  threshold = 70
): number {
  return cards.filter((c) => computeMemoryCardCompletion(c) >= threshold).length;
}
