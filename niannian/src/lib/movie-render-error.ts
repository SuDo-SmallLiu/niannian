/** 将视频渲染原始错误转为用户可读短句 */
export function sanitizeRenderError(raw: string | null | undefined): string {
  if (!raw?.trim()) return '视频生成超时，请稍后重试';
  const text = raw.replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
  if (/timeout|timed out|SIGTERM|killed/i.test(text)) {
    return '视频生成超时（片段时间过长），已切换互动版实时播放';
  }
  if (/BGM 文件不存在/.test(text)) return '背景音乐文件缺失，请联系管理员';
  if (/没有可渲染/.test(text)) return '没有可渲染的幻灯片';
  if (text.length <= 80 && !/frame=|fps=|bitrate=|speed=|ffmpeg|FFmpeg/i.test(text)) return text;
  return '视频合成失败，可先使用下方互动版播放（含配乐与旁白）';
}
