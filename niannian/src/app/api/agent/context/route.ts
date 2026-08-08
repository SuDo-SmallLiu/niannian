import { NextResponse } from 'next/server';
import { getAgentPipelineStats } from '@/lib/agent-pipeline';

export async function GET() {
  try {
    const pipeline = getAgentPipelineStats();
    return NextResponse.json({ pipeline });
  } catch (error) {
    console.error('[api/agent/context]', error);
    return NextResponse.json({ error: '获取进度失败' }, { status: 500 });
  }
}
