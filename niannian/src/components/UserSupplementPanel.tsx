'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

export interface AiQuestion {
  id: string;
  question: string;
  answer: string;
}

interface UserSupplementPanelProps {
  photoId: string;
  initialNotes?: string;
  initialVoice?: string;
  initialQuestions?: AiQuestion[];
  disabled?: boolean;
  onUpdated: (data: {
    user_notes: string;
    voice_transcript: string;
    ai_questions: AiQuestion[];
  }) => void;
}

export default function UserSupplementPanel({
  photoId,
  initialNotes = '',
  initialVoice = '',
  initialQuestions = [],
  disabled = false,
  onUpdated,
}: UserSupplementPanelProps) {
  const [userNotes, setUserNotes] = useState(initialNotes);
  const [voiceTranscript, setVoiceTranscript] = useState(initialVoice);
  const [questions, setQuestions] = useState<AiQuestion[]>(initialQuestions);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);

  const notesVoice = useSpeechRecognition();
  const supplementVoice = useSpeechRecognition();

  useEffect(() => {
    setUserNotes(initialNotes);
    setVoiceTranscript(initialVoice);
    setQuestions(initialQuestions);
  }, [initialNotes, initialVoice, initialQuestions]);

  const loadQuestions = useCallback(async () => {
    if (questions.length > 0) return;
    setLoadingQuestions(true);
    try {
      const res = await fetch('/api/memory-card/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId }),
      });
      const data = await res.json();
      if (res.ok && data.ai_questions) {
        setQuestions(data.ai_questions);
      }
    } catch {
      setMessage('加载提问失败');
    } finally {
      setLoadingQuestions(false);
    }
  }, [photoId, questions.length]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const markDirty = () => setDirty(true);

  const appendVoice = (target: 'notes' | 'supplement', text: string) => {
    if (target === 'notes') {
      setUserNotes((prev) => (prev ? `${prev}\n${text}` : text));
    } else {
      setVoiceTranscript((prev) => (prev ? `${prev}\n${text}` : text));
    }
    markDirty();
  };

  const saveSupplement = async (): Promise<boolean> => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/memory-card', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoId,
          user_notes: userNotes,
          voice_transcript: voiceTranscript,
          ai_questions: questions,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || '保存失败');
        return false;
      }
      setDirty(false);
      setMessage('已保存补充信息');
      onUpdated({
        user_notes: data.memoryCard?.user_notes || userNotes,
        voice_transcript: data.memoryCard?.voice_transcript || voiceTranscript,
        ai_questions: data.memoryCard?.ai_questions || questions,
      });
      return true;
    } catch {
      setMessage('保存失败，请重试');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => saveSupplement();

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
      setMessage('已结合补充重新理解');
      onUpdated({
        user_notes: data.memoryCard?.user_notes || userNotes,
        voice_transcript: data.memoryCard?.voice_transcript || voiceTranscript,
        ai_questions: data.memoryCard?.ai_questions || questions,
      });
      // 通知父组件刷新完整数据
      window.dispatchEvent(new CustomEvent('memory-card-reanalyzed', { detail: data }));
    } catch {
      setMessage('重新理解失败，请重试');
    } finally {
      setReanalyzing(false);
    }
  };

  const hasSupplement =
    userNotes.trim() ||
    voiceTranscript.trim() ||
    questions.some((q) => q.answer.trim());

  return (
    <section className="bg-white rounded-2xl p-5 border border-[#E8DCC8] shadow-sm">
      <h2 className="text-xs tracking-wider text-[#D98A45] font-medium mb-1">用户层 · 补充记忆</h2>
      <p className="text-xs text-[#B8A898] mb-4">写下或说出 AI 看不到的故事，让记忆更完整</p>

      {/* 文字补充 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-[#B8A898]">文字补充</p>
          {notesVoice.supported && (
            <button
              type="button"
              onClick={() =>
                notesVoice.start((text) => appendVoice('notes', text))
              }
              disabled={disabled || reanalyzing}
              className={`text-xs px-2 py-1 rounded-lg transition-all ${
                notesVoice.listening
                  ? 'bg-[#D98A45] text-white animate-pulse'
                  : 'bg-[#FFF8F0] text-[#D98A45] border border-[#F0DCC8]'
              }`}
            >
              {notesVoice.listening ? '聆听中…' : '🎤 语音输入'}
            </button>
          )}
        </div>
        <textarea
          value={userNotes}
          onChange={(e) => {
            setUserNotes(e.target.value);
            markDirty();
          }}
          disabled={disabled || reanalyzing}
          placeholder="例如：当时孩子非要抢爸爸的冰淇淋…"
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF8F0] border border-[#F0DCC8] text-sm text-[#4B3B2F] placeholder:text-[#D8CCB8] focus:outline-none focus:border-[#D98A45]/50 resize-none"
        />
      </div>

      {/* 语音转写 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-[#B8A898]">语音转写</p>
          {supplementVoice.supported && (
            <button
              type="button"
              onClick={() =>
                supplementVoice.start((text) => appendVoice('supplement', text))
              }
              disabled={disabled || reanalyzing}
              className={`text-xs px-2 py-1 rounded-lg transition-all ${
                supplementVoice.listening
                  ? 'bg-[#D98A45] text-white animate-pulse'
                  : 'bg-[#FFF8F0] text-[#D98A45] border border-[#F0DCC8]'
              }`}
            >
              {supplementVoice.listening ? '聆听中…' : '🎤 说一段回忆'}
            </button>
          )}
        </div>
        <textarea
          value={voiceTranscript}
          onChange={(e) => {
            setVoiceTranscript(e.target.value);
            markDirty();
          }}
          disabled={disabled || reanalyzing}
          placeholder="语音会自动转成文字，也可手动编辑"
          rows={2}
          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF8F0] border border-[#F0DCC8] text-sm text-[#4B3B2F] placeholder:text-[#D8CCB8] focus:outline-none focus:border-[#D98A45]/50 resize-none"
        />
      </div>

      {/* AI 提问 */}
      <div className="mb-4">
        <p className="text-xs text-[#B8A898] mb-2">AI 引导提问</p>
        {loadingQuestions ? (
          <p className="text-xs text-[#D98A45] animate-pulse">正在生成提问…</p>
        ) : (
          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={q.id} className="rounded-xl bg-[#FFF8F0] p-3 border border-[#F0DCC8]">
                <p className="text-xs text-[#D98A45] font-medium mb-1.5">
                  {i + 1}. {q.question}
                </p>
                <input
                  type="text"
                  value={q.answer}
                  onChange={(e) => {
                    const next = [...questions];
                    next[i] = { ...q, answer: e.target.value };
                    setQuestions(next);
                    markDirty();
                  }}
                  disabled={disabled || reanalyzing}
                  placeholder="你的回答…"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#E8DCC8] text-sm text-[#4B3B2F] placeholder:text-[#D8CCB8] focus:outline-none focus:border-[#D98A45]/50"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {message && (
        <p className={`text-xs mb-3 text-center ${message.includes('失败') ? 'text-red-500' : 'text-[#D98A45]'}`}>
          {message}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled || saving || reanalyzing || !dirty}
          className="flex-1 py-3 rounded-xl border border-[#D98A45] text-[#D98A45] text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FFF8F0] transition-colors"
        >
          {saving ? '保存中…' : '保存补充'}
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
