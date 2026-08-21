import {
  buildIntentReply,
  classifyIntent,
  type NianNianChatContext,
} from '@/lib/niannian-chat/intents';
import { resolveIntentFromContext } from '@/lib/niannian-chat/executor';

export interface NianNianChatResponse {
  reply: string;
  intent: string;
  href?: string;
}

export function processNianNianMessage(
  message: string,
  context: NianNianChatContext,
  needsSupplementPhotoId?: string | null
): NianNianChatResponse {
  const { intent } = classifyIntent(message);
  const reply = buildIntentReply(intent);
  const href = resolveIntentFromContext(intent, context, needsSupplementPhotoId);

  return { reply, intent, href };
}
