import { getApiKeyProfiles, getVisionApiKeyProfiles } from '@/lib/ai-model-fallback';

export interface PublicAiStatus {
  configured: boolean;
  visionModels: string[];
  textModels: string[];
}

function uniqueModels(chains: string[][]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const chain of chains) {
    for (const model of chain) {
      const trimmed = model.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      result.push(trimmed);
    }
  }
  return result;
}

/** 对外公开的 AI 配置摘要：不含密钥、网关地址或内部 profile 结构 */
export function getPublicAiStatus(): PublicAiStatus {
  const visionProfiles = getVisionApiKeyProfiles();
  const textProfiles = getApiKeyProfiles();

  const visionModels = uniqueModels(visionProfiles.map((p) => p.visionModels));
  const textModels = uniqueModels(textProfiles.map((p) => p.textModels));

  const configured =
    visionProfiles.some((p) => p.apiKey.trim().length > 0) ||
    textProfiles.some((p) => p.apiKey.trim().length > 0);

  return { configured, visionModels, textModels };
}

/** 测试/序列化用：断言不含敏感字段 */
export function serializePublicAiStatus(): string {
  return JSON.stringify(getPublicAiStatus());
}
