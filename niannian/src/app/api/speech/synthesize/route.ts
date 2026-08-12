import { NextRequest, NextResponse } from 'next/server';
import { heavyApiRateLimitResponse } from '@/lib/heavy-api-guard';
import { getLifeMovie } from '@/lib/db';
import { createSpeechSynthesizeJob } from '@/lib/jobs/create-jobs';
import { tryGetCachedSpeechResult } from '@/lib/jobs/media-jobs.service';
import { requireMovieAccess, familyAccessErrorResponse } from '@/lib/family-access';

export async function POST(request: NextRequest) {
  try {
    const rateLimited = heavyApiRateLimitResponse(request, 'speech/synthesize');
    if (rateLimited) return rateLimited;

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

    let familyId: string | undefined;
    if (movieId) {
      await requireMovieAccess(request, movieId);
      familyId = getLifeMovie(movieId)?.family_id;
    }

    const cached = await tryGetCachedSpeechResult({ text, movieId, slideId });
    if (cached && !force) {
      return NextResponse.json({ success: true, ...cached });
    }

    const job = createSpeechSynthesizeJob({ text, movieId, slideId, force, familyId });
    return NextResponse.json(
      { success: true, jobId: job.id, status: job.status },
      { status: 202 }
    );
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
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
