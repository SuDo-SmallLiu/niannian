#!/usr/bin/env node
/**
 * 重新生成指定人生电影的旁白与 MP4（MeloTTS 修复后使用）
 * 用法: MELO_PYTHON=services/narration/.venv/bin/python3 npx tsx scripts/rerender-movie.ts <movieId>
 */
import path from 'path';

async function main() {
  const movieId = process.argv[2];
  if (!movieId) {
    console.error('用法: npx tsx scripts/rerender-movie.ts <movieId>');
    process.exit(1);
  }

  process.chdir(path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
  process.env.HF_ENDPOINT = process.env.HF_ENDPOINT || 'https://hf-mirror.com';
  process.env.MELO_PYTHON =
    process.env.MELO_PYTHON || path.join(process.cwd(), 'services/narration/.venv/bin/python3');

  const { renderMovieToMp4 } = await import('../src/lib/movie-render/index.ts');
  const { updateMovieRenderStatus } = await import('../src/lib/db.ts');

  console.log('==> 重新渲染人生电影:', movieId);
  updateMovieRenderStatus(movieId, 'queued', { error: '' });

  const result = await renderMovieToMp4(movieId);
  console.log('✓ 完成:', result.mediaUrl, `${result.totalDurationMs}ms`);
}

main().catch((err) => {
  console.error('✗ 失败:', err);
  process.exit(1);
});
