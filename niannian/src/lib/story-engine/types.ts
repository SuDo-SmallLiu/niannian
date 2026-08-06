import type { NarrativeFrame } from '@/lib/narrative-frame';
import type { StoryLayer } from '@/lib/story-layer';

export type RegenMode = 'keep_theme' | 'rediscover_theme' | 'reorder' | 'full';

export interface MemoryCardSnapshot {
  photoId: string;
  photoUrl: string;
  people: string[];
  location: string;
  action: string;
  taken_at: string;
  significance: string;
  user_notes: string;
  storyLayer: StoryLayer;
  narrativeFrame: NarrativeFrame;
  archetype?: string;
}

export interface Scene {
  id: string;
  memoryCardIds: string[];
  label: string;
}

export interface ThemeResult {
  theme: string;
  titleCandidates: string[];
}

export interface StorySegment {
  photoId: string;
  memorySnippet: string;
  narrative: string;
}

export interface ComposedStory {
  title: string;
  summary: string;
  theme: string;
  connectionAction: string;
  timeline: Array<{ year: string; event: string }>;
  segments: StorySegment[];
  coverPhotoId: string;
  memoryCardIds: string[];
}

export interface StoryEngineResult {
  stories: ComposedStory[];
  scenes: Scene[];
}
