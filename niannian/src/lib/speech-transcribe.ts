import OpenAI from 'openai';
import { getApiKeyProfiles } from '@/lib/ai-model-fallback';

const STT_MODEL = process.env.ARK_STT_MODEL?.trim() || 'doubao-seed-asr-1-0';

export async function transcribeAudioBlob(
  blob: Blob,
  filename = 'voice.webm'
): Promise<string> {
  const profiles = getApiKeyProfiles();
  if (profiles.length === 0) {
    throw new Error('未配置语音识别服务');
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  let lastError: unknown;

  // 优先尝试火山引擎备用网关（国内 STT 更稳定）
  const ordered = [...profiles].reverse();

  for (const profile of ordered) {
    try {
      const client = new OpenAI({ apiKey: profile.apiKey, baseURL: profile.baseURL });
      const file = new File([buffer], filename, { type: blob.type || 'audio/webm' });
      const result = await client.audio.transcriptions.create({
        file,
        model: STT_MODEL,
        language: 'zh',
      });
      const text = result.text?.trim();
      if (text) return text;
    } catch (error) {
      lastError = error;
      console.error('[speech-transcribe] profile failed:', profile.baseURL, error);
    }
  }

  console.error('[speech-transcribe] all profiles failed:', lastError);
  throw new Error('语音识别失败，请检查麦克风或稍后重试');
}
