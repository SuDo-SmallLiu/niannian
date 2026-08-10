import { analyzePhoto, isAiConfigured, type PhotoAnalysis } from '@/lib/ai';
import {
  preprocessImageForAnalysis,
  resolvePhotoFilePath,
} from '@/services/image-preprocess.service';
import {
  type PhotoSourceFacts,
  sourceFactsToTags,
} from '@/lib/google-photos-metadata';
import {
  getPhoto,
  getFamily,
  getMemoryCardByPhoto,
  updatePhotoAnalysis,
  upsertMemoryCard,
  saveTagsForPhoto,
} from '@/lib/db';
import { regenerateMemoryCardQuestions } from '@/lib/memory-card-questions';

const LAYER_MAP: Record<string, number> = {
  objective: 1,
  behavior: 2,
  change: 3,
  family_value: 4,
  narrative: 5,
};

function mergePeople(aiPeople: string[], sourcePeople?: string[]): string[] {
  const merged = new Set([...(sourcePeople || []), ...aiPeople]);
  return Array.from(merged).filter(Boolean);
}

export function saveMemoryCardFromAnalysis(
  familyId: string,
  photoId: string,
  analysis: PhotoAnalysis,
  sourceFacts?: PhotoSourceFacts,
  options?: { preserveUserNotes?: boolean }
) {
  const existing = options?.preserveUserNotes ? getMemoryCardByPhoto(photoId) : null;

  upsertMemoryCard({
    photo_id: photoId,
    family_id: familyId,
    taken_at: sourceFacts?.takenAtFormatted || analysis.time,
    location: sourceFacts?.location || analysis.scene,
    people: mergePeople(analysis.people, sourceFacts?.people),
    action: analysis.action,
    emotions: analysis.emotions,
    changes: analysis.changes,
    significance: analysis.significance || sourceFacts?.description || '',
    understanding: analysis.understanding,
    change_detail: analysis.changeDetail,
    narrative_frame: analysis.narrativeFrame,
    story_layer: analysis.storyLayer,
    user_notes: existing?.user_notes?.trim() ? existing.user_notes : undefined,
    voice_transcript: existing?.voice_transcript || undefined,
    ai_questions: existing?.ai_questions || undefined,
    analysis_status: 'analyzed',
  });

  const tags: Array<{ photo_id: string; layer: number; key: string; value: string }> = [];

  if (sourceFacts) {
    for (const tag of sourceFactsToTags(sourceFacts)) {
      tags.push({ photo_id: photoId, ...tag });
    }
  }

  for (const [layerName, items] of Object.entries(analysis.layeredTags)) {
    const layer = LAYER_MAP[layerName];
    if (!layer || !items) continue;
    for (const item of items) {
      if (!item?.value) continue;
      const key = item.key || '标签';
      const dup = tags.some((t) => t.layer === layer && t.value === item.value);
      if (!dup) {
        tags.push({ photo_id: photoId, layer, key, value: item.value });
      }
    }
  }

  const nf = analysis.narrativeFrame;
  if (nf?.storyline) {
    tags.push({ photo_id: photoId, layer: 5, key: '故事线', value: nf.storyline });
  }
  if (nf?.shotType) {
    tags.push({ photo_id: photoId, layer: 5, key: '景别', value: nf.shotType });
  }
  for (const st of nf?.shotTags || []) {
    if (!tags.some((t) => t.layer === 5 && t.value === st)) {
      tags.push({ photo_id: photoId, layer: 5, key: '镜头', value: st });
    }
  }

  const sl = analysis.storyLayer;
  if (sl?.meaning) {
    tags.push({ photo_id: photoId, layer: 6, key: '意义', value: sl.meaning });
  }
  if (sl?.scene_type) {
    tags.push({ photo_id: photoId, layer: 6, key: '场景类型', value: sl.scene_type });
  }
  if (sl?.relationship) {
    tags.push({ photo_id: photoId, layer: 6, key: '关系', value: sl.relationship });
  }

  saveTagsForPhoto(photoId, tags);
}

export async function analyzeAndSavePhoto(
  photoId: string,
  options?: { withSupplement?: boolean; skipQuestions?: boolean }
): Promise<PhotoAnalysis> {
  const photo = getPhoto(photoId);
  if (!photo) {
    throw new Error('照片不存在');
  }

  const existingCard = getMemoryCardByPhoto(photoId);
  const family = getFamily(photo.family_id);

  const filePath = resolvePhotoFilePath(photo.url);
  const { base64, mimeType } = await preprocessImageForAnalysis(filePath);

  const sourceFacts =
    photo.source_type === 'google_photos' && photo.source_metadata
      ? (photo.source_metadata as PhotoSourceFacts)
      : undefined;

  let supplement;
  if (options?.withSupplement && existingCard) {
    const hasContent =
      existingCard.user_notes ||
      existingCard.voice_transcript ||
      (existingCard.ai_questions || []).some((q: { answer?: string }) => q.answer);
    if (hasContent) {
      supplement = {
        userNotes: existingCard.user_notes || '',
        voiceTranscript: existingCard.voice_transcript || '',
        questions: (existingCard.ai_questions || [])
          .filter((q: { answer?: string }) => q.answer)
          .map((q: { question: string; answer?: string }) => ({
            question: q.question,
            answer: q.answer!,
          })),
      };
    }
  }

  const analysis = await analyzePhoto(base64, sourceFacts, supplement, {
    allowDemo: !isAiConfigured(),
    mimeType,
    familyName: family?.name,
  });

  updatePhotoAnalysis(photo.id, {
    people: mergePeople(analysis.people, sourceFacts?.people),
    location: sourceFacts?.location || analysis.scene,
    event: analysis.action,
    ai_tags: analysis.tags,
    taken_at: sourceFacts?.takenAtFormatted || analysis.time,
  });

  saveMemoryCardFromAnalysis(photo.family_id, photo.id, analysis, sourceFacts, {
    preserveUserNotes: true,
  });

  if (!options?.skipQuestions) {
    await regenerateMemoryCardQuestions(photo.id);
  }

  return analysis;
}
