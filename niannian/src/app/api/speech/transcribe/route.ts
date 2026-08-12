import { NextRequest, NextResponse } from 'next/server';
import { heavyApiRateLimitResponse } from '@/lib/heavy-api-guard';
import { requireAuth, AuthError, unauthorizedResponse } from '@/lib/auth';
import { transcribeAudioBlob } from '@/lib/speech-transcribe';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);

    const rateLimited = heavyApiRateLimitResponse(request, 'speech/transcribe');
    if (rateLimited) return rateLimited;

    const formData = await request.formData();
    const audio = formData.get('audio');

    if (!(audio instanceof Blob) || audio.size === 0) {
      return NextResponse.json({ error: '请上传有效的语音' }, { status: 400 });
    }

    if (audio.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '语音过长，请控制在 1 分钟以内' }, { status: 400 });
    }

    const ext = audio.type.includes('mp4') ? 'voice.m4a' : 'voice.webm';
    const text = await transcribeAudioBlob(audio, ext);

    return NextResponse.json({ text });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }
    const message = error instanceof Error ? error.message : '语音识别失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
