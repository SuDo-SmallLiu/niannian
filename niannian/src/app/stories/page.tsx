'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageShell from '@/components/PageShell';
import StoryListCard from '@/components/StoryListCard';
import EmptyStateIcon from '@/components/EmptyStateIcon';
import { DeleteIcon, LocationIcon, NavStoryIcon, ShareIcon } from '@/components/icons/NianNianIcons';
import { useAppreciateMode } from '@/components/providers/appreciate-mode-provider';
import { useSharePoster } from '@/hooks/useSharePoster';
import { useAppDialog } from '@/components/providers/app-dialog-provider';

interface Story {
  id: string;
  family_id: string;
  title: string;
  description: string;
  summary?: string;
  family_name?: string;
  theme?: string;
  created_at: string;
  photos?: string[];
  read_count?: number;
}

interface FamilyOption {
  id: string;
  name: string;
}

export default function StoriesPage() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [families, setFamilies] = useState<FamilyOption[]>([]);
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [photoUrlsByStory, setPhotoUrlsByStory] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { openSharePoster, modal: shareModal } = useSharePoster();
  const { confirm, alert, showLoading, hideLoading } = useAppDialog();
  const appreciate = useAppreciateMode();

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const familyRes = await fetch('/api/family');
        const familyData = await familyRes.json();
        const familyList: FamilyOption[] = familyData.families || [];
        if (!active) return;
        setFamilies(familyList);

        const allStories: Story[] = [];
        const urlsMap: Record<string, string[]> = {};

        for (const family of familyList) {
          const [storyRes, photosRes] = await Promise.all([
            fetch(`/api/story?familyId=${family.id}&publishedOnly=1`),
            fetch(`/api/photos?familyId=${family.id}`),
          ]);
          const storyData = await storyRes.json();
          const photosData = await photosRes.json();
          const photoMap = new Map(
            (photosData.photos || []).map((p: { id: string; url: string }) => [p.id, p.url])
          );

          for (const s of storyData.stories || []) {
            allStories.push({ ...s, family_name: family.name });
            urlsMap[s.id] = (s.photos || [])
              .map((id: string) => photoMap.get(id))
              .filter(Boolean) as string[];
          }
        }
        if (!active) return;
        setStories(allStories);
        setPhotoUrlsByStory(urlsMap);
      } catch {
        // 静默处理
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filteredStories =
    themeFilter === 'all'
      ? stories
      : stories.filter((s) => s.family_id === themeFilter);

  const handleShare = async (story: Story) => {
    setSharingId(story.id);
    try {
      let photoUrls = photoUrlsByStory[story.id] || [];
      if (photoUrls.length === 0) {
        try {
          const res = await fetch(`/api/story?storyId=${story.id}`);
          const data = await res.json();
          if (res.ok && data.story?.photos_detail) {
            photoUrls = data.story.photos_detail.map((p: { url: string }) => p.url);
          }
        } catch {
          // ignore
        }
      }

      await openSharePoster({
        type: 'story',
        storyId: story.id,
        title: story.title,
        summary: story.summary || story.description,
        familyName: story.family_name || '',
        photoUrls,
      });
    } finally {
      setSharingId(null);
    }
  };

  const handleDelete = async (story: Story) => {
    const ok = await confirm({
      title: '删除这个故事？',
      description: `将永久删除「${story.title}」，此操作不可恢复。`,
      confirmText: '确认删除',
      cancelText: '取消',
      destructive: true,
    });
    if (!ok) return;

    setDeletingId(story.id);
    showLoading('正在删除', `移除「${story.title}」…`);
    try {
      const res = await fetch(`/api/story?storyId=${story.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '删除失败');
      setStories((prev) => prev.filter((s) => s.id !== story.id));
    } catch (err) {
      await alert({
        title: '删除失败',
        description: err instanceof Error ? err.message : '请稍后重试',
      });
    } finally {
      hideLoading();
      setDeletingId(null);
    }
  };

  return (
    <PageShell className={`bg-[#FFFBF6]${appreciate ? ' text-lg' : ''}`}>
      {shareModal}

      <header className="relative mb-5 px-0.5">
        <div className="text-center">
          <h1
            className={`font-serif font-bold text-[#4A3326] leading-snug m-0 ${
              appreciate ? 'text-[32px]' : 'text-[28px]'
            }`}
          >
            家庭故事
          </h1>
          <p className="text-[13px] text-[#8E7B6B] mt-1 mb-0 leading-relaxed">
            来自记忆卡，不是你的相册流水账
          </p>
        </div>
        {!appreciate && (
          <Link
            href="/family"
            className="absolute top-0 right-0 inline-flex items-center justify-center h-10 px-4 rounded-2xl bg-[#DF8B3A] text-white text-sm font-medium hover:bg-[#C47A3A] transition-colors active:scale-[0.98]"
          >
            + 记录故事
          </Link>
        )}
      </header>

      {families.length > 1 && (
        <div className="max-w-md mx-auto mb-5">
          <p className="text-xs text-[#8E7B6B] mb-2">按主题筛选</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setThemeFilter('all')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${
                themeFilter === 'all'
                  ? 'bg-[#DF8B3A] text-white'
                  : 'bg-white border border-[#EFE4D6] text-[#8E7B6B]'
              }`}
            >
              全部主题
            </button>
            {families.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setThemeFilter(f.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${
                  themeFilter === f.id
                    ? 'bg-[#DF8B3A] text-white'
                    : 'bg-white border border-[#EFE4D6] text-[#8E7B6B]'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-[#DF8B3A]/30 border-t-[#DF8B3A] rounded-full animate-spin" />
        </div>
      ) : filteredStories.length === 0 ? (
        <div className="py-16">
          <EmptyStateIcon
            icon={NavStoryIcon}
            title="还没有已发布的故事"
            description="在主题管理的草稿箱里编辑并发布后，会出现在这里"
          />
          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/family')}
              className="mt-6 px-6 py-3 rounded-2xl bg-[#DF8B3A] text-white text-sm font-medium hover:bg-[#C47A3A] transition-all active:scale-[0.98]"
            >
              去我的主题
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8 max-w-md mx-auto pb-8">
          {filteredStories.map((story) => {
            const photoUrls = photoUrlsByStory[story.id] || [];
            const memoryCount = photoUrls.length;

            return (
              <div key={story.id} className="relative">
                <StoryListCard
                  title={story.title}
                  summary={story.summary || story.description}
                  photoUrls={photoUrls}
                  memoryCount={memoryCount}
                  status="published"
                  onClick={() =>
                    router.push(
                      appreciate
                        ? `/stories/${story.id}?appreciate=1`
                        : `/stories/${story.id}`
                    )
                  }
                />

                <div className="mt-4 flex flex-col gap-3">
                  {appreciate ? (
                    <>
                      <button
                        type="button"
                        onClick={() => router.push(`/stories/${story.id}/play?appreciate=1`)}
                        className="w-full h-[52px] inline-flex items-center justify-center gap-2 rounded-2xl bg-[#DF8B3A] text-white text-base font-medium hover:bg-[#C47A3A] transition-all active:scale-[0.98]"
                      >
                        ▶ 自动播放
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/stories/${story.id}?appreciate=1`)}
                        className="w-full h-12 inline-flex items-center justify-center rounded-2xl border border-[#EFE4D6] text-[#8E7B6B] text-base active:scale-[0.98]"
                      >
                        阅读全文
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => router.push(`/stories/${story.id}`)}
                        className="w-full h-[52px] inline-flex items-center justify-center gap-2 rounded-2xl bg-[#DF8B3A] text-white text-base font-medium hover:bg-[#C47A3A] transition-all active:scale-[0.98] touch-manipulation"
                      >
                        <NavStoryIcon size={18} />
                        查看故事详情
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShare(story)}
                        disabled={sharingId === story.id}
                        className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#22C55E] text-white text-base font-medium hover:bg-[#16A34A] disabled:opacity-50 transition-all active:scale-[0.98] touch-manipulation"
                      >
                        <ShareIcon size={18} />
                        {sharingId === story.id ? '生成中…' : '分享'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(story)}
                        disabled={deletingId === story.id || sharingId === story.id}
                        className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-2xl border border-[#FFD6C7] text-[#FF4D4F] text-base font-medium hover:bg-red-50 disabled:opacity-50 transition-all active:scale-[0.98] touch-manipulation"
                      >
                        <DeleteIcon size={18} />
                        {deletingId === story.id ? '删除中…' : '删除故事'}
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 mt-3 text-[13px] text-[#8E7B6B]">
                  <span className="inline-flex items-center gap-1 min-w-0 truncate">
                    {story.family_name && (
                      <>
                        <LocationIcon size={14} className="shrink-0" />
                        {story.family_name}
                      </>
                    )}
                  </span>
                  <span className="shrink-0">{story.created_at?.slice(0, 10)}</span>
                  <span className="shrink-0">
                    {(story.read_count ?? 0) > 0
                      ? `${story.read_count} 人读过`
                      : '还没有人读过'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
