export interface PipelineStats {
  photoCount: number;
  pendingCount: number;
  analyzedCount: number;
  completionAvg: number;
  storyCount: number;
  movieCount: number;
  pipelineStage: 0 | 1 | 2 | 3;
  pipelineProgress: number;
}

export function formatPipelineProgress(stats: PipelineStats): string {
  if (stats.photoCount === 0) {
    return '你的作品还没开始——先上传几张有故事的家庭照片吧。';
  }

  const memoryPart =
    stats.pendingCount > 0
      ? `${stats.pendingCount} 张待解析`
      : `记忆 ${stats.completionAvg}%`;

  const parts = [
    `${stats.photoCount} 张照片`,
    memoryPart,
    stats.storyCount > 0 ? `${stats.storyCount} 个故事` : '故事待生成',
    stats.movieCount > 0 ? `${stats.movieCount} 部电影` : '电影待生成',
  ];

  return `你的作品进度（${stats.pipelineProgress}%）：${parts.join(' → ')}。`;
}
