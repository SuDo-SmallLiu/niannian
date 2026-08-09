'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { FIXED_SUPPLEMENT_QUESTIONS } from '@/lib/supplement-questions';
import {
  AccessibleChatPanel,
  AccessibleChatComposer,
  type ChatMessage,
} from '@/components/ui/accessible-chat';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';

export interface AiQuestion {
  id: string;
  question: string;
  answer: string;
}

interface UserSupplementPanelProps {
  photoId: string;
  notes: string;
  onNotesChange: (notes: string) => void;
  questions: AiQuestion[];
  onQuestionsChange: (questions: AiQuestion[]) => void;
  integratedSummary?: {
    people: string[];
    location: string;
    taken_at: string;
    significance: string;
  } | null;
  disabled?: boolean;
  onSaved: (data: {
    user_notes: string;
    voice_transcript: string;
    ai_questions: AiQuestion[];
  }) => void;
  onReanalyzed: (data: {
    photo: unknown;
    memoryCard: unknown;
    tags: unknown;
    familyName?: string;
  }) => void;
}

const WELCOME =
  '你好，我是念念。照片里的故事需要你来告诉我：时间、地点、人物关系，以及当时发生了什么。我们一句一句聊，你也可以用语音回答。';

type QueueItem = { id: string; text: string; source: 'fixed' | 'ai' };

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

function buildQuestionQueue(questions: AiQuestion[]): QueueItem[] {
  const queue: QueueItem[] = FIXED_SUPPLEMENT_QUESTIONS.map((text, i) => ({
    id: `fixed-${i}`,
    text,
    source: 'fixed' as const,
  }));
  for (const q of questions) {
    queue.push({ id: q.id, text: q.question, source: 'ai' });
  }
  return queue;
}

function getAnswerForItem(
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

function buildThreadFromState(
  queue: QueueItem[],
  fixedAnswers: string[],
  aiQuestions: AiQuestion[]
): { thread: ChatMessage[]; answeredCount: number; allDone: boolean } {
  const thread: ChatMessage[] = [
    { id: 'welcome', role: 'assistant', content: WELCOME, label: '念念' },
  ];

  if (queue.length === 0) {
    return { thread, answeredCount: 0, allDone: true };
  }

  let answeredCount = 0;

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const answer = getAnswerForItem(item, fixedAnswers, aiQuestions);

    thread.push({
      id: `q-${item.id}`,
      role: 'assistant',
      content: item.text,
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
      content: '谢谢你的补充！可以点「保存」，或「结合补充重新理解」让念念更新记忆卡。',
      label: '念念',
    });
  }

  return { thread, answeredCount, allDone };
}

function mergeFixedAnswers(prev: string[], index: number, text: string): string[] {
  const next = [...prev];
  while (next.length <= index) next.push('');
  next[index] = text;
  return next;
}

function fixedAnswersToNotes(answers: string[]): string {
  return answers.map((a) => a.trim()).filter(Boolean).join('\n');
}

function combinedNotes(fixedAnswers: string[], aiQuestions: AiQuestion[]): string {
  const parts = [
    fixedAnswersToNotes(fixedAnswers),
    ...aiQuestions.filter((q) => q.answer?.trim()).map((q) => q.answer.trim()),
  ].filter(Boolean);
  return parts.join('\n');
}

export default function UserSupplementPanel({
  photoId,
  notes,
  onNotesChange,
  questions,
  onQuestionsChange,
  integratedSummary,
  disabled = false,
  onSaved,
  onReanalyzed,
}: UserSupplementPanelProps) {
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [draft, setDraft] = useState('');
  const [fixedAnswers, setFixedAnswers] = useState<string[]>([]);

  const voice = useVoiceInput();

  const questionQueue = useMemo(() => buildQuestionQueue(questions), [questions]);

  const { thread, answeredCount, allDone } = useMemo(
    () => buildThreadFromState(questionQueue, fixedAnswers, questions),
    [questionQueue, fixedAnswers, questions]
  );

  const loadQuestions = useCallback(async () => {
    setLoadingQuestions(true);
    try {
      const res = await fetch('/api/memory-card/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId }),
      });
      const data = await res.json();
      if (res.ok && data.ai_questions) {
        onQuestionsChange(data.ai_questions);
      }
    } catch {
      setMessage('加载引导问题失败');
    } finally {
      setLoadingQuestions(false);
    }
  }, [photoId, onQuestionsChange]);

  useEffect(() => {
    setFixedAnswers(notes.trim() ? notes.trim().split('\n') : []);
    setDraft('');
    setDirty(false);
    setMessage('');
    setVoiceTranscript('');
    loadQuestions();
  }, [photoId, loadQuestions]);

  const submitReply = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || allDone || answeredCount >= questionQueue.length) return;

      const current = questionQueue[answeredCount];
      if (!current) return;

      if (current.source === 'fixed') {
        const fixedIdx = FIXED_SUPPLEMENT_QUESTIONS.findIndex((t) => t === current.text);
        const nextFixed = mergeFixedAnswers(fixedAnswers, fixedIdx, trimmed);
        setFixedAnswers(nextFixed);
        onNotesChange(combinedNotes(nextFixed, questions));
      } else {
        const nextQuestions = questions.map((q) =>
          q.id === current.id ? { ...q, answer: trimmed } : q
        );
        onQuestionsChange(nextQuestions);
        onNotesChange(combinedNotes(fixedAnswers, nextQuestions));
      }

      setDirty(true);
      setDraft('');
    },
    [
      allDone,
      answeredCount,
      questionQueue,
      fixedAnswers,
      questions,
      onNotesChange,
      onQuestionsChange,
    ]
  );

  const appendVoiceText = useCallback((text: string) => {
    setVoiceTranscript((prev) => (prev ? `${prev}\n${text}` : text));
    setDraft((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
    setMessage('语音已转为文字，点发送即可');
  }, []);

  const saveSupplement = async (): Promise<boolean> => {
    setSaving(true);
    setMessage('');
    try {
      const noteText = combinedNotes(fixedAnswers, questions) || notes;

      const result = await saveMemoryCardSupplement(
        photoId,
        noteText,
        questions,
        voiceTranscript
      );
      if (!result.ok) {
        setMessage(result.error || '保存失败');
        return false;
      }
      const data = result.data!;
      setDirty(false);
      setMessage('已保存');
      onSaved({
        user_notes: (data.memoryCard as { user_notes?: string })?.user_notes || noteText,
        voice_transcript:
          (data.memoryCard as { voice_transcript?: string })?.voice_transcript ||
          voiceTranscript.trim(),
        ai_questions:
          (data.memoryCard as { ai_questions?: AiQuestion[] })?.ai_questions || questions,
      });
      return true;
    } catch {
      setMessage('保存失败，请重试');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleReanalyzeWithSupplement = async () => {
    setReanalyzing(true);
    setMessage('');
    try {
      const saved = dirty ? await saveSupplement() : true;
      if (!saved) return;

      const res = await fetch('/api/analyze/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId, withSupplement: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || '重新理解失败');
        return;
      }
      setDirty(false);
      setMessage('已结合补充更新记忆卡');
      onReanalyzed(data);
    } catch {
      setMessage('重新理解失败，请重试');
    } finally {
      setReanalyzing(false);
    }
  };

  const hasSupplement =
    fixedAnswers.some((a) => a.trim()) || questions.some((q) => q.answer?.trim()) || !!notes.trim();
  const voiceBusy = voice.isRecording || voice.isTranscribing;
  const busy = disabled || saving || reanalyzing || voiceBusy || loadingQuestions;
  const waitingForReply = !allDone && answeredCount < questionQueue.length;

  const voiceLabel = voice.isTranscribing
    ? '识别中…'
    : voice.isRecording
      ? '结束'
      : '语音';

  return (
    <section className="bg-white rounded-2xl p-5 border border-[#E8DCC8] shadow-sm">
      <h2 className="text-base text-[#D98A45] font-medium mb-1">用户层 · 补充记忆</h2>
      <p className="text-sm text-muted-foreground mb-4">与念念对话，一句一句补充照片背后的故事</p>

      {notes.trim() && integratedSummary && (
        <div className="mb-4 rounded-xl bg-[#F5FFF8] border border-[#D4EDDA] px-4 py-3.5">
          <p className="text-sm text-[#5A8F6B] mb-2 font-medium">已结合你的补充理解</p>
          <div className="space-y-1 text-base text-[#4B3B2F] leading-relaxed">
            {integratedSummary.people.length > 0 && (
              <p>
                <span className="text-[#B8A898]">人物 · </span>
                {integratedSummary.people.join('、')}
              </p>
            )}
            {integratedSummary.location && (
              <p>
                <span className="text-[#B8A898]">地点 · </span>
                {integratedSummary.location}
              </p>
            )}
            {integratedSummary.taken_at && (
              <p>
                <span className="text-[#B8A898]">时间 · </span>
                {integratedSummary.taken_at}
              </p>
            )}
            {integratedSummary.significance && (
              <p className="text-[#6B5A48] pt-1">{integratedSummary.significance}</p>
            )}
          </div>
        </div>
      )}

      <AccessibleChatPanel messages={thread} className="mb-3 h-[320px]" wechat />

      {loadingQuestions && (
        <p className="text-xs text-center text-[#B8A898] mb-2">念念正在准备问题…</p>
      )}

      {waitingForReply ? (
        <AccessibleChatComposer
          wechat
          value={draft}
          onChange={setDraft}
          onSubmit={() => submitReply(draft)}
          disabled={busy}
          placeholder="输入回答，Enter 发送"
          submitLabel="发送"
          extraActions={
            <Button
              type="button"
              variant={voice.isRecording ? 'default' : 'outline'}
              size="icon"
              className={`shrink-0 h-10 w-10 rounded-xl ${
                voice.isRecording ? 'bg-[#C04040] hover:bg-[#A03030] border-none' : ''
              }`}
              onClick={() => voice.start(appendVoiceText)}
              disabled={disabled || saving || reanalyzing || voice.isTranscribing || !voice.supported}
              aria-label={voiceLabel}
            >
              {voice.isTranscribing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : voice.isRecording ? (
                <Square className="w-4 h-4 fill-current" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
          }
        />
      ) : (
        <p className="text-sm text-center text-[#8B7355] py-2 mb-2">本轮对话已完成</p>
      )}

      {!voice.supported && (
        <p className="text-xs text-muted-foreground text-center mt-2 leading-relaxed">
          {typeof window !== 'undefined' && !window.isSecureContext
            ? '语音需要 HTTPS 安全连接。请使用 https://niannian-years.top:8799 访问，或改用文字输入'
            : '当前浏览器不支持语音，请改用文字输入'}
        </p>
      )}

      {voice.error && (
        <p className="text-sm text-destructive text-center mt-2 leading-relaxed">{voice.error}</p>
      )}

      {message && (
        <p
          className={`text-sm mt-2 text-center leading-relaxed ${
            message.includes('失败') ? 'text-destructive' : 'text-[#D98A45]'
          }`}
        >
          {message}
        </p>
      )}

      <div className="flex gap-3 mt-4">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => saveSupplement()}
          disabled={busy || !dirty}
        >
          {saving ? '保存中…' : '保存'}
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={handleReanalyzeWithSupplement}
          disabled={busy || !hasSupplement}
        >
          {reanalyzing ? '理解中…' : '结合补充重新理解'}
        </Button>
      </div>
    </section>
  );
}
