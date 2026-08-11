'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  type MemoryCardFilters,
  type AnalysisFilter,
  defaultFilters,
} from '@/lib/memory-card-filter';

interface FilterOptions {
  tags: Array<{ value: string; layer: number; count: number }>;
  people: Array<[string, number]>;
  emotions: Array<[string, number]>;
  locations: Array<[string, number]>;
  times: Array<[string, number]>;
}

interface MemoryCardFilterProps {
  filters: MemoryCardFilters;
  onChange: (filters: MemoryCardFilters) => void;
  options: FilterOptions;
  resultCount: number;
  totalCount: number;
}

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export default function MemoryCardFilter({
  filters,
  onChange,
  options,
  resultCount,
  totalCount,
}: MemoryCardFilterProps) {
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setVoiceSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  const update = useCallback(
    (patch: Partial<MemoryCardFilters>) => onChange({ ...filters, ...patch }),
    [filters, onChange]
  );

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) update({ query: transcript });
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const hasActiveFilters =
    filters.query ||
    filters.analysisStatus !== 'all' ||
    filters.tagValues.length > 0 ||
    filters.layer !== null ||
    filters.personTag ||
    filters.locationTag ||
    filters.timeTag;

  const statusOptions: { value: AnalysisFilter; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'analyzed', label: '已解析' },
    { value: 'pending', label: '待解析' },
  ];

  return (
    <div className="mb-6 space-y-3 animate-fade-in-up delay-100">
      {/* 搜索栏 + 语音 */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="search"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
            placeholder="搜索人物、地点、情绪、标签…"
            className="w-full px-4 py-3 pr-10 rounded-2xl bg-white border border-[#E8DCC8] text-sm text-[#4B3B2F] placeholder:text-[#D8CCB8] focus:outline-none focus:border-[#D98A45]/50"
          />
          {filters.query && (
            <button
              onClick={() => update({ query: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B8A898] hover:text-[#D98A45] text-xs"
            >
              ✕
            </button>
          )}
        </div>
        {voiceSupported && (
          <button
            onClick={startVoiceSearch}
            title="语音检索"
            className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              listening
                ? 'bg-[#D98A45] text-white animate-pulse shadow-lg shadow-[#D98A45]/30'
                : 'bg-white border border-[#E8DCC8] text-[#8B7355] hover:border-[#D98A45]/40'
            }`}
          >
            🎤
          </button>
        )}
      </div>

      {listening && (
        <p className="text-xs text-[#D98A45] text-center animate-pulse">正在听你说…</p>
      )}

      {/* 解析状态筛选 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => update({ analysisStatus: opt.value })}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs transition-all ${
              filters.analysisStatus === opt.value
                ? 'bg-[#D98A45] text-white'
                : 'bg-white border border-[#E8DCC8] text-[#8B7355]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 时间 / 人物 / 地点 标签检索 */}
      {(options.times.length > 0 || options.people.length > 0 || options.locations.length > 0) && (
        <div className="bg-white rounded-2xl p-4 border border-[#E8DCC8] space-y-3">
          {options.times.length > 0 && (
            <div>
              <p className="text-[10px] text-[#B8A898] mb-1.5">时间</p>
              <div className="flex flex-wrap gap-1.5">
                {options.times.slice(0, 8).map(([year]) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() =>
                      update({ timeTag: filters.timeTag === year ? null : year })
                    }
                    className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                      filters.timeTag === year
                        ? 'bg-[#D98A45] text-white'
                        : 'bg-[#FFF8F0] text-[#8B7355] border border-[#F0DCC8]'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          )}
          {options.people.length > 0 && (
            <div>
              <p className="text-[10px] text-[#B8A898] mb-1.5">人物</p>
              <div className="flex flex-wrap gap-1.5">
                {options.people.slice(0, 10).map(([name]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() =>
                      update({ personTag: filters.personTag === name ? null : name })
                    }
                    className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                      filters.personTag === name
                        ? 'bg-[#D98A45] text-white'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {options.locations.length > 0 && (
            <div>
              <p className="text-[10px] text-[#B8A898] mb-1.5">地点</p>
              <div className="flex flex-wrap gap-1.5">
                {options.locations.slice(0, 10).map(([loc]) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() =>
                      update({ locationTag: filters.locationTag === loc ? null : loc })
                    }
                    className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                      filters.locationTag === loc
                        ? 'bg-[#D98A45] text-white'
                        : 'bg-green-50 text-green-700'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 结果统计 + 清除 */}
      <div className="flex items-center justify-between text-xs text-[#B8A898]">
        <span>
          {hasActiveFilters
            ? `找到 ${resultCount} / ${totalCount} 张记忆卡`
            : `共 ${totalCount} 张记忆卡`}
        </span>
        {hasActiveFilters && (
          <button
            onClick={() => onChange(defaultFilters())}
            className="text-[#D98A45] hover:underline underline-offset-2"
          >
            清除筛选
          </button>
        )}
      </div>
    </div>
  );
}
