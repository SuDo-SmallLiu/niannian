import { NextRequest, NextResponse } from 'next/server';
import { countGlobalMemory, searchGlobalMemory } from '@/lib/global-memory-search';
import { requireAuth, AuthError, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const sp = request.nextUrl.searchParams;

    const params = {
      userId: user.id,
      familyIds: sp.getAll('familyId').filter(Boolean),
      q: sp.get('q') || undefined,
      location: sp.get('location') || undefined,
      people: sp.get('people') || undefined,
      takenAfter: sp.get('takenAfter') || undefined,
      takenBefore: sp.get('takenBefore') || undefined,
      analysisStatus: (sp.get('analysisStatus') as 'pending' | 'analyzed' | 'all' | null) || 'all',
      limit: sp.get('limit') ? Number(sp.get('limit')) : 50,
      offset: sp.get('offset') ? Number(sp.get('offset')) : 0,
    };

    const results = searchGlobalMemory(params);
    const total = countGlobalMemory(params);

    return NextResponse.json({
      success: true,
      total,
      results,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return unauthorizedResponse();
    }
    console.error('[api/search]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '搜索失败' },
      { status: 500 }
    );
  }
}
