import {
  getMemoryCardByPhoto,
  getPhoto,
  getStoryMemoryCards,
  getLatestStoryVersion,
} from '@/lib/db';
import type { Valence, Arousal } from '@/lib/affect-theory';

export interface SegmentAffect {
  archetype?: string;
  emotions?: string[];
  valence?: Valence;
  arousal?: Arousal;
}

export interface StorySegment {
  photoId: string;
  memorySnippet: string;
  narrative: string;
  /** 记忆卡情动推测，用于配乐 */
  affect?: SegmentAffect;
  /** 展示用：人物 / 地点 / 时间 */
  meta?: {
    people: string[];
    location: string;
    taken_at: string;
    action: string;
  };
}

function extractAffect(card: ReturnType<typeof getMemoryCardByPhoto>): SegmentAffect | undefined {
  if (!card) return undefined;
  const understanding = card.understanding as
    | {
        archetype?: string;
        emotions?: string[];
        valence?: Valence;
        arousal?: Arousal;
      }
    | undefined;
  const emotions =
    understanding?.emotions?.length ? understanding.emotions : card.emotions || [];
  const archetype = understanding?.archetype?.trim();
  if (!archetype && emotions.length === 0 && !understanding?.valence) {
    return undefined;
  }
  return {
    archetype: archetype || undefined,
    emotions,
    valence: understanding?.valence,
    arousal: understanding?.arousal,
  };
}

function buildSnippet(card: ReturnType<typeof getMemoryCardByPhoto>): string {
  if (!card) return '';
  const parts = [card.action, card.location, card.taken_at].filter(Boolean);
  return parts.join(' · ');
}

function buildNarrative(
  segmentNarrative: string,
  card: ReturnType<typeof getMemoryCardByPhoto>,
  storySummary?: string
): string {
  if (segmentNarrative?.trim()) return segmentNarrative.trim();
  if (card?.significance?.trim()) return card.significance.trim();
  if (card?.user_notes?.trim()) return card.user_notes.trim();
  if (card?.action?.trim()) return card.action.trim();
  return storySummary?.trim() || '';
}

/** 优先 version.content，否则从 memory_cards 组装章节 */
export function getStorySegments(
  storyId: string,
  photoIds: string[],
  storySummary?: string
): StorySegment[] {
  const version = getLatestStoryVersion(storyId);
  const versionSegments = Array.isArray(version?.content) ? version.content : [];

  const links = getStoryMemoryCards(storyId);
  const orderedPhotoIds =
    links.length > 0
      ? links
          .sort((a, b) => a.order_index - b.order_index)
          .map((l) => l.memory_card_id)
      : photoIds;

  const segmentByPhoto = new Map<string, { memorySnippet?: string; narrative?: string }>();
  for (const seg of versionSegments) {
    if (seg && typeof seg === 'object' && 'photoId' in seg) {
      const s = seg as { photoId: string; memorySnippet?: string; narrative?: string };
      segmentByPhoto.set(s.photoId, s);
    }
  }

  return orderedPhotoIds.map((photoId) => {
    const card = getMemoryCardByPhoto(photoId);
    const fromVersion = segmentByPhoto.get(photoId);

    return {
      photoId,
      memorySnippet: fromVersion?.memorySnippet || buildSnippet(card),
      narrative: buildNarrative(fromVersion?.narrative || '', card, storySummary),
      affect: extractAffect(card),
      meta: card
        ? {
            people: card.people || [],
            location: card.location || '',
            taken_at: card.taken_at || '',
            action: card.action || '',
          }
        : undefined,
    };
  });
}

export function getStoryPhotosDetail(familyId: string, photoIds: string[]) {
  return photoIds
    .map((id) => {
      const photo = getPhoto(id);
      if (!photo || photo.family_id !== familyId) return null;
      const card = getMemoryCardByPhoto(id);
      return {
        id: photo.id,
        url: photo.url,
        people: card?.people || [],
        location: card?.location || photo.location || '',
        taken_at: card?.taken_at || photo.taken_at || '',
        action: card?.action || photo.event || '',
        significance: card?.significance || '',
        affect: extractAffect(card),
      };
    })
    .filter(Boolean);
}
