'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import MemoryCardFilter from '@/components/MemoryCardFilter';
import { useAppDialog } from '@/components/providers/app-dialog-provider';
import {
  type FilterablePhoto,
  type MemoryCardFilters,
  filterMemoryCards,
  collectFilterOptions,
  defaultFilters,
} from '@/lib/memory-card-filter';

export default function PhotoLibraryPage() {
  const router = useRouter();
  const params = useParams();
  const familyId = params.id as string;
  const { confirm, showLoading, hideLoading, alert } = useAppDialog();

  const [photos, setPhotos] = useState<FilterablePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filters, setFilters] = useState<MemoryCardFilters>(defaultFilters());
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const loadPhotos = useCallback(async () => {
    try {
      const res = await fetch(`/api/photos?familyId=${familyId}`);
      if (!res.ok) {
        setLoadError('加载照片失败，请下拉刷新重试');
        return;
      }
      const data = await res.json();
      setPhotos(data.photos || []);
      setLoadError('');
    } catch {
      setLoadError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const filteredPhotos = useMemo(
    () => filterMemoryCards(photos, filters),
    [photos, filters]
  );

  const filterOptions = useMemo(() => collectFilterOptions(photos), [photos]);

  const analyzedCount = photos.filter((p) => p.memoryCard?.analysis_status === 'analyzed').length;
  const selectedCount = selectedIds.size;
  const allFilteredSelected =
    filteredPhotos.length > 0 && filteredPhotos.every((p) => selectedIds.has(p.id));

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (photoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredPhotos.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredPhotos.forEach((p) => next.add(p.id));
        return next;
      });
    }
  };

  const handleCardClick = (photo: FilterablePhoto) => {
    if (selectMode) {
      toggleSelect(photo.id);
      return;
    }
    router.push(`/family/${familyId}/photos/${photo.id}`);
  };

  const handleDeleteSelected = async () => {
    if (selectedCount === 0 || deleting) return;

    const ok = await confirm({
      title: `删除 ${selectedCount} 张记忆卡？`,
      description: '将同时删除照片文件、AI 解析结果和标签，且无法恢复。关联故事中的该照片也会被移除。',
      confirmText: '确认删除',
      cancelText: '取消',
      destructive: true,
    });
    if (!ok) return;

    setDeleting(true);
    showLoading('正在删除', `共 ${selectedCount} 张记忆卡…`);
    try {
      const res = await fetch('/api/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '删除失败');
      }

      setPhotos((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      exitSelectMode();

      if (data.deleted < data.requested) {
        await alert({
          title: '部分删除成功',
          description: `已删除 ${data.deleted}/${data.requested} 张，其余可能已不存在。`,
        });
      }
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

  return (
    <div className="min-h-screen bg-[#F8F4ED] px-6 pt-8 pb-24">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => (selectMode ? exitSelectMode() : router.push(`/family/${familyId}`))}
          className="text-[#B8A898] hover:text-[#8B7355] text-sm transition-colors"
        >
          {selectMode ? '取消' : '← 返回'}
        </button>

        {photos.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (selectMode) exitSelectMode();
              else setSelectMode(true);
            }}
            className={`text-sm px-3 py-1.5 rounded-full transition-all ${
              selectMode
                ? 'bg-[#4B3B2F] text-white'
                : 'bg-white border border-[#E8DCC8] text-[#8B7355]'
            }`}
          >
            {selectMode ? '退出整理' : '整理'}
          </button>
        )}
      </div>

      <div className="text-center mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-serif text-[#4B3B2F] mb-1">记忆卡</h1>
        <p className="text-sm text-[#B8A898]">
          {selectMode
            ? selectedCount > 0
              ? `已选 ${selectedCount} 张`
              : '点击卡片选择，可多选'
            : photos.length > 0
              ? `${analyzedCount}/${photos.length} 张已解析`
              : '上传照片后 AI 会生成记忆卡'}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-[#D98A45]/30 border-t-[#D98A45] rounded-full animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">🃏</p>
          {loadError ? (
            <p className="text-red-500 text-sm mb-4">{loadError}</p>
          ) : (
            <p className="text-[#B8A898] mb-4">还没有照片</p>
          )}
          <Link
            href={`/family/${familyId}/upload`}
            className="inline-block px-6 py-3 rounded-2xl bg-[#D98A45] text-white text-sm font-medium"
          >
            去上传照片
          </Link>
        </div>
      ) : (
        <>
          {selectMode && filteredPhotos.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={toggleSelectAllFiltered}
                className="text-sm text-[#D98A45] underline underline-offset-2"
              >
                {allFilteredSelected ? '取消全选' : `全选当前列表（${filteredPhotos.length}）`}
              </button>
            </div>
          )}

          <MemoryCardFilter
            filters={filters}
            onChange={setFilters}
            options={filterOptions}
            resultCount={filteredPhotos.length}
            totalCount={photos.length}
          />

          {filteredPhotos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-3">🔍</p>
              <p className="text-[#B8A898] text-sm mb-4">没有匹配的记忆卡</p>
              <button
                onClick={() => setFilters(defaultFilters())}
                className="text-sm text-[#D98A45] underline underline-offset-2"
              >
                清除筛选条件
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
              {filteredPhotos.map((photo) => {
                const selected = selectedIds.has(photo.id);
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => handleCardClick(photo)}
                    className={`text-left bg-white rounded-2xl overflow-hidden border shadow-sm transition-all active:scale-[0.98] ${
                      selected
                        ? 'border-[#D98A45] ring-2 ring-[#D98A45]/30'
                        : 'border-[#E8DCC8] hover:shadow-md hover:border-[#D98A45]/30'
                    }`}
                  >
                    <div className="aspect-square relative bg-[#F0E8D8]">
                      <img
                        src={photo.url}
                        alt={photo.original_name}
                        className="w-full h-full object-cover"
                      />
                      {selectMode && (
                        <span
                          className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                            selected
                              ? 'bg-[#D98A45] border-[#D98A45] text-white'
                              : 'bg-white/90 border-[#E8DCC8] text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                      )}
                      {photo.memoryCard?.analysis_status === 'analyzed' ? (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#D98A45] text-white text-[10px]">
                          已解析
                        </span>
                      ) : (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/40 text-white text-[10px]">
                          待解析
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      {photo.memoryCard ? (
                        <>
                          <p className="text-xs text-[#4B3B2F] font-medium truncate">
                            {photo.people.join('、') || '未知人物'}
                          </p>
                          <p className="text-[10px] text-[#B8A898] truncate mt-0.5">
                            {photo.location || photo.event || '点击查看记忆卡'}
                          </p>
                          {photo.memoryCard.emotions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {photo.memoryCard.emotions.slice(0, 2).map((e) => (
                                <span
                                  key={e}
                                  className="px-1.5 py-0.5 rounded-full bg-[#FFF8F0] text-[10px] text-[#D98A45]"
                                >
                                  {e}
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-[#B8A898]">等待 AI 解析</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {selectMode && selectedCount > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-6 z-40">
          <div className="max-w-md mx-auto">
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="block w-full py-4 rounded-2xl bg-red-500 text-white font-medium text-center hover:bg-red-600 disabled:opacity-60 transition-all shadow-lg shadow-red-500/20"
            >
              {deleting ? '删除中…' : `删除 ${selectedCount} 张记忆卡`}
            </button>
          </div>
        </div>
      )}

      {!selectMode && photos.length > 0 && analyzedCount < photos.length && (
        <div className="fixed bottom-20 left-0 right-0 px-6 z-40">
          <div className="max-w-md mx-auto">
            <Link
              href={`/family/${familyId}/analyze`}
              className="block w-full py-4 rounded-2xl bg-[#D98A45] text-white font-serif text-lg text-center hover:bg-[#C47A3A] transition-all shadow-lg shadow-[#D98A45]/20"
            >
              开始 AI 解析
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
