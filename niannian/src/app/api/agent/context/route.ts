import { NextRequest, NextResponse } from 'next/server';
import { getAgentPipelineStats, resolveFocusFamilyId } from '@/lib/agent-pipeline';
import { requireAuth, AuthError, unauthorizedResponse } from '@/lib/auth';
import { requireFamilyAccess, familyAccessErrorResponse } from '@/lib/family-access';

export async function GET(request: NextRequest) {
  try {
    const familyIdParam = request.nextUrl.searchParams.get('familyId') ?? undefined;
    let familyId = familyIdParam;

    if (familyId) {
      await requireFamilyAccess(request, familyId);
    } else {
      try {
        const user = await requireAuth(request);
        familyId = resolveFocusFamilyId(user.id);
      } catch (err) {
        if (err instanceof AuthError) {
          return unauthorizedResponse();
        }
        throw err;
      }
    }

    const pipeline = getAgentPipelineStats(familyId);
    return NextResponse.json({ pipeline, familyId: familyId ?? null });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    console.error('[api/agent/context]', error);
    return NextResponse.json({ error: '获取进度失败' }, { status: 500 });
  }
}
