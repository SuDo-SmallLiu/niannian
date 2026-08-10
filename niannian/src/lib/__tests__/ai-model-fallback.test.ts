import { afterEach, describe, expect, it } from 'vitest';
import {
  buildModelChain,
  isRetryableKeyError,
  isRetryableModelError,
} from '@/lib/ai-model-fallback';

describe('ai-model-fallback', () => {
  it('buildModelChain deduplicates and preserves order', () => {
    expect(buildModelChain('a', 'b,c', ['c', 'd'])).toEqual(['a', 'b', 'c', 'd']);
  });

  it('detects retryable model quota errors', () => {
    expect(isRetryableModelError({ code: 'SetLimitExceeded' })).toBe(true);
    expect(isRetryableModelError({ error: { message: '模型不存在' } })).toBe(true);
    expect(isRetryableModelError(new Error('network timeout'))).toBe(false);
  });

  it('detects retryable key errors', () => {
    expect(isRetryableKeyError({ code: 'InvalidApiKey' })).toBe(true);
    expect(isRetryableKeyError({ message: 'Authentication Fails' })).toBe(true);
  });
});

describe('getVisionModelChain env', () => {
  afterEach(() => {
    delete process.env.ARK_VISION_MODEL;
  });

  it('uses ARK_VISION_MODEL when set', async () => {
    process.env.ARK_VISION_MODEL = 'gpt-4o-test';
    const { getVisionModelChain } = await import('@/lib/ai-model-fallback');
    expect(getVisionModelChain()).toContain('gpt-4o-test');
  });
});
