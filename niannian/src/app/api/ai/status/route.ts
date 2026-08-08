import { NextResponse } from 'next/server';
import { getApiKeyProfiles, getVisionApiKeyProfiles } from '@/lib/ai-model-fallback';

export async function GET() {
  const mapProfile = (p: ReturnType<typeof getApiKeyProfiles>[number], i: number) => ({
    index: i,
    baseURL: p.baseURL,
    keyPrefix: p.apiKey.slice(0, 8) + '...',
    visionModels: p.visionModels,
    textModels: p.textModels,
  });

  return NextResponse.json({
    profiles: getApiKeyProfiles().map(mapProfile),
    visionProfiles: getVisionApiKeyProfiles().map(mapProfile),
  });
}
