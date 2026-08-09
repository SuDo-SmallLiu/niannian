'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, MapPin, User } from 'lucide-react';
import type { GlobalMemoryFacets } from '@/lib/global-memory-search';

export interface GlobalMemoryFilters {
  q: string;
  time: string;
  people: string;
  location: string;
  analysisStatus: 'all' | 'analyzed' | 'pending';
}

export function defaultGlobalMemoryFilters(): GlobalMemoryFilters {
  return { q: '', time: '', people: '', location: '', analysisStatus: 'all' };
}

type DropdownKey = 'time' | 'people' | 'location' | null;

interface GlobalMemoryFilterBarProps {
  draft: GlobalMemoryFilters;
  applied: GlobalMemoryFilters;
  onDraftChange: (next: GlobalMemoryFilters) => void;
  onFiltersChange: (next: GlobalMemoryFilters) => void;
  onApply: () => void;
  onClear: () => void;
  facets: GlobalMemoryFacets;
  total: number;
  resultCount: number;
}

function FilterDropdown({
  label,
  icon: Icon,
  active,
  open,
  onToggle,
  children,
}: {
  label: string;
  icon: typeof Calendar;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-center gap-1 px-2 py-2.5 rounded-xl border text-xs transition-all ${
          active || open
            ? 'border-[#D98A45] bg-[#FFF8F0] text-[#D98A45]'
            : 'border-[#E8DCC8] bg-white text-[#8B7355]'
        }`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{label}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-48 overflow-y-auto rounded-xl bg-white border border-[#E8DCC8] shadow-lg py-1">
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownOption({
  label,
  count,
  selected,
  onSelect,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 hover:bg-[#FFF8F0] ${
        selected ? 'text-[#D98A45] font-medium bg-[#FFF8F0]' : 'text-[#4B3B2F]'
      }`}
    >
      <span className="truncate">{label}</span>
      {count !== undefined && <span className="text-[#B8A898] shrink-0">{count}</span>}
    </button>
  );
}

export default function GlobalMemoryFilterBar({
  draft,
  applied,
  onDraftChange,
  onFiltersChange,
  onApply,
  onClear,
  facets,
  total,
  resultCount,
}: GlobalMemoryFilterBarProps) {
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const patch = (partial: Partial<GlobalMemoryFilters>) => {
    onDraftChange({ ...draft, ...partial });
  };

  const toggleDropdown = (key: DropdownKey) => {
    setOpenDropdown((prev) => (prev === key ? null : key));
  };

  const selectAndClose = (partial: Partial<GlobalMemoryFilters>) => {
    const next = { ...draft, ...partial };
    onFiltersChange(next);
    setOpenDropdown(null);
  };

  const selectedTags: Array<{ key: keyof GlobalMemoryFilters; label: string }> = [];
  if (applied.time) {
    selectedTags.push({ key: 'time', label: `${applied.time}年` });
  }
  if (applied.people) {
    selectedTags.push({ key: 'people', label: applied.people });
  }
  if (applied.location) {
    selectedTags.push({ key: 'location', label: applied.location });
  }

  const hasTagFilters = selectedTags.length > 0;
  const hasActiveFilters =
    applied.q ||
    applied.time ||
    applied.people ||
    applied.location ||
    applied.analysisStatus !== 'all';

  const timeLabel = draft.time ? `${draft.time}年` : '时间';
  const peopleLabel = draft.people || '人物';
  const locationLabel = draft.location || '地点';

  return (
    <div ref={containerRef} className="mb-6 space-y-3 animate-fade-in-up delay-100">
      <input
        type="search"
        value={draft.q}
        onChange={(e) => patch({ q: e.target.value })}
        onKeyDown={(e) => e.key === 'Enter' && onApply()}
        placeholder="搜索人物、地点、标签、行为…"
        className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E8DCC8] text-sm text-[#4B3B2F] placeholder:text-[#D8CCB8] focus:outline-none focus:border-[#D98A45]/50"
      />

      {/* 时间 / 人物 / 地点 下拉 */}
      <div className="flex gap-2">
        <FilterDropdown
          label={timeLabel}
          icon={Calendar}
          active={!!draft.time}
          open={openDropdown === 'time'}
          onToggle={() => toggleDropdown('time')}
        >
          <DropdownOption
            label="不限时间"
            selected={!draft.time}
            onSelect={() => selectAndClose({ time: '' })}
          />
          {facets.times.map((item) => (
            <DropdownOption
              key={item.value}
              label={item.label}
              count={item.count}
              selected={draft.time === item.value}
              onSelect={() => selectAndClose({ time: item.value })}
            />
          ))}
          {facets.times.length === 0 && (
            <p className="px-3 py-2 text-xs text-[#B8A898]">暂无时间数据</p>
          )}
        </FilterDropdown>

        <FilterDropdown
          label={peopleLabel}
          icon={User}
          active={!!draft.people}
          open={openDropdown === 'people'}
          onToggle={() => toggleDropdown('people')}
        >
          <DropdownOption
            label="不限人物"
            selected={!draft.people}
            onSelect={() => selectAndClose({ people: '' })}
          />
          {facets.people.map((item) => (
            <DropdownOption
              key={item.value}
              label={item.value}
              count={item.count}
              selected={draft.people === item.value}
              onSelect={() => selectAndClose({ people: item.value })}
            />
          ))}
          {facets.people.length === 0 && (
            <p className="px-3 py-2 text-xs text-[#B8A898]">暂无人物数据</p>
          )}
        </FilterDropdown>

        <FilterDropdown
          label={locationLabel}
          icon={MapPin}
          active={!!draft.location}
          open={openDropdown === 'location'}
          onToggle={() => toggleDropdown('location')}
        >
          <DropdownOption
            label="不限地点"
            selected={!draft.location}
            onSelect={() => selectAndClose({ location: '' })}
          />
          {facets.locations.map((item) => (
            <DropdownOption
              key={item.value}
              label={item.value}
              count={item.count}
              selected={draft.location === item.value}
              onSelect={() => selectAndClose({ location: item.value })}
            />
          ))}
          {facets.locations.length === 0 && (
            <p className="px-3 py-2 text-xs text-[#B8A898]">暂无地点数据</p>
          )}
        </FilterDropdown>
      </div>

      {/* 解析状态 + 筛选按钮 */}
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
              onFiltersChange(next);
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
          onClick={onApply}
          className="shrink-0 px-3 py-1.5 rounded-full text-xs bg-[#4B3B2F] text-white flex items-center gap-1"
        >
          筛选
        </button>
      </div>

      {/* 已选条件 */}
      {hasTagFilters && (
        <div className="flex items-start gap-2 flex-wrap bg-white rounded-xl border border-[#E8DCC8] px-3 py-2.5">
          <span className="text-xs text-[#B8A898] shrink-0 pt-0.5">已选条件:</span>
          <div className="flex flex-wrap gap-1.5 flex-1">
            {selectedTags.map((tag) => (
              <button
                key={tag.key}
                type="button"
                onClick={() => {
                  const next = { ...applied, [tag.key]: '' };
                  onFiltersChange(next);
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F0E8D8] text-xs text-[#4B3B2F]"
              >
                {tag.label}
                <span className="text-[#B8A898]">×</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-[#D98A45] shrink-0 hover:underline underline-offset-2"
          >
            清空
          </button>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-[#B8A898]">
        <span>
          {hasActiveFilters
            ? `找到 ${resultCount} 张记忆卡`
            : `共 ${total} 张记忆卡`}
        </span>
        {hasActiveFilters && !hasTagFilters && (
          <button
            type="button"
            onClick={onClear}
            className="text-[#D98A45] hover:underline underline-offset-2"
          >
            清除筛选
          </button>
        )}
      </div>
    </div>
  );
}
