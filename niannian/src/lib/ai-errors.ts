export class AiServiceError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AiServiceError';
    this.code = code;
  }
}

function extractApiMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const err = error as {
    message?: string;
    error?: { message?: string; code?: string };
    code?: string;
  };
  return err.error?.message || err.message;
}

function extractApiCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const err = error as { error?: { code?: string }; code?: string };
  return err.error?.code || err.code;
}

export function formatAiError(error: unknown): AiServiceError {
  const code = extractApiCode(error);
  const raw = extractApiMessage(error) || 'AI 服务调用失败';

  if (code === 'SetLimitExceeded' || raw.includes('SetLimitExceeded') || raw.includes('inference limit')) {
    return new AiServiceError(
      '视觉模型额度已用尽，且没有可用的备用模型。请在火山引擎控制台增加额度，或开通其他视觉模型并填入 ARK_VISION_MODEL_FALLBACKS。',
      code
    );
  }

  if (
    code === 'ModelNotFound' ||
    code === 'InvalidEndpointOrModel.NotFound' ||
    raw.includes('does not exist')
  ) {
    return new AiServiceError(
      '配置的模型未开通或不存在。请在火山引擎控制台开通该模型，或修改 ARK_VISION_MODEL / ARK_VISION_MODEL_FALLBACKS。',
      code
    );
  }

  if (code === 'InvalidApiKey' || raw.toLowerCase().includes('api key')) {
    return new AiServiceError('ARK_API_KEY 无效或未授权，请检查 .env.local 配置。', code);
  }

  return new AiServiceError(raw, code);
}
