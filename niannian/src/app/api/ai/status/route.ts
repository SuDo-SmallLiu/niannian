import { NextResponse } from 'next/server';
import { getApiKeyProfiles } from '@/lib/ai-model-fallback';

export async function GET() {
  const profiles = getApiKeyProfiles().map((p, i) => ({
    index: i,
    baseURL: p.baseURL,
    keyPrefix: p.apiKey.slice(0, 8) + '...',
    visionModels: p.visionModels,
    textModels: p.textModels,
  }));

  return NextResponse.json({ profiles });
}
