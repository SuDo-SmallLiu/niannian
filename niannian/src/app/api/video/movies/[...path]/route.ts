import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

const VIDEO_ROOT = path.join(process.cwd(), 'public', 'video', 'movies');

function resolveVideoPath(segments: string[]): string | null {
  const resolved = path.resolve(VIDEO_ROOT, ...segments);
  if (!resolved.startsWith(VIDEO_ROOT + path.sep) && resolved !== VIDEO_ROOT) {
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

    const filePath = resolveVideoPath(segments);
    if (!filePath) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const info = await stat(filePath);
    if (!info.isFile()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const data = await readFile(filePath);

    return new NextResponse(data, {
      headers: {
        'Content-Type': 'video/mp4',
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': String(info.size),
        'Accept-Ranges': 'bytes',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
