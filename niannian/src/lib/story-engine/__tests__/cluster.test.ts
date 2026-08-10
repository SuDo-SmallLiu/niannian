import { describe, expect, it } from 'vitest';
import { clusterMemoryCards } from '@/lib/story-engine/cluster';
import type { MemoryCardSnapshot } from '@/lib/story-engine/types';

function card(id: string, takenAt: string): MemoryCardSnapshot {
  return {
    photoId: id,
    photoUrl: `/uploads/${id}.jpg`,
    taken_at: takenAt,
    people: ['家人'],
    location: '家',
    action: '合影',
    significance: '记录',
    user_notes: '',
    storyLayer: {
      meaning: '家庭',
      relationship: '亲子',
      scene_type: '日常',
      change: '',
      importance: 3,
    },
    narrativeFrame: {
      storyline: '日常',
      storylineNote: '',
      shotType: '合影',
      shotNote: '',
      shotTags: [],
    },
  };
}

describe('clusterMemoryCards', () => {
  it('returns single scene for one card', () => {
    const scenes = clusterMemoryCards([card('p1', '2020-01-01')]);
    expect(scenes.length).toBeGreaterThanOrEqual(1);
    expect(scenes[0]?.memoryCardIds).toContain('p1');
  });

  it('orders cards by taken_at within scenes', () => {
    const scenes = clusterMemoryCards([
      card('p2', '2021-06-01'),
      card('p1', '2020-01-01'),
    ]);
    const ids = scenes.flatMap((s) => s.memoryCardIds);
    expect(ids.indexOf('p1')).toBeLessThan(ids.indexOf('p2'));
  });

  it('returns empty array for no input', () => {
    expect(clusterMemoryCards([])).toEqual([]);
  });
});
