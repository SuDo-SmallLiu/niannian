import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError, unauthorizedResponse } from '@/lib/auth';
import { getMemoryCardsByFamily } from '@/lib/db';
import { resolveFocusFamilyId } from '@/lib/agent-pipeline';
import { getMemoryCardStatus } from '@/lib/memory-card-completion';
import { processNianNianMessage } from '@/lib/niannian-chat/process-message';

function findFirstNeedsSupplementPhoto(familyId: string): string | null {
  const cards = getMemoryCardsByFamily(familyId);
  for (const card of cards) {
    if (getMemoryCardStatus(card) === 'needs_supplement') {
      return card.photo_id;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    let user;
    try {
      user = await requireAuth(request);
    } catch (err) {
      if (err instanceof AuthError) return unauthorizedResponse();
      throw err;
    }

    const body = await request.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return NextResponse.json({ error: '请输入消息' }, { status: 400 });
    }

    const context = (body.context ?? {}) as {
      familyId?: string | null;
      lastPhotoId?: string | null;
    };

    const familyId =
      context.familyId ??
      resolveFocusFamilyId(user.id) ??
      null;

    let needsSupplementPhotoId: string | null = null;
    if (familyId) {
      needsSupplementPhotoId = findFirstNeedsSupplementPhoto(familyId);
    }

    const result = processNianNianMessage(
      message,
      { familyId, lastPhotoId: context.lastPhotoId ?? null },
      needsSupplementPhotoId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/niannian/chat]', error);
    return NextResponse.json({ error: '对话失败' }, { status: 500 });
  }
}
