import {
  createStoryVersion,
  getAnalyzedMemoryCardsForEngine,
  getFamily,
  getNextStoryVersionNumber,
  getStory,
  setStoryMemoryCards,
  updateStoryFields,
} from '@/lib/db';
import { normalizeNarrativeFrame } from '@/lib/narrative-frame';
import { inferStoryLayer, normalizeStoryLayer } from '@/lib/story-layer';
import { clusterMemoryCards } from '@/lib/story-engine/cluster';
import { composeStory } from '@/lib/story-engine/compose';
import { pickCoverPhoto } from '@/lib/story-engine/cover';
import { deriveTheme } from '@/lib/story-engine/theme';
import type {
  ComposedStory,
  MemoryCardSnapshot,
  RegenMode,
  Scene,
} from '@/lib/story-engine/types';

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

function overlapRatio(a: Set<string>, b: string[]): number {
  if (b.length === 0) return 0;
  let hit = 0;
  for (const id of b) if (a.has(id)) hit++;
  return hit / b.length;
}

function pickAlternateScene(scenes: Scene[], currentPhotoIds: string[]): Scene {
  const current = new Set(currentPhotoIds);
  const sorted = [...scenes].sort(
    (a, b) => overlapRatio(current, a.memoryCardIds) - overlapRatio(current, b.memoryCardIds)
  );
  const best = sorted.find((s) => overlapRatio(current, s.memoryCardIds) < 0.6);
  if (best) return best;

  const idx = scenes.findIndex(
    (s) =>
      s.memoryCardIds.length === currentPhotoIds.length &&
      s.memoryCardIds.every((id, i) => id === currentPhotoIds[i])
  );
  return scenes[(Math.max(idx, 0) + 1) % scenes.length] || scenes[0];
}

function shuffleIds(ids: string[]): string[] {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function applyComposedToStory(storyId: string, composed: ComposedStory, regenMode: RegenMode) {
  const story = getStory(storyId);
  if (!story) throw new Error('故事不存在');

  updateStoryFields(storyId, {
    title: composed.title,
    summary: composed.summary,
    theme: composed.theme,
    connectionAction: composed.connectionAction,
    timeline: composed.timeline,
    photoIds: composed.memoryCardIds,
    coverPhotoId: composed.coverPhotoId,
  });

  setStoryMemoryCards(
    storyId,
    composed.memoryCardIds.map((photoId, orderIndex) => ({ photoId, orderIndex }))
  );

  createStoryVersion({
    storyId,
    version: getNextStoryVersionNumber(storyId),
    theme: composed.theme,
    title: composed.title,
    summary: composed.summary,
    content: composed.segments,
    regenMode,
  });

  return getStory(storyId);
}

export async function regenerateStoryById(storyId: string, mode: RegenMode = 'full') {
  const story = getStory(storyId);
  if (!story) throw new Error('故事不存在');

  const family = getFamily(story.family_id);
  if (!family) throw new Error('家庭不存在');

  const currentPhotoIds = (story.photos as string[]) || [];
  const rows = getAnalyzedMemoryCardsForEngine(story.family_id);
  const allCards = rows.map(toSnapshot);

  if (allCards.length === 0) {
    throw new Error('没有已解析的记忆卡');
  }

  let sceneCards: MemoryCardSnapshot[] = [];

  if (mode === 'full') {
    const scenes = clusterMemoryCards(allCards);
    const picked = pickAlternateScene(scenes, currentPhotoIds);
    sceneCards = picked.memoryCardIds
      .map((id) => allCards.find((c) => c.photoId === id))
      .filter((c): c is MemoryCardSnapshot => !!c);
  } else {
    sceneCards = currentPhotoIds
      .map((id) => allCards.find((c) => c.photoId === id))
      .filter((c): c is MemoryCardSnapshot => !!c);

    if (sceneCards.length === 0) {
      throw new Error('当前故事中没有可用的记忆卡');
    }

    if (mode === 'reorder') {
      const shuffled = shuffleIds(sceneCards.map((c) => c.photoId));
      sceneCards = shuffled
        .map((id) => sceneCards.find((c) => c.photoId === id))
        .filter((c): c is MemoryCardSnapshot => !!c);
    }
  }

  const themeResult =
    mode === 'keep_theme' && story.theme
      ? { theme: story.theme, titleCandidates: [story.title] }
      : deriveTheme(sceneCards);

  const draft = await composeStory(family.name, themeResult, sceneCards);
  const composed: ComposedStory = {
    ...draft,
    coverPhotoId: pickCoverPhoto(sceneCards),
    memoryCardIds: sceneCards.map((c) => c.photoId),
  };

  return applyComposedToStory(storyId, composed, mode);
}
