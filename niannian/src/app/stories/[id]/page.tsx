'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import StoryChapterTimeline from '@/components/StoryChapterTimeline';
import StoryInlineEditor from '@/components/StoryInlineEditor';
import { useSharePoster } from '@/hooks/useSharePoster';
import { useAppDialog } from '@/components/providers/app-dialog-provider';
import { useAppreciateMode } from '@/components/providers/appreciate-mode-provider';
import { useNianNianAgentOverride } from '@/components/providers/niannian-agent-provider';

interface StorySegment {
  photoId: string;
  memorySnippet: string;
  narrative: string;
  meta?: {
    people: string[];
    location: string;
    taken_at: string;
    action: string;
  };
}

interface PhotoDetail {
  id: string;
  url: string;
}

interface StoryDetail {
  id: string;
  family_id: string;
  title: string;
  description: string;
  summary: string;
  theme: string;
  connection_action: string;
  timeline: Array<{ year: string; event: string }>;
  segments: StorySegment[];
  photos_detail: PhotoDetail[];
  read_count?: number;
}

const REGEN_MODES = [
  { id: 'full', label: '重新发现故事组合', desc: '从全部记忆中换一组照片与视角' },
  { id: 'rediscover_theme', label: '换主题视角', desc: '保留照片，重新理解主题' },
  { id: 'keep_theme', label: '重写文字', desc: '保留主题与照片，重新撰写' },
  { id: 'reorder', label: '打乱顺序', desc: '随机重排照片并重新叙述' },
] as const;

export default function StoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.id as string;
  const appreciate = useAppreciateMode();

  const [story, setStory] = useState<StoryDetail | null>(null);
  const [familyName, setFamilyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenMode, setRegenMode] = useState<(typeof REGEN_MODES)[number]['id']>('full');
  const { openSharePoster, modal: shareModal } = useSharePoster();
  const { confirm, alert, showLoading, hideLoading } = useAppDialog();

  useNianNianAgentOverride({ itemLabel: 'story' });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/story?storyId=${storyId}`);
      const data = await res.json();
      if (!res.ok || !data.story) {
        setError(data.error || '故事不存在');
        return;
      }
      setStory(data.story);
      setFamilyName(data.family?.name || '');
    } catch {
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  }, [storyId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch('/api/story/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.readCount != null) {
          setStory((prev) => (prev ? { ...prev, read_count: d.readCount } : prev));
        }
      })
      .catch(() => {});
  }, [storyId]);

  const handleShare = async () => {
    if (!story) return;
    setSharing(true);
    try {
      await openSharePoster({
        type: 'story',
        storyId: story.id,
        title: story.title,
        summary: story.summary || story.description,
        familyName,
        photoUrls: (story.photos_detail || []).map((p) => p.url),
      });
    } finally {
      setSharing(false);
    }
  };

  const handleDelete = async () => {
    if (!story) return;
    const ok = await confirm({
      title: '删除这个故事？',
      description: `将永久删除「${story.title}」，此操作不可恢复。`,
      confirmText: '确认删除',
      cancelText: '取消',
      destructive: true,
    });
    if (!ok) return;

    setDeleting(true);
    showLoading('正在删除', `移除「${story.title}」…`);
    try {
      const res = await fetch(`/api/story?storyId=${story.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '删除失败');
      router.push('/stories');
    } catch (err) {
      await alert({
        title: '删除失败',
        description: err instanceof Error ? err.message : '请稍后重试',
      });
    } finally {
      hideLoading();
      setDeleting(false);
    }
  };

  const handleRegenerate = async () => {
    if (!story || regenerating) return;
    const ok = await confirm({
      title: '重新生成故事？',
      description: REGEN_MODES.find((m) => m.id === regenMode)?.desc || '',
      confirmText: '开始生成',
      cancelText: '取消',
    });
    if (!ok) return;

    setRegenerating(true);
    showLoading('AI 正在重新发现故事', '请保持页面打开…');
    try {
      const res = await fetch('/api/story/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: story.id, mode: regenMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '重新生成失败');
      if (data.story) setStory((prev) => ({ ...prev!, ...data.story }));
      else await load();
    } catch (err) {
      await alert({
        title: '重新生成失败',
        description: err instanceof Error ? err.message : '请稍后重试',
      });
    } finally {
      hideLoading();
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F4ED]">
        <div className="w-8 h-8 border-2 border-[#E8DCC8] border-t-[#D98A45] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F4ED] px-8">
        <p className="text-[#8B7355] mb-4">{error || '故事不存在'}</p>
        <button
          type="button"
          onClick={() => router.push('/stories')}
          className="text-sm text-[#D98A45] underline underline-offset-2"
        >
          返回故事库
        </button>
      </div>
    );
  }

  const playHref = appreciate
    ? `/stories/${storyId}/play?appreciate=1`
    : `/stories/${storyId}/play`;

  return (
    <div
      className={`min-h-screen bg-[#F8F4ED] px-6 pt-8 pb-28 ${appreciate ? 'text-lg' : ''}`}
    >
      {shareModal}

      <div className="max-w-md mx-auto flex items-center justify-between mb-4">
        <Link
          href={appreciate ? '/stories?appreciate=1' : '/stories'}
          className="text-[#B8A898] hover:text-[#8B7355] text-sm transition-colors"
        >
          ← 故事库
        </Link>
        <div className="flex gap-2">
          <Link
            href={playHref}
            className="px-4 py-2 rounded-xl bg-[#D98A45] text-white text-sm font-medium"
          >
            ▶ {appreciate ? '自动播放' : '沉浸播放'}
          </Link>
          {!appreciate && (
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              className="px-4 py-2 rounded-xl bg-[#07C160] text-white text-sm font-medium disabled:opacity-50"
            >
              {sharing ? '…' : '💬 分享'}
            </button>
          )}
        </div>
      </div>

      {(story.read_count ?? 0) > 0 && (
        <p className="max-w-md mx-auto text-center text-xs text-[#B8A898] mb-4">
          已有 {story.read_count} 人次阅读过这个故事
        </p>
      )}

      {!appreciate && !editing && (
        <div className="max-w-md mx-auto mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex-1 py-2.5 rounded-xl bg-white border border-[#E8DCC8] text-sm text-[#8B7355]"
          >
            ✏️ 编辑故事
          </button>
        </div>
      )}

      {editing ? (
        <StoryInlineEditor
          storyId={storyId}
          initialTitle={story.title}
          initialSummary={story.summary || story.description}
          initialSegments={(story.segments || []).map((seg) => ({
            ...seg,
            photoUrl: story.photos_detail?.find((p) => p.id === seg.photoId)?.url,
          }))}
          onSaved={() => {
            setEditing(false);
            load();
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <StoryChapterTimeline
          title={story.title}
          summary={story.summary || story.description}
          theme={story.theme}
          familyName={familyName}
          timeline={story.timeline || []}
          segments={story.segments || []}
          photosDetail={story.photos_detail || []}
          connectionAction={story.connection_action}
          largeText={appreciate}
        />
      )}

      {!appreciate && !editing && (
        <div className="max-w-md mx-auto mt-8 space-y-4">
          <div className="bg-white rounded-2xl border border-[#E8DCC8] p-4">
            <p className="text-sm font-medium text-[#4B3B2F] mb-2">重新生成</p>
            <div className="space-y-2 mb-3">
              {REGEN_MODES.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-start gap-2 p-2 rounded-xl cursor-pointer ${
                    regenMode === m.id ? 'bg-[#FFF8F0] border border-[#D98A45]/30' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="regenMode"
                    checked={regenMode === m.id}
                    onChange={() => setRegenMode(m.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="text-sm text-[#4B3B2F]">{m.label}</span>
                    <span className="block text-xs text-[#B8A898]">{m.desc}</span>
                  </span>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenerating}
              className="w-full py-3 rounded-xl bg-[#4B3B2F] text-white text-sm disabled:opacity-50"
            >
              {regenerating ? '生成中…' : '重新生成故事'}
            </button>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || sharing}
            className="w-full py-3 rounded-2xl border border-red-200 text-red-600 text-sm hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? '删除中…' : '🗑 删除这个故事'}
          </button>
        </div>
      )}
    </div>
  );
}
