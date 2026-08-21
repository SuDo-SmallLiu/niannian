'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { analyzePhotoAsync } from '@/lib/poll-job';
import {
  type AiQuestion,
  buildQuestionQueue,
  buildSupplementThread,
  combinedNotes,
  mergeFixedAnswers,
  saveMemoryCardSupplement,
  getSupplementProgressPercent,
} from '@/lib/supplement-chat';
import { FIXED_SUPPLEMENT_QUESTIONS } from '@/lib/supplement-questions';

export type { AiQuestion };

export interface UseSupplementChatOptions {
  photoId: string;
  initialNotes?: string;
  initialQuestions?: AiQuestion[];
  numbered?: boolean;
  onNotesChange?: (notes: string) => void;
  onQuestionsChange?: (questions: AiQuestion[]) => void;
  onSaved?: (data: {
    user_notes: string;
    voice_transcript: string;
    ai_questions: AiQuestion[];
  }) => void;
  onReanalyzed?: (data: {
    photo: unknown;
    memoryCard: unknown;
    tags: unknown;
    familyName?: string;
  }) => void;
}

export function useSupplementChat({
  photoId,
  initialNotes = '',
  initialQuestions = [],
  numbered = false,
  onNotesChange,
  onQuestionsChange,
  onSaved,
  onReanalyzed,
}: UseSupplementChatOptions) {
  const [notes, setNotes] = useState(initialNotes);
  const [questions, setQuestions] = useState<AiQuestion[]>(initialQuestions);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [draft, setDraft] = useState('');
  const [fixedAnswers, setFixedAnswers] = useState<string[]>([]);

  const voice = useVoiceInput();

  const updateNotes = useCallback(
    (next: string) => {
      setNotes(next);
      onNotesChange?.(next);
    },
    [onNotesChange]
  );

  const updateQuestions = useCallback(
    (next: AiQuestion[]) => {
      setQuestions(next);
      onQuestionsChange?.(next);
    },
    [onQuestionsChange]
  );

  const questionQueue = useMemo(() => buildQuestionQueue(questions), [questions]);

  const { thread, answeredCount, allDone } = useMemo(
    () => buildSupplementThread(questionQueue, fixedAnswers, questions, { numbered }),
    [questionQueue, fixedAnswers, questions, numbered]
  );

  const progressPercent = useMemo(
    () => getSupplementProgressPercent(answeredCount, questionQueue.length),
    [answeredCount, questionQueue.length]
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
        updateQuestions(data.ai_questions);
      }
    } catch {
      setMessage('加载引导问题失败');
    } finally {
      setLoadingQuestions(false);
    }
  }, [photoId, updateQuestions]);

  useEffect(() => {
    setNotes(initialNotes);
    setQuestions(initialQuestions);
    setFixedAnswers(initialNotes.trim() ? initialNotes.trim().split('\n') : []);
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
        updateNotes(combinedNotes(nextFixed, questions));
      } else {
        const nextQuestions = questions.map((q) =>
          q.id === current.id ? { ...q, answer: trimmed } : q
        );
        updateQuestions(nextQuestions);
        updateNotes(combinedNotes(fixedAnswers, nextQuestions));
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
      updateNotes,
      updateQuestions,
    ]
  );

  const appendVoiceText = useCallback((text: string) => {
    setVoiceTranscript((prev) => (prev ? `${prev}\n${text}` : text));
    setDraft((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
    setMessage('语音已转为文字，点发送即可');
  }, []);

  const saveSupplement = useCallback(async (): Promise<boolean> => {
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
      onSaved?.({
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
  }, [fixedAnswers, questions, notes, photoId, voiceTranscript, onSaved]);

  const reanalyzeWithSupplement = useCallback(async () => {
    setReanalyzing(true);
    setMessage('');
    try {
      const saved = dirty ? await saveSupplement() : true;
      if (!saved) return;

      const data = await analyzePhotoAsync(photoId, true);
      setDirty(false);
      setMessage('已结合补充更新记忆卡');
      onReanalyzed?.(data);
    } catch {
      setMessage('重新理解失败，请重试');
    } finally {
      setReanalyzing(false);
    }
  }, [dirty, saveSupplement, photoId, onReanalyzed]);

  const hasSupplement =
    fixedAnswers.some((a) => a.trim()) ||
    questions.some((q) => q.answer?.trim()) ||
    !!notes.trim();

  const voiceBusy = voice.isRecording || voice.isTranscribing;
  const busy = saving || reanalyzing || voiceBusy || loadingQuestions;
  const waitingForReply = !allDone && answeredCount < questionQueue.length;

  return {
    notes,
    questions,
    thread,
    answeredCount,
    allDone,
    progressPercent,
    questionQueue,
    loadingQuestions,
    saving,
    reanalyzing,
    message,
    dirty,
    draft,
    setDraft,
    voice,
    voiceTranscript,
    hasSupplement,
    busy,
    waitingForReply,
    submitReply,
    appendVoiceText,
    saveSupplement,
    reanalyzeWithSupplement,
  };
}
