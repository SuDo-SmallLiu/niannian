import {
  createStoryVersion,
  getLatestStoryVersion,
  getNextStoryVersionNumber,
  getStory,
  getStoryMemoryCards,
  setStoryMemoryCards,
  updateStoryFields,
} from '@/lib/db';
import type { StorySegment } from '@/lib/story-segments';

export interface PatchStoryInput {
  storyId: string;
  title?: string;
  summary?: string;
  photoOrder?: string[];
  removePhotoIds?: string[];
  segments?: Array<{
    photoId: string;
    narrative?: string;
    memorySnippet?: string;
  }>;
}

export function patchStory(input: PatchStoryInput) {
  const story = getStory(input.storyId);
  if (!story) {
    throw new Error('故事不存在');
  }

  const links = getStoryMemoryCards(input.storyId);
  let photoIds =
    links.length > 0
      ? [...links].sort((a, b) => a.order_index - b.order_index).map((l) => l.memory_card_id)
      : [...(story.photos as string[])];

  if (input.removePhotoIds?.length) {
    const remove = new Set(input.removePhotoIds);
    photoIds = photoIds.filter((id) => !remove.has(id));
  }

  if (input.photoOrder?.length) {
    const allowed = new Set(photoIds);
    photoIds = input.photoOrder.filter((id) => allowed.has(id));
    for (const id of photoIds) allowed.delete(id);
    photoIds.push(...Array.from(allowed));
  }

  if (photoIds.length === 0) {
    throw new Error('故事至少需要保留一张照片');
  }

  const version = getLatestStoryVersion(input.storyId);
  const versionMap = new Map<string, StorySegment>();
  if (Array.isArray(version?.content)) {
    for (const seg of version.content) {
      if (seg && typeof seg === 'object' && 'photoId' in seg) {
        const s = seg as StorySegment;
        versionMap.set(s.photoId, s);
      }
    }
  }

  if (input.segments?.length) {
    for (const seg of input.segments) {
      const prev = versionMap.get(seg.photoId) || {
        photoId: seg.photoId,
        memorySnippet: '',
        narrative: '',
      };
      versionMap.set(seg.photoId, {
        photoId: seg.photoId,
        memorySnippet: seg.memorySnippet ?? prev.memorySnippet,
        narrative: seg.narrative ?? prev.narrative,
      });
    }
  }

  const segments: StorySegment[] = photoIds.map((photoId) => {
    const fromPatch = versionMap.get(photoId);
    return (
      fromPatch || {
        photoId,
        memorySnippet: '',
        narrative: '',
      }
    );
  });

  const title = input.title?.trim() || story.title;
  const summary = input.summary?.trim() || story.summary || story.description;

  updateStoryFields(input.storyId, {
    title,
    summary,
    photoIds,
    coverPhotoId: photoIds[0] || null,
  });

  setStoryMemoryCards(
    input.storyId,
    photoIds.map((photoId, orderIndex) => ({ photoId, orderIndex }))
  );

  createStoryVersion({
    storyId: input.storyId,
    version: getNextStoryVersionNumber(input.storyId),
    theme: story.theme || '',
    title,
    summary,
    content: segments,
    regenMode: 'manual_edit',
  });

  return getStory(input.storyId);
}
