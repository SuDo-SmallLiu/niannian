import { NextResponse } from 'next/server';
import { getPublicAiStatus } from '@/lib/ai-status-public';

export async function GET() {
  return NextResponse.json(getPublicAiStatus());
}
