'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user' | 'system';
  content: string;
  label?: string;
}

interface AccessibleChatPanelProps {
  messages: ChatMessage[];
  className?: string;
  emptyHint?: string;
  /** 微信风格：绿气泡 + 念念头像 */
  wechat?: boolean;
}

/** 适老聊天面板 — 大字号、高对比、清晰气泡 */
export function AccessibleChatPanel({
  messages,
  className,
  emptyHint = '暂无消息',
  wechat = false,
}: AccessibleChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const visible = messages.filter((m) => m.role !== 'system');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, messages[messages.length - 1]?.id]);

  return (
    <ScrollArea
      className={cn(
        'rounded-2xl border-2 border-border',
        wechat ? 'bg-[#EDEDED]' : 'bg-[#FFFBF7]',
        className
      )}
    >
      <div className="p-3 space-y-3 min-h-full">
        {visible.length === 0 ? (
          <p className="text-base text-muted-foreground text-center py-8">{emptyHint}</p>
        ) : (
          visible.map((msg) => (
            <div
              key={msg.id}
              className={cn('flex items-end gap-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
            >
              {wechat && msg.role === 'assistant' && (
                <span className="shrink-0 w-9 h-9 rounded-lg bg-[#D98A45] text-white text-sm font-medium flex items-center justify-center">
                  念
                </span>
              )}
              {wechat && msg.role === 'user' && (
                <span className="shrink-0 w-9 h-9 rounded-lg bg-[#4B3B2F] text-white text-xs flex items-center justify-center">
                  我
                </span>
              )}
              <div
                className={cn(
                  'max-w-[78%] rounded-2xl px-3.5 py-2.5 text-base leading-relaxed shadow-sm',
                  wechat && msg.role === 'assistant'
                    ? 'bg-white text-[#1a1a1a] rounded-tl-sm'
                    : wechat && msg.role === 'user'
                      ? 'bg-[#95EC69] text-[#1a1a1a] rounded-tr-sm'
                      : msg.role === 'assistant'
                        ? 'bg-[hsl(var(--chat-assistant))] text-foreground rounded-tl-sm border border-[#F0E6D8]'
                        : 'bg-primary text-primary-foreground rounded-tr-sm'
                )}
              >
                {!wechat && msg.label && (
                  <p className="text-xs font-medium mb-1 opacity-80">{msg.label}</p>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

interface AccessibleChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  submitLabel?: string;
  extraActions?: React.ReactNode;
  /** 微信风格单行输入栏 */
  wechat?: boolean;
}

export function AccessibleChatComposer({
  value,
  onChange,
  onSubmit,
  placeholder = '请输入…',
  disabled = false,
  submitLabel = '发送',
  extraActions,
  wechat = false,
}: AccessibleChatComposerProps) {
  if (wechat) {
    return (
      <div className="flex items-end gap-2 rounded-2xl border border-[#D9D9D9] bg-[#F7F7F7] p-2">
        {extraActions}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit?.();
            }
          }}
          className="flex-1 min-h-[40px] max-h-[100px] resize-none rounded-xl border-0 bg-white px-3 py-2.5 text-base leading-relaxed text-foreground placeholder:text-[#B8A898] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D98A45]/40 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className="shrink-0 h-10 px-4 rounded-xl bg-[#D98A45] text-white text-sm font-medium disabled:opacity-40 touch-manipulation"
        >
          {submitLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        rows={4}
        className="flex min-h-[100px] w-full rounded-2xl border-2 border-input bg-white px-4 py-3 text-base leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-y"
      />
      <div className="flex flex-wrap gap-2 items-center">
        {extraActions}
        {onSubmit && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            className="ml-auto h-12 px-6 rounded-xl bg-primary text-primary-foreground text-base font-medium disabled:opacity-40 touch-manipulation"
          >
            {submitLabel}
          </button>
        )}
      </div>
    </div>
  );
}
