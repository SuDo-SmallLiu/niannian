import {
  createStoryV2,
  createStoryVersion,
  deleteStoriesByFamily,
  getAnalyzedMemoryCardsForEngine,
  getFamily,
  setStoryMemoryCards,
} from '@/lib/db';
import { normalizeNarrativeFrame } from '@/lib/narrative-frame';
import { inferStoryLayer, normalizeStoryLayer } from '@/lib/story-layer';
import { clusterMemoryCards } from './cluster';
import { composeStory } from './compose';
import { pickCoverPhoto } from './cover';
import { deriveTheme } from './theme';
import type { ComposedStory, MemoryCardSnapshot, StoryEngineResult } from './types';

function toSnapshot(
  row: ReturnType<typeof getAnalyzedMemoryCardsForEngine>[number]
): MemoryCardSnapshot {
  return {
    photoId: row.photo_id,
    photoUrl: row.photo_url,
    people: row.people,
    location: row.location || '',
    action: row.action || '',
    taken_at: row.taken_at || '',
    significance: row.significance || '',
    user_notes: row.user_notes || '',
    storyLayer: inferStoryLayer({
      storyLayer: normalizeStoryLayer(row.story_layer),
      narrativeFrame: normalizeNarrativeFrame(row.narrative_frame),
      understanding: row.understanding,
      changeDetail: row.change_detail,
      significance: row.significance,
      people: row.people,
    }),
    narrativeFrame: normalizeNarrativeFrame(row.narrative_frame),
    archetype: row.understanding?.archetype,
  };
}

export interface RunStoryEngineOptions {
  /** 为 true 时先删除该家庭已有故事再生成 */
  replaceExisting?: boolean;
  maxStories?: number;
}

/** Memory Cards → Scenes → Stories，并写入 DB */
export async function runStoryEngine(
  familyId: string,
  options: RunStoryEngineOptions = {}
): Promise<StoryEngineResult> {
  const family = getFamily(familyId);
  if (!family) {
    throw new Error('家庭不存在');
  }

  const rows = getAnalyzedMemoryCardsForEngine(familyId);
  if (rows.length === 0) {
    throw new Error('没有已解析的记忆卡，请先完成 AI 解析');
  }

  const cards = rows.map(toSnapshot);
  const scenes = clusterMemoryCards(cards);
  const maxStories = options.maxStories ?? 5;
  const selectedScenes = scenes.slice(0, maxStories);

  if (options.replaceExisting !== false) {
    deleteStoriesByFamily(familyId);
  }

  const composedStories: ComposedStory[] = [];

  for (const scene of selectedScenes) {
    const sceneCards = scene.memoryCardIds
      .map((id) => cards.find((c) => c.photoId === id))
      .filter((c): c is MemoryCardSnapshot => !!c);

    if (sceneCards.length === 0) continue;

    const themeResult = deriveTheme(sceneCards);
    const draft = await composeStory(family.name, themeResult, sceneCards);
    const coverPhotoId = pickCoverPhoto(sceneCards);

    composedStories.push({
      ...draft,
      coverPhotoId,
      memoryCardIds: sceneCards.map((c) => c.photoId),
    });
  }

  for (const story of composedStories) {
    const storyId = createStoryV2({
      familyId,
      title: story.title,
      summary: story.summary,
      theme: story.theme,
      coverPhotoId: story.coverPhotoId,
      photoIds: story.memoryCardIds,
      connectionAction: story.connectionAction,
      timeline: story.timeline,
    });

    setStoryMemoryCards(
      storyId,
      story.memoryCardIds.map((photoId, orderIndex) => ({
        photoId,
        orderIndex,
      }))
    );

    createStoryVersion({
      storyId,
      version: 1,
      theme: story.theme,
      title: story.title,
      summary: story.summary,
      content: story.segments,
      regenMode: 'full',
    });
  }

  return { stories: composedStories, scenes: selectedScenes };
}

export { clusterMemoryCards } from './cluster';
export { composeStory } from './compose';
export { deriveTheme } from './theme';
export { pickCoverPhoto } from './cover';
export type * from './types';
