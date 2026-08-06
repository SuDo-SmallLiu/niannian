import { readFileSync } from 'fs';
import path from 'path';
import { analyzePhoto, type PhotoAnalysis } from '@/lib/ai';
import {
  type PhotoSourceFacts,
  sourceFactsToTags,
} from '@/lib/google-photos-metadata';
import {
  getPhoto,
  getMemoryCardByPhoto,
  updatePhotoAnalysis,
  upsertMemoryCard,
  saveTagsForPhoto,
} from '@/lib/db';

const LAYER_MAP: Record<string, number> = {
  objective: 1,
  behavior: 2,
  change: 3,
  family_value: 4,
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
    user_notes: existing?.user_notes || sourceFacts?.description || undefined,
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
      const dup = tags.some((t) => t.layer === layer && t.value === item.value);
      if (!dup) {
        tags.push({ photo_id: photoId, layer, key: item.key, value: item.value });
      }
    }
  }
  saveTagsForPhoto(photoId, tags);
}

export async function analyzeAndSavePhoto(
  photoId: string,
  options?: { withSupplement?: boolean }
): Promise<PhotoAnalysis> {
  const photo = getPhoto(photoId);
  if (!photo) {
    throw new Error('照片不存在');
  }

  const existingCard = getMemoryCardByPhoto(photoId);

  const filePath = path.join(process.cwd(), 'public', photo.url);
  const fileBuffer = readFileSync(filePath);
  const base64 = fileBuffer.toString('base64');

  const sourceFacts =
    photo.source_type === 'google_photos' && photo.source_metadata
      ? (photo.source_metadata as PhotoSourceFacts)
      : undefined;

  let supplement;
  if (options?.withSupplement && existingCard) {
    const hasContent =
      existingCard.user_notes ||
      existingCard.voice_transcript ||
      (existingCard.ai_questions || []).some((q) => q.answer);
    if (hasContent) {
      supplement = {
        userNotes: existingCard.user_notes || '',
        voiceTranscript: existingCard.voice_transcript || '',
        questions: (existingCard.ai_questions || [])
          .filter((q) => q.answer)
          .map((q) => ({ question: q.question, answer: q.answer })),
      };
    }
  }

  const analysis = await analyzePhoto(base64, sourceFacts, supplement);

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

  return analysis;
}
