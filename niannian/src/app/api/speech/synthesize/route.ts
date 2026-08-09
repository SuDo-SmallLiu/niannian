import { NextRequest, NextResponse } from 'next/server';
import { synthesizeNarration } from '@/lib/narration-tts';
import { estimateNarrationMs } from '@/lib/slide-narration';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = (body.text as string | undefined)?.trim();
    const movieId = body.movieId as string | undefined;
    const slideId = body.slideId as string | undefined;
    const force = Boolean(body.force);

    if (!text) {
      return NextResponse.json({ error: '缺少 text' }, { status: 400 });
    }

    if (text.length > 2000) {
      return NextResponse.json({ error: '旁白文本过长' }, { status: 400 });
    }

    const result = await synthesizeNarration(text, { movieId, slideId, force });
    const durationMs = result.durationMs || estimateNarrationMs(text);

    return NextResponse.json({
      success: true,
      url: result.url,
      durationMs,
      cached: result.cached,
      engine: result.engine,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '旁白生成失败';
    const isMeloMissing = message.includes('MELO_NOT_INSTALLED') || message.includes('MeloTTS');
    return NextResponse.json(
      {
        error: message,
        fallback: 'browser-tts',
        setupHint: isMeloMissing
          ? '请运行: cd services/narration && pip install -r requirements.txt && python -m unidic download'
          : undefined,
      },
      { status: isMeloMissing ? 503 : 500 }
    );
  }
}
