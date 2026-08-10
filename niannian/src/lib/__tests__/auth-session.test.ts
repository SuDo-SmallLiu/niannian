import { afterEach, describe, expect, it } from 'vitest';
import {
  createSessionToken,
  verifySessionToken,
} from '@/lib/auth-session';

describe('auth-session', () => {
  afterEach(() => {
    delete process.env.AUTH_SECRET;
  });

  it('round-trips a valid session token', async () => {
    process.env.AUTH_SECRET = 'test-secret-at-least-16-chars';
    const token = await createSessionToken('user-1', '13800138000');
    const payload = await verifySessionToken(token);
    expect(payload).toMatchObject({
      userId: 'user-1',
      phone: '13800138000',
    });
    expect(payload!.exp).toBeGreaterThan(Date.now());
  });

  it('rejects tampered signature', async () => {
    process.env.AUTH_SECRET = 'test-secret-at-least-16-chars';
    const token = await createSessionToken('user-1', '13800138000');
    const tampered = token.slice(0, -4) + 'xxxx';
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it('rejects expired token', async () => {
    process.env.AUTH_SECRET = 'test-secret-at-least-16-chars';
    const token = await createSessionToken('user-1', '13800138000');
    const [encoded, sig] = token.split('.');
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as {
      userId: string;
      phone: string;
      exp: number;
    };
    payload.exp = Date.now() - 1000;
    const expiredEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    expect(await verifySessionToken(`${expiredEncoded}.${sig}`)).toBeNull();
  });
});
