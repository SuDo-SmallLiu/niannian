'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import FamilySectionTabs from '@/components/FamilySectionTabs';
import MemoryCardStatusBadge from '@/components/MemoryCardStatusBadge';
import MemoryCardCompletionBar from '@/components/MemoryCardCompletionBar';
import { useAppreciateMode } from '@/components/providers/appreciate-mode-provider';
import { useNianNianAgentOverride } from '@/components/providers/niannian-agent-provider';
import PipelineSteps from '@/components/PipelineSteps';
import { aggregateCompletion } from '@/lib/memory-card-completion';

interface SearchResult {
  photo_id: string;
  memory_card_id: string | null;
  family_id: string;
  family_name: string;
  photo_url: string;
  taken_at: string;
  location: string;
  people: string[];
  tags: string[];
  action: string;
  significance: string;
  analysis_status: string;
  story_ids: string[];
}

interface SearchFilters {
  q: string;
  location: string;
  people: string;
  analysisStatus: 'all' | 'analyzed' | 'pending';
}

const PAGE_SIZE = 24;

function defaultFilters(): SearchFilters {
  return { q: '', location: '', people: '', analysisStatus: 'all' };
}

export default function AllMemoriesPage() {
  const appreciate = useAppreciateMode();
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [draft, setDraft] = useState<SearchFilters>(defaultFilters);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const fetchSearch = useCallback(
    async (nextFilters: SearchFilters, offset: number, append: boolean) => {
      const params = new URLSearchParams();
      if (nextFilters.q.trim()) params.set('q', nextFilters.q.trim());
      if (nextFilters.location.trim()) params.set('location', nextFilters.location.trim());
      if (nextFilters.people.trim()) params.set('people', nextFilters.people.trim());
      if (nextFilters.analysisStatus !== 'all') {
        params.set('analysisStatus', nextFilters.analysisStatus);
      }
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(offset));

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '搜索失败');
      }

      setTotal(data.total ?? 0);
      setResults((prev) => (append ? [...prev, ...(data.results || [])] : data.results || []));
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError('');
      try {
        await fetchSearch(filters, 0, false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '搜索失败');
          setResults([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [filters, fetchSearch]);

  const hasMore = results.length < total;

  const quickPeople = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of results) {
      for (const person of item.people) {
        counts.set(person, (counts.get(person) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name);
  }, [results]);

  const applyDraft = () => setFilters({ ...draft });

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await fetchSearch(filters, results.length, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载更多失败');
    } finally {
      setLoadingMore(false);
    }
  };

  const hasActiveFilters =
    filters.q || filters.location || filters.people || filters.analysisStatus !== 'all';

  const pendingCount = useMemo(
    () => results.filter((r) => r.analysis_status !== 'analyzed').length,
    [results]
  );
  const analyzedCount = useMemo(
    () => results.filter((r) => r.analysis_status === 'analyzed').length,
    [results]
  );
  const completionAvg = useMemo(
    () =>
      aggregateCompletion(
        results.map((r) => ({
          analysis_status: r.analysis_status,
          significance: r.significance,
        }))
      ),
    [results]
  );

  useNianNianAgentOverride({
    pendingCount,
    analyzedCount,
    completionAvg,
    photoCount: total,
  });

  return (
    <div className={`min-h-screen bg-[#F8F4ED] px-6 pt-6 pb-24 ${appreciate ? 'text-lg' : ''}`}>
      {!appreciate && <FamilySectionTabs />}

      <div className="text-center mb-6 animate-fade-in-up">
        <h1 className={`font-serif text-[#4B3B2F] mb-1 ${appreciate ? 'text-3xl' : 'text-2xl'}`}>
          {appreciate ? '家庭照片' : '家庭记忆'}
        </h1>
        <p className="text-sm text-[#B8A898] mb-3">
          {appreciate ? '翻阅珍贵瞬间' : '照片变记忆卡，念念理解 + 你补充'}
        </p>
        {!appreciate && <PipelineSteps active={1} compact />}
      </div>

      <div className="mb-6 space-y-3 animate-fade-in-up delay-100">
        <input
          type="search"
          value={draft.q}
          onChange={(e) => setDraft((prev) => ({ ...prev, q: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && applyDraft()}
          placeholder="搜索人物、地点、标签、行为…"
          className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E8DCC8] text-sm text-[#4B3B2F] placeholder:text-[#D8CCB8] focus:outline-none focus:border-[#D98A45]/50"
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={draft.location}
            onChange={(e) => setDraft((prev) => ({ ...prev, location: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && applyDraft()}
            placeholder="地点"
            className="px-4 py-2.5 rounded-xl bg-white border border-[#E8DCC8] text-sm text-[#4B3B2F] placeholder:text-[#D8CCB8] focus:outline-none focus:border-[#D98A45]/50"
          />
          <input
            type="text"
            value={draft.people}
            onChange={(e) => setDraft((prev) => ({ ...prev, people: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && applyDraft()}
            placeholder="人物"
            className="px-4 py-2.5 rounded-xl bg-white border border-[#E8DCC8] text-sm text-[#4B3B2F] placeholder:text-[#D8CCB8] focus:outline-none focus:border-[#D98A45]/50"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(
            [
              { value: 'all', label: '全部' },
              { value: 'analyzed', label: '已解析' },
              { value: 'pending', label: '待解析' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                const next = { ...draft, analysisStatus: opt.value };
                setDraft(next);
                setFilters(next);
              }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs transition-all ${
                draft.analysisStatus === opt.value
                  ? 'bg-[#D98A45] text-white'
                  : 'bg-white border border-[#E8DCC8] text-[#8B7355]'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={applyDraft}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs bg-[#4B3B2F] text-white"
          >
            搜索
          </button>
        </div>

        {quickPeople.length > 0 && (
          <div>
            <p className="text-[10px] text-[#B8A898] mb-1.5">快捷人物</p>
            <div className="flex flex-wrap gap-1.5">
              {quickPeople.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    const next = { ...filters, people: name, q: '' };
                    setDraft(next);
                    setFilters(next);
                  }}
                  className="px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-700"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-[#B8A898]">
          <span>
            {hasActiveFilters
              ? `找到 ${total} 张照片`
              : `共 ${total} 张照片`}
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                const next = defaultFilters();
                setDraft(next);
                setFilters(next);
              }}
              className="text-[#D98A45] hover:underline underline-offset-2"
            >
              清除筛选
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-[#D98A45]/30 border-t-[#D98A45] rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            type="button"
            onClick={() => setFilters({ ...filters })}
            className="text-sm text-[#D98A45] underline underline-offset-2"
          >
            重试
          </button>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">🔍</p>
          <p className="text-[#B8A898] text-sm">没有匹配的照片</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
            {results.map((item) => (
              <Link
                key={item.photo_id}
                href={
                  appreciate
                    ? `/family/${item.family_id}/photos/${item.photo_id}?appreciate=1`
                    : `/family/${item.family_id}/photos/${item.photo_id}`
                }
                className="bg-white rounded-2xl overflow-hidden border border-[#E8DCC8] shadow-sm hover:shadow-md hover:border-[#D98A45]/30 transition-all active:scale-[0.98]"
              >
                <div className="aspect-square relative bg-[#F0E8D8]">
                  <img
                    src={item.photo_url}
                    alt={item.people.join('、') || '照片'}
                    className="w-full h-full object-cover"
                  />
                  {item.analysis_status === 'analyzed' ? (
                    <MemoryCardStatusBadge
                      card={{
                        analysis_status: item.analysis_status,
                        significance: item.significance,
                      }}
                      className="absolute top-2 right-2"
                    />
                  ) : (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/40 text-white text-[10px]">
                      待解析
                    </span>
                  )}
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/45 text-white text-[10px] max-w-[85%] truncate">
                    {item.family_name}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-xs text-[#4B3B2F] font-medium truncate">
                    {item.people.join('、') || '未知人物'}
                  </p>
                  <p className="text-[10px] text-[#B8A898] truncate mt-0.5">
                    {[item.taken_at, item.location, item.action].filter(Boolean).join(' · ') ||
                      '点击查看记忆卡'}
                  </p>
                  {item.analysis_status === 'analyzed' && (
                    <div className="mt-2">
                      <MemoryCardCompletionBar
                        compact
                        card={{
                          analysis_status: item.analysis_status,
                          significance: item.significance,
                        }}
                      />
                    </div>
                  )}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {item.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 rounded-full bg-[#FFF8F0] text-[10px] text-[#D98A45]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-3 rounded-2xl bg-white border border-[#E8DCC8] text-sm text-[#8B7355] hover:border-[#D98A45]/40 disabled:opacity-60"
              >
                {loadingMore ? '加载中…' : `加载更多（${results.length}/${total}）`}
              </button>
            </div>
          )}
        </>
      )}

      {!appreciate && (
        <div className="mt-8 flex gap-3 max-w-md mx-auto">
          <Link
            href="/stories"
            className="flex-1 py-3 rounded-2xl bg-white border border-[#E8DCC8] text-center text-sm text-[#8B7355]"
          >
            查看故事 →
          </Link>
          <Link
            href="/family"
            className="flex-1 py-3 rounded-2xl bg-[#D98A45] text-center text-sm text-white"
          >
            按主题管理
          </Link>
        </div>
      )}

    </div>
  );
}
