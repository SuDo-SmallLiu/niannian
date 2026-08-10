import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assertProductionAuthConfig,
  getProductionAuthMisconfig,
  shouldExposeOtpInResponse,
} from '@/lib/auth-config';
import {
  checkOtpSendRateLimit,
  recordOtpSend,
  resetOtpRateLimitsForTests,
} from '@/lib/auth-rate-limit';
import { normalizePhone } from '@/lib/auth';

describe('auth-config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('flags weak production auth config', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AUTH_SECRET', 'change-me-to-a-long-random-string');
    vi.stubEnv('AUTH_SMS', 'false');
    vi.stubEnv('ALLOW_DEV_AUTH', '');
    expect(getProductionAuthMisconfig()).toMatch(/AUTH_SECRET/);
  });

  it('allows demo mode with ALLOW_DEV_AUTH', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AUTH_SECRET', 'a-very-long-production-secret-key');
    vi.stubEnv('AUTH_SMS', 'false');
    vi.stubEnv('ALLOW_DEV_AUTH', 'true');
    expect(getProductionAuthMisconfig()).toBeNull();
  });

  it('does not expose OTP in production SMS mode', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AUTH_SMS', 'true');
    expect(shouldExposeOtpInResponse()).toBe(false);
  });
});

describe('auth-rate-limit', () => {
  beforeEach(() => {
    resetOtpRateLimitsForTests();
  });

  it('blocks sends within 60s for same phone', () => {
    recordOtpSend('13800138000', '1.2.3.4');
    const second = checkOtpSendRateLimit('13800138000', '1.2.3.4');
    expect(second.ok).toBe(false);
    expect(second.reason).toBe('phone_interval');
  });
});

describe('normalizePhone', () => {
  it('accepts mainland mobile numbers', () => {
    expect(normalizePhone('138 0013 8000')).toBe('13800138000');
    expect(normalizePhone('123')).toBeNull();
  });
});

describe('assertProductionAuthConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws when production misconfigured', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AUTH_SECRET', 'short');
    expect(() => assertProductionAuthConfig()).toThrow();
  });
});
