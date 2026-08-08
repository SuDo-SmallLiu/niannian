'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { FIXED_SUPPLEMENT_QUESTIONS } from '@/lib/supplement-questions';
import {
  AccessibleChatPanel,
  type ChatMessage,
} from '@/components/ui/accessible-chat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  const notesRef = useRef(notes);

  const voice = useVoiceInput();

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  const appendVoiceText = useCallback(
    (text: string) => {
      const current = notesRef.current.trim();
      onNotesChange(current ? `${current}\n${text}` : text);
      setVoiceTranscript((prev) => (prev ? `${prev}\n${text}` : text));
      setDirty(true);
      setMessage('语音已转为文字');
    },
    [onNotesChange]
  );

  const chatMessages = useMemo((): ChatMessage[] => {
    const msgs: ChatMessage[] = [
      {
        id: 'welcome',
        role: 'assistant',
        content:
          '你好，我是念念助手。AI 看不到照片背后的故事，请告诉我：时间、地点、人物关系，以及当时发生了什么。也可以点击下方「点击说话」用语音回答。',
        label: '念念助手',
      },
    ];

    for (const q of FIXED_SUPPLEMENT_QUESTIONS) {
      msgs.push({
        id: `fixed-${q}`,
        role: 'assistant',
        content: q,
        label: '引导问题',
      });
    }

    if (loadingQuestions) {
      msgs.push({
        id: 'loading-q',
        role: 'assistant',
        content: '正在准备更多问题…',
      });
    } else {
      for (const q of questions) {
        msgs.push({
          id: q.id,
          role: 'assistant',
          content: q.question,
          label: 'AI 提问',
        });
      }
    }

    if (notes.trim()) {
      msgs.push({
        id: 'user-notes',
        role: 'user',
        content: notes.trim(),
      });
    }

    return msgs;
  }, [questions, notes, loadingQuestions]);

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
    setVoiceTranscript('');
  }, [photoId]);

  const saveSupplement = async (): Promise<boolean> => {
    setSaving(true);
    setMessage('');
    try {
      const result = await saveMemoryCardSupplement(photoId, notes, questions, voiceTranscript);
      if (!result.ok) {
        setMessage(result.error || '保存失败');
        return false;
      }
      const data = result.data!;
      setDirty(false);
      setMessage('已保存');
      onSaved({
        user_notes: (data.memoryCard as { user_notes?: string })?.user_notes || notes.trim(),
        voice_transcript:
          (data.memoryCard as { voice_transcript?: string })?.voice_transcript || voiceTranscript.trim(),
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
  const voiceBusy = voice.isRecording || voice.isTranscribing;
  const busy = disabled || saving || reanalyzing || voiceBusy;

  const voiceLabel = voice.isTranscribing
    ? '正在识别语音…'
    : voice.isRecording
      ? '说完了，点击结束'
      : '点击说话';

  return (
    <section className="bg-white rounded-2xl p-5 border border-[#E8DCC8] shadow-sm">
      <h2 className="text-base text-[#D98A45] font-medium mb-1">用户层 · 补充记忆</h2>
      <p className="text-sm text-muted-foreground mb-4">与念念助手对话，补充念念看不到的故事</p>

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

      <AccessibleChatPanel messages={chatMessages} className="mb-4 h-[280px]" />

      <div className="mb-3">
        <p className="text-sm text-muted-foreground mb-2">写下或说出你的回答</p>
        <Textarea
          value={notes}
          onChange={(e) => {
            onNotesChange(e.target.value);
            setDirty(true);
          }}
          disabled={busy}
          placeholder="请补充：时间、地点、人物及关系，再加上当时的故事…"
          rows={4}
          className="min-h-[120px] text-base"
        />
      </div>

      {/* 语音输入 — 大按钮，放在输入框下方 */}
      <div className="mb-4">
        <Button
          type="button"
          variant={voice.isRecording ? 'default' : 'outline'}
          size="lg"
          className={`w-full h-14 text-lg gap-3 ${
            voice.isRecording ? 'animate-pulse bg-[#C04040] hover:bg-[#A03030] border-none' : ''
          }`}
          onClick={() => voice.start(appendVoiceText)}
          disabled={disabled || saving || reanalyzing || voice.isTranscribing || !voice.supported}
        >
          {voice.isTranscribing ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : voice.isRecording ? (
            <Square className="w-6 h-6 fill-current" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
          {voiceLabel}
        </Button>

        {voice.isRecording && (
          <p className="text-sm text-[#D98A45] text-center mt-2 animate-pulse">
            正在录音，说完后点「说完了，点击结束」
          </p>
        )}

        {!voice.supported && (
          <p className="text-sm text-muted-foreground text-center mt-2">
            {typeof window !== 'undefined' && !window.isSecureContext
              ? '语音输入需要 HTTPS 安全连接，请改用文字输入'
              : '当前浏览器不支持语音，请改用文字输入'}
          </p>
        )}

        {voice.error && (
          <p className="text-sm text-destructive text-center mt-2 leading-relaxed">{voice.error}</p>
        )}
      </div>

      {message && (
        <p
          className={`text-sm mb-3 text-center leading-relaxed ${
            message.includes('失败') ? 'text-destructive' : 'text-[#D98A45]'
          }`}
        >
          {message}
        </p>
      )}

      <div className="flex gap-3">
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
