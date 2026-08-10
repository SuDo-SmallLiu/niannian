const DEFAULT_DEV_SECRET = 'niannian-dev-secret-change-in-production';
const PLACEHOLDER_SECRET = 'change-me-to-a-long-random-string';

/** 生产环境运行时（Next start / PM2） */
export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** 返回生产认证配置问题；非生产或配置正确时返回 null */
export function getProductionAuthMisconfig(): string | null {
  if (!isProductionRuntime()) return null;

  const secret = process.env.AUTH_SECRET?.trim() || DEFAULT_DEV_SECRET;
  if (secret === DEFAULT_DEV_SECRET || secret === PLACEHOLDER_SECRET || secret.length < 16) {
    return '生产环境必须设置足够长度的 AUTH_SECRET';
  }

  if (process.env.AUTH_SMS !== 'true' && process.env.ALLOW_DEV_AUTH !== 'true') {
    return '生产环境需开启 AUTH_SMS=true，或显式设置 ALLOW_DEV_AUTH=true（仅演示）';
  }

  return null;
}

/** 启动时校验； misconfig 时抛出 */
export function assertProductionAuthConfig(): void {
  const issue = getProductionAuthMisconfig();
  if (issue) {
    throw new Error(`[auth-config] ${issue}`);
  }
}

/** 生产环境是否允许在 API 响应中返回明文验证码 */
export function shouldExposeOtpInResponse(): boolean {
  return isLocalDevAuthMode();
}

export function isLocalDevAuthMode(): boolean {
  return process.env.AUTH_SMS !== 'true';
}
