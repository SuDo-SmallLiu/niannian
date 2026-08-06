'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { FIXED_SUPPLEMENT_QUESTIONS } from '@/lib/supplement-questions';

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

export async function saveMemoryCardSupplement(
  photoId: string,
  notes: string,
  questions: AiQuestion[]
): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
  const res = await fetch('/api/memory-card', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      photoId,
      user_notes: notes.trim(),
      voice_transcript: '',
      ai_questions: questions,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error || '保存失败' };
  }
  return { ok: true, data };
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

  const speech = useSpeechRecognition();

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
    loadQuestions();
  }, [photoId, loadQuestions]);

  useEffect(() => {
    setDirty(false);
    setMessage('');
  }, [photoId]);

  const saveSupplement = async (): Promise<boolean> => {
    setSaving(true);
    setMessage('');
    try {
      const result = await saveMemoryCardSupplement(photoId, notes, questions);
      if (!result.ok) {
        setMessage(result.error || '保存失败');
        return false;
      }
      const data = result.data!;
      setDirty(false);
      setMessage('已保存');
      onSaved({
        user_notes: (data.memoryCard as { user_notes?: string })?.user_notes || notes.trim(),
        voice_transcript: '',
        ai_questions: (data.memoryCard as { ai_questions?: AiQuestion[] })?.ai_questions || questions,
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

  const hasSupplement = !!notes.trim();

  return (
    <section className="bg-white rounded-2xl p-5 border border-[#E8DCC8] shadow-sm">
      <h2 className="text-xs tracking-wider text-[#D98A45] font-medium mb-2">用户层 · 补充记忆</h2>

      {notes.trim() && integratedSummary && (
        <div className="mb-4 rounded-xl bg-[#F5FFF8] border border-[#D4EDDA] px-4 py-3.5">
          <p className="text-xs text-[#5A8F6B] mb-2 font-medium">已结合你的补充理解</p>
          <div className="space-y-1 text-sm text-[#4B3B2F] leading-relaxed">
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

      <div className="mb-5 rounded-xl bg-[#FFFBF5] border border-[#F0E6D8] px-4 py-3.5">
        <p className="text-xs text-[#B8A898] mb-3 leading-relaxed">
          写下 AI 看不到的故事。可以参考下面的问题：
        </p>
        <ul className="space-y-2.5">
          {FIXED_SUPPLEMENT_QUESTIONS.map((question) => (
            <li
              key={question}
              className="text-sm text-[#6B5A48] leading-relaxed pl-3 border-l-2 border-[#D98A45]/40"
            >
              <span className="text-[10px] text-[#D98A45] mr-1.5 align-middle">固定</span>
              {question}
            </li>
          ))}
          {loadingQuestions ? (
            <li className="text-xs text-[#D98A45] animate-pulse leading-relaxed pl-3">
              正在准备更多引导问题…
            </li>
          ) : (
            questions.map((q) => (
              <li
                key={q.id}
                className="text-sm text-[#6B5A48] leading-relaxed pl-3 border-l-2 border-[#E8DCC8]"
              >
                {q.question}
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-[#B8A898]">你的补充</p>
          {speech.supported && (
            <button
              type="button"
              onClick={() =>
                speech.start((text) => {
                  onNotesChange(notes ? `${notes}\n${text}` : text);
                  setDirty(true);
                })
              }
              disabled={disabled || reanalyzing}
              className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
                speech.listening
                  ? 'bg-[#D98A45] text-white animate-pulse'
                  : 'bg-[#FFF8F0] text-[#D98A45] border border-[#F0DCC8]'
              }`}
            >
              {speech.listening ? '聆听中…' : '🎤 语音输入'}
            </button>
          )}
        </div>
        <textarea
          value={notes}
          onChange={(e) => {
            onNotesChange(e.target.value);
            setDirty(true);
          }}
          disabled={disabled || reanalyzing}
          placeholder="请尽量补充：时间（某年某月某日）、地点（国家/城市/家中/学校）、人物及关系，再加上当时的故事…"
          rows={5}
          className="w-full px-3.5 py-3 rounded-xl bg-[#FFF8F0] border border-[#F0DCC8] text-sm text-[#4B3B2F] leading-relaxed placeholder:text-[#D8CCB8] focus:outline-none focus:border-[#D98A45]/50 resize-y min-h-[120px]"
        />
      </div>

      {message && (
        <p
          className={`text-xs mb-3 text-center leading-relaxed ${
            message.includes('失败') ? 'text-red-500' : 'text-[#D98A45]'
          }`}
        >
          {message}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => saveSupplement()}
          disabled={disabled || saving || reanalyzing || !dirty}
          className="flex-1 py-3 rounded-xl border border-[#D98A45] text-[#D98A45] text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FFF8F0] transition-colors"
        >
          {saving ? '保存中…' : '保存'}
        </button>
        <button
          type="button"
          onClick={handleReanalyzeWithSupplement}
          disabled={disabled || saving || reanalyzing || !hasSupplement}
          className="flex-1 py-3 rounded-xl bg-[#D98A45] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#C47A3A] transition-colors"
        >
          {reanalyzing ? '理解中…' : '结合补充重新理解'}
        </button>
      </div>
    </section>
  );
}
