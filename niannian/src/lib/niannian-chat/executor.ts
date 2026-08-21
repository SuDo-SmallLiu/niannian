import type { NianNianChatContext, NianNianIntent } from '@/lib/niannian-chat/intents';

export interface IntentHrefOptions {
  familyId?: string | null;
  lastPhotoId?: string | null;
  needsSupplementPhotoId?: string | null;
}

export function resolveIntentHref(
  intent: NianNianIntent,
  options: IntentHrefOptions
): string | undefined {
  const familyId = options.familyId ?? undefined;
  const photoId = options.needsSupplementPhotoId ?? options.lastPhotoId ?? undefined;

  switch (intent) {
    case 'upload_photos':
      return familyId ? `/family/${familyId}/upload` : '/?create=1';
    case 'analyze_photos':
      return familyId ? `/family/${familyId}/photos` : '/family/memories';
    case 'supplement_memory':
      if (photoId) return `/photos/${photoId}/supplement`;
      return familyId
        ? `/family/${familyId}/photos?filter=needs_supplement`
        : '/family/memories';
    case 'generate_story':
      return familyId
        ? `/family/${familyId}/photos?generateStory=1`
        : '/family';
    case 'generate_movie':
      return familyId ? `/family/${familyId}` : '/movies';
    case 'appreciate_stories':
      return '/stories?appreciate=1';
    case 'appreciate_movies':
      return '/movies?appreciate=1';
    case 'appreciate_photos':
      return familyId
        ? `/family/memories?appreciate=1&familyId=${familyId}`
        : '/family/memories?appreciate=1';
    case 'appreciate_home':
    case 'mode_appreciate':
      return '/appreciate';
    case 'mode_create':
      return '/?create=1';
    case 'small_talk':
      return undefined;
    default:
      return undefined;
  }
}

export function resolveIntentFromContext(
  intent: NianNianIntent,
  context: NianNianChatContext,
  needsSupplementPhotoId?: string | null
): string | undefined {
  return resolveIntentHref(intent, {
    familyId: context.familyId,
    lastPhotoId: context.lastPhotoId,
    needsSupplementPhotoId,
  });
}
