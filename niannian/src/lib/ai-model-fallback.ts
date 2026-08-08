import OpenAI from 'openai';
import { formatAiError } from '@/lib/ai-errors';

function extractApiCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const err = error as { error?: { code?: string }; code?: string };
  return err.error?.code || err.code;
}

function extractApiMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const err = error as { error?: { message?: string }; message?: string };
  return err.error?.message || err.message || '';
}

/** 额度用尽、模型未开通等可尝试备用模型 */
export function isRetryableModelError(error: unknown): boolean {
  const code = extractApiCode(error);
  const msg = extractApiMessage(error);
  if (code === 'SetLimitExceeded') return true;
  if (code === 'ModelNotFound') return true;
  if (code === 'InvalidEndpoint') return true;
  if (code === 'InvalidEndpointOrModel.NotFound') return true;
  if (msg.includes('InvalidEndpointOrModel')) return true;
  if (msg.includes('inference limit')) return true;
  if (msg.includes('Safe Experience Mode')) return true;
  if (msg.includes('does not exist')) return true;
  if (msg.includes('模型不存在')) return true;
  if (msg.includes('无免费体验额度')) return true;
  return false;
}

/** API Key 无效、格式错误或额度问题时可切换备用 Key */
export function isRetryableKeyError(error: unknown): boolean {
  if (isRetryableModelError(error)) return true;
  const msg = extractApiMessage(error);
  if (extractApiCode(error) === 'InvalidApiKey') return true;
  if (msg.includes('API key format is incorrect')) return true;
  if (msg.includes('Authentication Fails')) return true;
  if (msg.includes('Authentication failed')) return true;
  if (msg.includes('Incorrect API key')) return true;
  if (msg.includes('401')) return true;
  if (msg.includes('403')) return true;
  return false;
}

export function buildModelChain(
  primary: string | undefined,
  fallbacksEnv: string | undefined,
  defaults: string[]
): string[] {
  const chain: string[] = [];
  const add = (name?: string) => {
    const trimmed = name?.trim();
    if (trimmed && !chain.includes(trimmed)) chain.push(trimmed);
  };

  add(primary);
  if (fallbacksEnv) {
    for (const part of fallbacksEnv.split(',')) add(part);
  }
  for (const model of defaults) add(model);

  return chain;
}

export interface ApiKeyProfile {
  apiKey: string;
  baseURL: string;
  visionModels: string[];
  textModels: string[];
}

/** 联通云网关优先（cucloud） */
function sortProfilesCucloudFirst(profiles: ApiKeyProfile[]): ApiKeyProfile[] {
  return [...profiles].sort((a, b) => {
    const rank = (url: string) => (url.includes('cucloud') ? 0 : 1);
    return rank(a.baseURL) - rank(b.baseURL);
  });
}

export function getApiKeyProfiles(): ApiKeyProfile[] {
  const profiles: ApiKeyProfile[] = [];
  const primaryKey = process.env.ARK_API_KEY?.trim();
  if (primaryKey) {
    profiles.push({
      apiKey: primaryKey,
      baseURL: process.env.ARK_BASE_URL?.trim() || 'https://ark.cn-beijing.volces.com/api/v3',
      visionModels: getVisionModelChain(),
      textModels: getTextModelChain(),
    });
  }

  const fallbackKey = process.env.ARK_API_KEY_FALLBACK?.trim();
  if (fallbackKey && fallbackKey !== primaryKey) {
    profiles.push({
      apiKey: fallbackKey,
      baseURL:
        process.env.ARK_BASE_URL_FALLBACK?.trim() || 'https://ark.cn-beijing.volces.com/api/v3',
      visionModels: buildModelChain(
        process.env.ARK_VISION_MODEL_FALLBACK,
        process.env.ARK_VISION_MODEL_FALLBACKS,
        ['doubao-seed-2-0-pro-260215']
      ),
      textModels: buildModelChain(
        process.env.ARK_TEXT_MODEL_FALLBACK,
        process.env.ARK_TEXT_MODEL_FALLBACKS,
        ['deepseek-v4-flash-ga-260731']
      ),
    });
  }

  return sortProfilesCucloudFirst(profiles);
}

/** 图片解析：默认优先火山引擎；若配置 ARK_VISION_API_KEY 则覆盖 */
export function getVisionApiKeyProfiles(): ApiKeyProfile[] {
  const visionKey = process.env.ARK_VISION_API_KEY?.trim();
  if (visionKey) {
    const visionProfile: ApiKeyProfile = {
      apiKey: visionKey,
      baseURL:
        process.env.ARK_VISION_BASE_URL?.trim() ||
        process.env.ARK_BASE_URL_FALLBACK?.trim() ||
        'https://ark.cn-beijing.volces.com/api/v3',
      visionModels: buildModelChain(
        process.env.ARK_VISION_MODEL,
        process.env.ARK_VISION_MODEL_FALLBACKS,
        getVolcengineVisionModelChain()
      ),
      textModels: [],
    };
    const others = getApiKeyProfiles().filter((p) => p.apiKey !== visionKey);
    return [visionProfile, ...others];
  }

  const profiles: ApiKeyProfile[] = [];
  const fallbackKey = process.env.ARK_API_KEY_FALLBACK?.trim();
  const volcengineBase =
    process.env.ARK_BASE_URL_FALLBACK?.trim() || 'https://ark.cn-beijing.volces.com/api/v3';

  const primaryKey = process.env.ARK_API_KEY?.trim();
  if (primaryKey) {
    profiles.push({
      apiKey: primaryKey,
      baseURL: process.env.ARK_BASE_URL?.trim() || volcengineBase,
      visionModels: getVisionModelChain(),
      textModels: [],
    });
  }

  if (fallbackKey && fallbackKey !== primaryKey) {
    profiles.push({
      apiKey: fallbackKey,
      baseURL: volcengineBase,
      visionModels: getVolcengineVisionModelChain(),
      textModels: [],
    });
  }

  const sorted = sortProfilesCucloudFirst(profiles);
  return sorted.length > 0 ? sorted : getApiKeyProfiles();
}

function getVolcengineVisionModelChain(): string[] {
  return buildModelChain(
    process.env.ARK_VISION_MODEL_FALLBACK,
    process.env.ARK_VISION_MODEL_FALLBACKS,
    ['doubao-seed-2-0-pro-260215']
  );
}

export function getApiKeyChain(): string[] {
  return getApiKeyProfiles().map((p) => p.apiKey);
}

export function createArkClient(apiKey: string, baseURL: string): OpenAI {
  return new OpenAI({ apiKey, baseURL });
}

export async function chatWithModelFallback(
  client: OpenAI,
  models: string[],
  params: Omit<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming, 'model'>
): Promise<{ response: OpenAI.Chat.ChatCompletion; model: string }> {
  if (models.length === 0) {
    throw new Error('未配置可用模型');
  }

  let lastError: unknown;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const response = await client.chat.completions.create({ ...params, model });
      if (i > 0) {
        console.warn(`⚠️ 主模型 ${models[0]} 不可用，已自动切换至 ${model}`);
      }
      return { response, model };
    } catch (error) {
      lastError = error;
      const retryable = isRetryableModelError(error);
      const hasNext = i < models.length - 1;
      if (retryable && hasNext) {
        console.warn(
          `模型 ${model} 不可用 (${extractApiCode(error) || 'unknown'})，尝试备用模型...`
        );
        continue;
      }
      if (retryable && !hasNext) break;
      throw formatAiError(error);
    }
  }

  throw formatAiError(lastError);
}

export async function chatWithKeyAndModelFallback(
  models: string[],
  params: Omit<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming, 'model'>,
  options?: { kind?: 'vision' | 'text' }
): Promise<{ response: OpenAI.Chat.ChatCompletion; model: string }> {
  const profiles =
    options?.kind === 'vision' ? getVisionApiKeyProfiles() : getApiKeyProfiles();
  if (profiles.length === 0) {
    throw new Error('未配置 API Key');
  }

  let lastError: unknown;

  for (let pi = 0; pi < profiles.length; pi++) {
    const profile = profiles[pi];
    const modelChain =
      options?.kind === 'text'
        ? profile.textModels
        : options?.kind === 'vision'
          ? profile.visionModels
          : models.length > 0
            ? models
            : profile.textModels;

    const client = createArkClient(profile.apiKey, profile.baseURL);
    try {
      const result = await chatWithModelFallback(client, modelChain, params);
      if (pi > 0) {
        console.warn(`⚠️ 主 API 网关不可用，已切换备用网关`);
      }
      return result;
    } catch (error) {
      lastError = error;
      const hasNextProfile = pi < profiles.length - 1;
      if (isRetryableKeyError(error) && hasNextProfile) {
        console.warn('API 网关不可用，尝试备用网关...');
        continue;
      }
      throw error;
    }
  }

  throw formatAiError(lastError);
}

export function getVisionModelChain(): string[] {
  return buildModelChain(process.env.ARK_VISION_MODEL, undefined, []);
}

export function getTextModelChain(): string[] {
  return buildModelChain(process.env.ARK_TEXT_MODEL, process.env.ARK_TEXT_MODEL_FALLBACKS, []);
}

/** kimi 等模型可能把 JSON 放在 reasoning 字段 */
export function extractAssistantText(message: {
  content?: string | null;
  reasoning?: string | null;
}): string {
  const content = message.content?.trim();
  if (content) return content;

  const reasoning = message.reasoning?.trim();
  if (!reasoning) return '';

  const jsonMatch = reasoning.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : reasoning;
}

function collectJsonObjectCandidates(text: string): string[] {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const candidates: string[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] !== '{') continue;

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let j = i; j < cleaned.length; j++) {
      const char = cleaned[j];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\' && inString) {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (char === '{') depth++;
      if (char === '}') {
        depth--;
        if (depth === 0) {
          candidates.push(cleaned.slice(i, j + 1));
          break;
        }
      }
    }
  }

  return candidates;
}

function looksLikePhotoAnalysis(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    'people' in obj ||
    'scene' in obj ||
    'action' in obj ||
    'understanding' in obj ||
    'layeredTags' in obj
  );
}

export function extractJsonBlob(text: string): string | null {
  const candidates = collectJsonObjectCandidates(text);

  for (let i = candidates.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(candidates[i]);
      if (looksLikePhotoAnalysis(parsed)) return candidates[i];
    } catch {
      // try next candidate
    }
  }

  for (let i = candidates.length - 1; i >= 0; i--) {
    try {
      JSON.parse(candidates[i]);
      return candidates[i];
    } catch {
      // try next candidate
    }
  }

  const start = text.indexOf('{');
  if (start < 0) return null;

  let raw = text.slice(start);
  const open = (raw.match(/\{/g) || []).length;
  let close = (raw.match(/\}/g) || []).length;
  while (open > close) {
    raw += '}';
    close += 1;
  }
  return raw;
}
