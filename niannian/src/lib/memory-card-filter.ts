export interface MemoryCardTag {
  layer: number;
  key: string;
  value: string;
}

export interface FilterablePhoto {
  id: string;
  url: string;
  original_name: string;
  people: string[];
  location: string;
  event: string;
  taken_at?: string;
  source_type?: string;
  source_metadata?: {
    takenAtFormatted?: string;
    location?: string;
    description?: string;
    people?: string[];
    deviceType?: string;
  };
  memoryCard: {
    analysis_status: string;
    taken_at?: string;
    location?: string;
    people?: string[];
    action?: string;
    emotions: string[];
    changes: string[];
    significance?: string;
  } | null;
  tags?: MemoryCardTag[];
}

export type AnalysisFilter = 'all' | 'analyzed' | 'pending';

export interface MemoryCardFilters {
  query: string;
  analysisStatus: AnalysisFilter;
  tagValues: string[];
  layer: number | null;
}

export const LAYER_LABELS: Record<number, string> = {
  1: '客观',
  2: '行为',
  3: '变化',
  4: '家庭价值',
};

export function defaultFilters(): MemoryCardFilters {
  return { query: '', analysisStatus: 'all', tagValues: [], layer: null };
}

function searchableText(photo: FilterablePhoto): string {
  const mc = photo.memoryCard;
  const src = photo.source_metadata;
  const parts = [
    photo.original_name,
    photo.location,
    photo.event,
    photo.taken_at,
    ...photo.people,
    mc?.action,
    mc?.location,
    mc?.taken_at,
    mc?.significance,
    ...(mc?.people || []),
    ...(mc?.emotions || []),
    ...(mc?.changes || []),
    ...(photo.tags?.map((t) => t.value) || []),
    src?.takenAtFormatted,
    src?.location,
    src?.description,
    src?.deviceType,
    ...(src?.people || []),
  ];
  return parts.filter(Boolean).join(' ').toLowerCase();
}

export function filterMemoryCards(
  photos: FilterablePhoto[],
  filters: MemoryCardFilters
): FilterablePhoto[] {
  const q = filters.query.trim().toLowerCase();

  return photos.filter((photo) => {
    if (filters.analysisStatus === 'analyzed') {
      if (photo.memoryCard?.analysis_status !== 'analyzed') return false;
    } else if (filters.analysisStatus === 'pending') {
      if (photo.memoryCard?.analysis_status === 'analyzed') return false;
    }

    if (filters.tagValues.length > 0) {
      const photoTagValues = (photo.tags || []).map((t) => t.value);
      const hasTag = filters.tagValues.some((v) => photoTagValues.includes(v));
      if (!hasTag) return false;
    }

    if (filters.layer !== null) {
      const hasLayer = (photo.tags || []).some((t) => t.layer === filters.layer);
      if (!hasLayer) return false;
    }

    if (!q) return true;

    return searchableText(photo).includes(q);
  });
}

export function collectFilterOptions(photos: FilterablePhoto[]) {
  const tagMap = new Map<string, { value: string; layer: number; count: number }>();
  const people = new Map<string, number>();
  const emotions = new Map<string, number>();

  for (const photo of photos) {
    for (const person of photo.people) {
      people.set(person, (people.get(person) || 0) + 1);
    }
    for (const e of photo.memoryCard?.emotions || []) {
      emotions.set(e, (emotions.get(e) || 0) + 1);
    }
    for (const tag of photo.tags || []) {
      const key = `${tag.layer}:${tag.value}`;
      const existing = tagMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        tagMap.set(key, { value: tag.value, layer: tag.layer, count: 1 });
      }
    }
  }

  return {
    tags: Array.from(tagMap.values()).sort((a, b) => a.layer - b.layer || b.count - a.count),
    people: Array.from(people.entries()).sort((a, b) => b[1] - a[1]),
    emotions: Array.from(emotions.entries()).sort((a, b) => b[1] - a[1]),
  };
}
