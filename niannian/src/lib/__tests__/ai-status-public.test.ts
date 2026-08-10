import { describe, expect, it } from 'vitest';
import { getPublicAiStatus, serializePublicAiStatus } from '@/lib/ai-status-public';

const SENSITIVE_PATTERN = /keyPrefix|apiKey|baseURL|sk-|ark-/i;

describe('getPublicAiStatus', () => {
  it('returns only configured flag and model name lists', () => {
    const status = getPublicAiStatus();
    expect(status).toEqual({
      configured: expect.any(Boolean),
      visionModels: expect.any(Array),
      textModels: expect.any(Array),
    });
    for (const model of [...status.visionModels, ...status.textModels]) {
      expect(typeof model).toBe('string');
      expect(model.length).toBeGreaterThan(0);
    }
  });

  it('serializes without sensitive fields or key fragments', () => {
    const raw = serializePublicAiStatus();
    expect(raw).not.toMatch(SENSITIVE_PATTERN);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual(['configured', 'textModels', 'visionModels']);
  });
});
