import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

const NARRATION_ROOT = path.join(process.cwd(), 'public', 'audio', 'narration');

function resolveNarrationPath(segments: string[]): string | null {
  const resolved = path.resolve(NARRATION_ROOT, ...segments);
  if (!resolved.startsWith(NARRATION_ROOT + path.sep) && resolved !== NARRATION_ROOT) {
    return null;
  }
  return resolved;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    if (!segments?.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const filePath = resolveNarrationPath(segments);
    if (!filePath) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const info = await stat(filePath);
    if (!info.isFile()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const ext = path.extname(filePath).slice(1).toLowerCase();
    const contentType = ext === 'wav' ? 'audio/wav' : 'application/octet-stream';
    const data = await readFile(filePath);

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': String(info.size),
        'Accept-Ranges': 'bytes',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
