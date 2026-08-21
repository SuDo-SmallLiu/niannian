'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Mic, Plus, Send, Square } from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import SupplementChatBubble from '@/components/niannian/SupplementChatBubble';
import NianNianAvatar from '@/components/NianNianAvatar';

export interface HomeChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface HomeChatComposerProps {
  familyId: string | null;
  lastPhotoId?: string | null;
  onExpandChange?: (expanded: boolean) => void;
}

const DEFAULT_CHIPS = ['帮我上传照片', '帮我补充记忆卡', '生成这张照片的描述'];

const PHOTO_CHIPS = ['识别这张照片的场景', '帮我补充记忆卡', '生成这张照片的描述'];

export default function HomeChatComposer({
  familyId,
  lastPhotoId,
  onExpandChange,
}: HomeChatComposerProps) {
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<HomeChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const voice = useVoiceInput();

  const chips = useMemo(
    () => (lastPhotoId ? PHOTO_CHIPS : DEFAULT_CHIPS),
    [lastPhotoId]
  );

  useEffect(() => {
    onExpandChange?.(expanded);
  }, [expanded, onExpandChange]);

  useEffect(() => {
    if (expanded) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, expanded]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setExpanded(true);
    setDraft('');
    const userMsg: HomeChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const res = await fetch('/api/niannian/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          context: { familyId, lastPhotoId: lastPhotoId ?? null },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: 'assistant',
            content: data.error || '念念暂时没听懂，请再试一次～',
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
        },
      ]);

      if (data.href) {
        window.setTimeout(() => router.push(data.href), 1500);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: '网络有点慢，请稍后再试～',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const appendVoice = (text: string) => {
    setDraft((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
  };

  return (
    <div className="home-chat-composer shrink-0 border-t border-[#E8DCC8] bg-white/95 backdrop-blur-sm">
      {expanded && messages.length > 0 && (
        <div className="max-h-[180px] overflow-y-auto px-4 pt-3 space-y-2">
          {messages.map((msg) => (
            <SupplementChatBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              read={msg.role === 'user'}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="px-3 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => sendMessage(chip)}
            disabled={sending}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs bg-[#FFF8F0] text-[#8B7355] border border-[#F0E6D8] disabled:opacity-50"
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2 px-3 pb-3 pb-safe">
        <button
          type="button"
          className="shrink-0 w-10 h-10 rounded-full border border-[#E8DCC8] bg-[#FFFBF7] flex items-center justify-center text-[#8B7355]"
          aria-label="添加附件"
          disabled
        >
          <Plus className="w-5 h-5" />
        </button>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={sending}
          placeholder="告诉念念你想做什么…"
          rows={1}
          onFocus={() => setExpanded(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage(draft);
            }
          }}
          className="flex-1 min-h-[44px] max-h-[88px] resize-none rounded-2xl border border-[#E8DCC8] bg-[#FFFBF7] px-3 py-2.5 text-[15px] leading-relaxed text-[#4A3326] placeholder:text-[#B8A898] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D98A45]/30"
        />
        <button
          type="button"
          className={`shrink-0 w-10 h-10 rounded-full border flex items-center justify-center ${
            voice.isRecording
              ? 'bg-[#C04040] border-[#C04040] text-white'
              : 'bg-white border-[#E8DCC8] text-[#8B7355]'
          }`}
          onClick={() => voice.start(appendVoice)}
          disabled={!voice.supported || sending || voice.isTranscribing}
          aria-label="语音输入"
        >
          {voice.isTranscribing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : voice.isRecording ? (
            <Square className="w-4 h-4 fill-current" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>
        <button
          type="button"
          onClick={() => sendMessage(draft)}
          disabled={sending || !draft.trim()}
          className="shrink-0 w-10 h-10 rounded-full bg-[#DF8B3A] text-white flex items-center justify-center disabled:opacity-40"
          aria-label="发送"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>

      {!expanded && (
        <div className="flex items-center gap-2 px-4 pb-2 -mt-1">
          <NianNianAvatar variant="small" size={28} />
          <p className="text-xs text-[#B8A898]">输入或点建议，念念会帮你导航</p>
        </div>
      )}
    </div>
  );
}
