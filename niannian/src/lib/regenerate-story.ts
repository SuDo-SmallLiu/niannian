import { buildPhotoRelations, generateFamilyStory } from '@/lib/ai';
import {
  getFamily,
  getMemoryCardByPhoto,
  getPhoto,
  getStory,
  updateStory,
} from '@/lib/db';

function photoToAnalysis(photoId: string) {
  const card = getMemoryCardByPhoto(photoId);
  const photo = getPhoto(photoId);
  if (!photo) return null;

  if (card) {
    const tags = [
      ...card.emotions,
      ...(card.understanding?.indicators || []),
      ...card.changes,
    ].filter(Boolean);

    return {
      id: photoId,
      people: card.people?.length ? card.people : JSON.parse(photo.people || '[]'),
      scene: card.location || photo.location || '未知',
      action: card.action || photo.event || '未知',
      time: card.taken_at || photo.taken_at || '未知',
      tags,
      significance: card.significance || '',
      userNotes: card.user_notes?.trim() || '',
    };
  }

  return {
    id: photoId,
    people: JSON.parse(photo.people || '[]'),
    scene: photo.location || '未知',
    action: photo.event || '未知',
    time: photo.taken_at || '未知',
    tags: JSON.parse(photo.ai_tags || '[]'),
    significance: '',
    userNotes: '',
  };
}

export async function regenerateStoryById(storyId: string) {
  const story = getStory(storyId);
  if (!story) {
    throw new Error('故事不存在');
  }

  const family = getFamily(story.family_id);
  if (!family) {
    throw new Error('家庭不存在');
  }

  const photoAnalyses = (story.photos as string[])
    .map(photoToAnalysis)
    .filter((item): item is NonNullable<typeof item> => !!item);

  if (photoAnalyses.length === 0) {
    throw new Error('故事中没有可用的照片');
  }

  const relations = buildPhotoRelations(
    photoAnalyses.map((p) => ({ id: p.id, people: p.people }))
  );

  const generated = await generateFamilyStory(
    family.name,
    family.members,
    photoAnalyses,
    relations
  );

  const ok = updateStory(storyId, {
    title: generated.title,
    description: generated.emotionSummary,
    connectionAction: generated.connectionAction,
    timeline: generated.timeline,
  });

  if (!ok) {
    throw new Error('更新故事失败');
  }

  return getStory(storyId);
}
