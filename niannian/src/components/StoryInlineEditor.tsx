'use client';

import { useState } from 'react';

interface EditableSegment {
  photoId: string;
  memorySnippet: string;
  narrative: string;
  photoUrl?: string;
}

interface StoryInlineEditorProps {
  storyId: string;
  initialTitle: string;
  initialSummary: string;
  initialSegments: EditableSegment[];
  onSaved: () => void;
  onCancel: () => void;
}

export default function StoryInlineEditor({
  storyId,
  initialTitle,
  initialSummary,
  initialSegments,
  onSaved,
  onCancel,
}: StoryInlineEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [summary, setSummary] = useState(initialSummary);
  const [segments, setSegments] = useState(initialSegments);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= segments.length) return;
    setSegments((prev) => {
      const copy = [...prev];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  };

  const remove = (index: number) => {
    if (segments.length <= 1) return;
    setSegments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/story', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          title: title.trim(),
          summary: summary.trim(),
          photoOrder: segments.map((s) => s.photoId),
          segments: segments.map((s) => ({
            photoId: s.photoId,
            narrative: s.narrative,
            memorySnippet: s.memorySnippet,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '保存失败');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4 animate-fade-in">
      <div>
        <label className="block text-xs text-[#8B7355] mb-1">标题</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white border border-[#E8DCC8] text-[#4B3B2F] font-serif"
        />
      </div>
      <div>
        <label className="block text-xs text-[#8B7355] mb-1">摘要</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-white border border-[#E8DCC8] text-[#4B3B2F] text-sm leading-relaxed resize-y"
        />
      </div>

      <div className="space-y-3">
        <p className="text-xs text-[#8B7355]">章节顺序与正文</p>
        {segments.map((seg, index) => (
          <div key={seg.photoId} className="bg-white rounded-2xl border border-[#E8DCC8] p-3">
            <div className="flex gap-3 mb-2">
              {seg.photoUrl && (
                <img src={seg.photoUrl} alt="" className="w-16 h-16 rounded-lg object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[#B8A898] truncate">{seg.memorySnippet}</p>
                <div className="flex gap-1 mt-2">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="px-2 py-1 text-xs rounded-lg bg-[#FFF8F0] disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === segments.length - 1}
                    className="px-2 py-1 text-xs rounded-lg bg-[#FFF8F0] disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={segments.length <= 1}
                    className="px-2 py-1 text-xs rounded-lg text-red-600 bg-red-50 disabled:opacity-30 ml-auto"
                  >
                    移除
                  </button>
                </div>
              </div>
            </div>
            <textarea
              value={seg.narrative}
              onChange={(e) =>
                setSegments((prev) =>
                  prev.map((s, i) => (i === index ? { ...s, narrative: e.target.value } : s))
                )
              }
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-[#FFFBF5] border border-[#F0E8D8] text-sm text-[#4B3B2F] leading-relaxed resize-y"
              placeholder="这一章的叙述…"
            />
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 text-center">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-2xl border border-[#E8DCC8] text-[#8B7355]"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 rounded-2xl bg-[#D98A45] text-white disabled:opacity-50"
        >
          {saving ? '保存中…' : '保存修改'}
        </button>
      </div>
    </div>
  );
}
