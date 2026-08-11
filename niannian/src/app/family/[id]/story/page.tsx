'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ChapterCard from '@/components/ChapterCard';
import StoryInlineEditor from '@/components/StoryInlineEditor';
import { useSharePoster } from '@/hooks/useSharePoster';
import { useAutoGenerateFamilyStory } from '@/hooks/useAutoGenerateFamilyStory';
import { useAppDialog } from '@/components/providers/app-dialog-provider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import EmptyStateIcon from '@/components/EmptyStateIcon';
import { NavStoryIcon, PhotoIcon } from '@/components/icons/NianNianIcons';

interface StoryItem {
  id: string;
  title: string;
  description: string;
  summary?: string;
  connection_action: string;
  timeline: Array<{ year: string; event: string }>;
  photos: string[];
  created_at: string;
  published?: boolean;
}

interface StoryEditDetail {
  id: string;
  title: string;
  description: string;
  summary: string;
  segments: Array<{
    photoId: string;
    memorySnippet: string;
    narrative: string;
  }>;
  photos_detail: Array<{ id: string; url: string }>;
}

export default function StoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const familyId = params.id as string;
  const storyId = searchParams.get('storyId');

  const [stories, setStories] = useState<StoryItem[]>([]);
  const [familyName, setFamilyName] = useState('');
  const [photoUrlMap, setPhotoUrlMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sharingStoryId, setSharingStoryId] = useState<string | null>(null);
  const [regeneratingStoryId, setRegeneratingStoryId] = useState<string | null>(null);
  const [regenerateError, setRegenerateError] = useState('');
  const [regenerateSuccess, setRegenerateSuccess] = useState('');
  const [confirmStory, setConfirmStory] = useState<StoryItem | null>(null);
  const [deletingStoryId, setDeletingStoryId] = useState<string | null>(null);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [editDetail, setEditDetail] = useState<StoryEditDetail | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [publishingStoryId, setPublishingStoryId] = useState<string | null>(null);
  const { openSharePoster, modal: shareModal } = useSharePoster();
  const { showLoading, hideLoading, confirm, alert } = useAppDialog();
  const { generateStories, generating: autoGenerating, error: autoGenerateError } =
    useAutoGenerateFamilyStory(familyId);

  const fetchData = useCallback(async () => {
    try {
      if (storyId) {
        const res = await fetch(`/api/story?storyId=${storyId}`);
        const data = await res.json();
        if (res.ok && data.story) {
          setStories([data.story]);
          setFamilyName(data.family?.name || '');
          const urls = (data.story.photos_detail || []) as Array<{ id: string; url: string }>;
          const urlMap: Record<string, string> = {};
          for (const p of urls) urlMap[p.id] = p.url;
          setPhotoUrlMap(urlMap);
        }
      } else {
        const [storyRes, familyRes, photosRes] = await Promise.all([
          fetch(`/api/story?familyId=${familyId}`),
          fetch('/api/family'),
          fetch(`/api/photos?familyId=${familyId}`),
        ]);
        const data = await storyRes.json();
        const familyData = await familyRes.json();
        const photosData = await photosRes.json();
        if (storyRes.ok && data.stories) {
          setStories(data.stories);
        }
        const urlMap: Record<string, string> = {};
        for (const p of photosData.photos || []) {
          urlMap[p.id] = p.url;
        }
        setPhotoUrlMap(urlMap);
        const family = (familyData.families || []).find(
          (f: { id: string }) => f.id === familyId
        );
        if (family) setFamilyName(family.name);
      }
    } catch {
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  }, [familyId, storyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRegenerateStory = async (story: StoryItem) => {
    setRegeneratingStoryId(story.id);
    setRegenerateError('');
    setRegenerateSuccess('');
    showLoading('念念正在重新生成故事', '读取最新记忆卡并撰写中，请保持页面打开…');
    const startedAt = Date.now();
    try {
      const res = await fetch('/api/story/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: story.id, mode: 'full' }),
      });
      const data = await res.json();
      const minLoadingMs = 1200;
      const elapsed = Date.now() - startedAt;
      if (elapsed < minLoadingMs) {
        await new Promise((resolve) => setTimeout(resolve, minLoadingMs - elapsed));
      }
      if (!res.ok) {
        setRegenerateError(data.error || '重新生成失败');
        return;
      }
      if (data.story) {
        setStories((prev) =>
          prev.map((item) => (item.id === story.id ? { ...item, ...data.story } : item))
        );
      } else {
        await fetchData();
      }
      setRegenerateSuccess('故事已更新，请查看上方内容');
      window.setTimeout(() => setRegenerateSuccess(''), 4000);
    } catch {
      setRegenerateError('重新生成失败，请重试');
    } finally {
      hideLoading();
      setRegeneratingStoryId(null);
    }
  };

  const handleSharePoster = async (story: StoryItem) => {
    setSharingStoryId(story.id);
    try {
      let photoUrls: string[] = [];
      try {
        const res = await fetch(`/api/story?storyId=${story.id}`);
        const data = await res.json();
        if (res.ok && data.story?.photos_detail) {
          photoUrls = data.story.photos_detail.map((p: { url: string }) => p.url);
        }
      } catch {
        // ignore
      }

      await openSharePoster({
        type: 'story',
        storyId: story.id,
        title: story.title,
        summary: story.description,
        familyName: familyName || '',
        photoUrls,
      });
    } finally {
      setSharingStoryId(null);
    }
  };

  const handlePublishStory = async (story: StoryItem) => {
    setPublishingStoryId(story.id);
    setRegenerateError('');
    try {
      const res = await fetch('/api/story/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: story.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '发布失败');
      setStories((prev) =>
        prev.map((item) =>
          item.id === story.id ? { ...item, published: true } : item
        )
      );
      setRegenerateSuccess('已发布到「故事」页签，家人现在可以看到啦');
      window.setTimeout(() => setRegenerateSuccess(''), 4000);
    } catch (err) {
      setRegenerateError(err instanceof Error ? err.message : '发布失败');
    } finally {
      setPublishingStoryId(null);
    }
  };

  const handleDeleteStory = async (story: StoryItem) => {
    setDeletingStoryId(story.id);
    setRegenerateError('');
    showLoading('正在删除', `移除「${story.title}」…`);
    try {
      const res = await fetch(`/api/story?storyId=${story.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '删除失败');
      setStories((prev) => prev.filter((s) => s.id !== story.id));
      if (storyId === story.id) {
        router.replace(`/family/${familyId}/story`);
        return;
      }
      setRegenerateSuccess(`已删除「${story.title}」`);
      window.setTimeout(() => setRegenerateSuccess(''), 4000);
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除失败';
      setRegenerateError(message);
      await alert({ title: '删除失败', description: message });
    } finally {
      hideLoading();
      setDeletingStoryId(null);
    }
  };

  const requestDeleteStory = async (story: StoryItem) => {
    const ok = await confirm({
      title: '删除这个故事？',
      description: `将永久删除「${story.title}」，此操作不可恢复。`,
      confirmText: '确认删除',
      cancelText: '取消',
      destructive: true,
    });
    if (!ok) return;
    await handleDeleteStory(story);
  };

  const startEditStory = async (story: StoryItem) => {
    setEditingStoryId(story.id);
    setEditDetail(null);
    setLoadingEdit(true);
    try {
      const res = await fetch(`/api/story?storyId=${story.id}`);
      const data = await res.json();
      if (!res.ok || !data.story) {
        setRegenerateError(data.error || '加载故事详情失败');
        setEditingStoryId(null);
        return;
      }
      setEditDetail(data.story);
    } catch {
      setRegenerateError('加载故事详情失败');
      setEditingStoryId(null);
    } finally {
      setLoadingEdit(false);
    }
  };

  const cancelEditStory = () => {
    setEditingStoryId(null);
    setEditDetail(null);
  };

  const handleEditSaved = async () => {
    setEditingStoryId(null);
    setEditDetail(null);
    await fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#E8DCC8] border-t-[#D98A45] rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center bg-[#F8F4ED]">
        <p className="text-[#8B7355] mb-6">{error}</p>
        <Link href={`/family/${familyId}`} className="text-sm text-[#D98A45] underline">
          返回家庭
        </Link>
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8F4ED] px-6 pt-8 pb-24">
        <Link href={`/family/${familyId}`} className="text-[#B8A898] text-sm mb-8 inline-block">
          ← 返回
        </Link>
        <div className="text-center mb-10">
          <EmptyStateIcon icon={NavStoryIcon} className="mb-6" />
          <h1 className="text-xl font-serif text-[#4B3B2F] mb-2">
            {familyName ? `${familyName}的故事` : '家庭故事'}
          </h1>
          <p className="text-sm text-[#B8A898]">还没有故事，选择一种方式开始</p>
        </div>
        <div className="max-w-sm mx-auto space-y-3">
          <Link
            href={`/family/${familyId}/story/compose`}
            className="block w-full py-4 px-5 rounded-2xl bg-white border-2 border-[#D98A45] text-center shadow-sm"
          >
            <p className="text-[#D98A45] font-medium mb-1">人工组合排列</p>
            <p className="text-xs text-[#B8A898]">自选照片、调整顺序，生成一个故事</p>
          </Link>
          <Link
            href={`/family/${familyId}`}
            className="block w-full py-4 px-5 rounded-2xl bg-[#D98A45] text-white text-center shadow-sm"
          >
            <p className="font-medium mb-1">念念自动发现故事</p>
            <p className="text-xs text-white/80">从全部记忆卡聚类生成 3–5 个主题故事</p>
          </Link>
          <Link
            href={`/family/${familyId}/upload`}
            className="block w-full py-3 text-center text-sm text-[#B8A898] underline underline-offset-2"
          >
            先去上传照片
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F4ED] px-6 pt-8 pb-32">
      {shareModal}

      {confirmStory && (
        <AlertDialog open onOpenChange={(open) => !open && setConfirmStory(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>重新生成故事？</AlertDialogTitle>
              <AlertDialogDescription>
                将基于该故事关联照片的<strong className="font-medium text-foreground">最新记忆卡</strong>
                （含您的补充）重新撰写。预计需要 10–30 秒。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmStory(null)}>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const target = confirmStory;
                  setConfirmStory(null);
                  if (target) void handleRegenerateStory(target);
                }}
              >
                确认生成
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* 顶部 */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href={`/family/${familyId}`}
          className="text-[#B8A898] hover:text-[#8B7355] text-sm transition-colors"
        >
          ← 主题管理
        </Link>
        {familyName && (
          <p className="text-xs text-[#D8CCB8]">{familyName}</p>
        )}
        <div className="w-10" />
      </div>

      {/* 标题 */}
      <div className="text-center mb-8 animate-fade-in-up">
        <p className="text-xs tracking-[0.3em] text-[#D98A45] font-medium mb-3">
          故事草稿箱
        </p>
        <h1 className="text-2xl font-serif font-bold text-[#4B3B2F] leading-snug">
          {familyName ? `${familyName}的故事草稿` : '我们的故事草稿'}
        </h1>
        <p className="mt-3 text-sm text-[#B8A898]">
          共 {stories.length} 个草稿 · 发布后才会出现在「故事」页签
        </p>
      </div>

      {regenerateError && (
        <p className="text-sm text-red-500 text-center mb-4 px-4 py-2 bg-red-50 rounded-xl">{regenerateError}</p>
      )}

      {regenerateSuccess && (
        <p className="text-sm text-[#D98A45] text-center mb-4 px-4 py-2 bg-[#FFF8F0] rounded-xl">{regenerateSuccess}</p>
      )}

      <div className="max-w-md mx-auto mb-8 space-y-3">
        <button
          type="button"
          onClick={async () => {
            const ok = await generateStories({ existingCount: stories.length });
            if (ok) await fetchData();
          }}
          disabled={autoGenerating}
          className="w-full py-4 px-5 rounded-2xl bg-[#D98A45] text-white font-medium shadow-lg shadow-[#D98A45]/20 hover:bg-[#C47A3A] disabled:opacity-50 transition-all"
        >
          {autoGenerating ? '念念撰写中…' : '念念自动生成故事'}
        </button>
        <Link
          href={`/family/${familyId}/story/compose`}
          className="flex items-center justify-between w-full py-4 px-5 rounded-2xl bg-white border border-[#E8DCC8] hover:border-[#D98A45]/40 transition-all shadow-sm"
        >
          <div className="text-left">
            <p className="text-sm font-medium text-[#4B3B2F]">人工组合排列</p>
            <p className="text-xs text-[#B8A898] mt-0.5">自选照片顺序，手动编排后生成故事</p>
          </div>
          <span className="text-[#D98A45] text-lg">→</span>
        </Link>
        {autoGenerateError && (
          <p className="text-xs text-red-500 text-center px-2">{autoGenerateError}</p>
        )}
      </div>

      {/* 章节列表 */}
      <div>
        {stories.map((story, index) => (
          <div key={story.id} id={`story-${story.id}`}>
            {editingStoryId === story.id ? (
              <section className="mb-10">
                <p className="text-xs tracking-[0.3em] text-[#D98A45] font-medium mb-3 text-center">
                  Chapter {String(index + 1).padStart(2, '0')} · 编辑中
                </p>
                {loadingEdit || !editDetail ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-[#E8DCC8] border-t-[#D98A45] rounded-full animate-spin" />
                  </div>
                ) : (
                  <StoryInlineEditor
                    storyId={story.id}
                    initialTitle={editDetail.title}
                    initialSummary={editDetail.summary || editDetail.description}
                    initialSegments={(editDetail.segments || []).map((seg) => ({
                      ...seg,
                      photoUrl: editDetail.photos_detail?.find((p) => p.id === seg.photoId)?.url,
                    }))}
                    onSaved={handleEditSaved}
                    onCancel={cancelEditStory}
                  />
                )}
              </section>
            ) : (
              <ChapterCard
                chapter={index + 1}
                title={story.title}
                summary={story.summary || story.description}
                familyName={familyName}
                photoUrls={(story.photos || [])
                  .map((id) => photoUrlMap[id])
                  .filter(Boolean)}
                published={story.published}
                sharing={sharingStoryId === story.id}
                publishing={publishingStoryId === story.id}
                editing={editingStoryId === story.id}
                onEdit={() => startEditStory(story)}
                onViewDetail={() => router.push(`/stories/${story.id}`)}
                onPublish={() => handlePublishStory(story)}
                onShare={() => handleSharePoster(story)}
                onDelete={() => void requestDeleteStory(story)}
                deleting={deletingStoryId === story.id}
              />
            )}
          </div>
        ))}
      </div>

      {/* 底部 */}
      {stories.length === 1 && (
        <div className="text-center mt-6 mb-4">
          <Link
            href={`/family/${familyId}/upload`}
            className="inline-flex items-center gap-1.5 text-sm text-[#B8A898] hover:text-[#D98A45] transition-colors"
          >
            <PhotoIcon size={16} className="text-[#B8A898]" />
            上传更多，发现更多故事
          </Link>
        </div>
      )}
    </div>
  );
}
