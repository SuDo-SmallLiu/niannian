export type NianNianIntent =
  | 'upload_photos'
  | 'analyze_photos'
  | 'supplement_memory'
  | 'generate_story'
  | 'generate_movie'
  | 'appreciate_stories'
  | 'appreciate_movies'
  | 'appreciate_photos'
  | 'appreciate_home'
  | 'mode_create'
  | 'mode_appreciate'
  | 'small_talk';

export interface NianNianChatContext {
  familyId?: string | null;
  lastPhotoId?: string | null;
}

export interface IntentMatch {
  intent: NianNianIntent;
  confidence: number;
}

export interface ResolvedIntent {
  intent: NianNianIntent;
  reply: string;
  href?: string;
}

const RULES: Array<{ intent: NianNianIntent; patterns: RegExp[] }> = [
  {
    intent: 'upload_photos',
    patterns: [/上传|添加|导入|拍.*照片|传.*照片|upload/i],
  },
  {
    intent: 'analyze_photos',
    patterns: [/识别|分析|解析|看懂|智能识别|ocr|扫描|老照片|文字识别/i],
  },
  {
    intent: 'supplement_memory',
    patterns: [/补充|完善|记忆卡|描述|聊聊|告诉我.*故事|填写/i],
  },
  {
    intent: 'generate_story',
    patterns: [/生成.*故事|写.*故事|自动.*故事|创作.*故事/i],
  },
  {
    intent: 'generate_movie',
    patterns: [/生成.*电影|做.*电影|人生电影/i],
  },
  {
    intent: 'appreciate_stories',
    patterns: [/听故事|看故事|故事库|欣赏.*故事/i],
  },
  {
    intent: 'appreciate_movies',
    patterns: [/看电影|人生电影|欣赏.*电影|播放.*电影/i],
  },
  {
    intent: 'appreciate_photos',
    patterns: [/看照片|照片记忆|欣赏.*照片|最近.*照片/i],
  },
  {
    intent: 'mode_appreciate',
    patterns: [/欣赏模式|我要欣赏|进入欣赏/i],
  },
  {
    intent: 'mode_create',
    patterns: [/创造模式|我要创造|进入创造|创建家庭/i],
  },
  {
    intent: 'appreciate_home',
    patterns: [/欣赏|重温|回味/i],
  },
];

export function classifyIntent(message: string): IntentMatch {
  const text = message.trim();
  if (!text) {
    return { intent: 'small_talk', confidence: 0 };
  }

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        return { intent: rule.intent, confidence: 0.85 };
      }
    }
  }

  return { intent: 'small_talk', confidence: 0.3 };
}

export function buildIntentReply(intent: NianNianIntent): string {
  const replies: Record<NianNianIntent, string> = {
    upload_photos: '好的，带你去上传照片～',
    analyze_photos: '没问题，我们一起去看看照片解析进度。',
    supplement_memory: '好呀，我来帮你补充记忆卡细节。',
    generate_story: '记忆够了的话，我们可以开始写故事啦。',
    generate_movie: '好的，我来帮你准备生成人生电影。',
    appreciate_stories: '带你去听故事，慢慢回味那些温暖时光。',
    appreciate_movies: '好，我们去看人生电影吧。',
    appreciate_photos: '带你浏览照片记忆。',
    appreciate_home: '带你去欣赏模式，轻松重温作品。',
    mode_create: '切换到创造模式，一起整理新的回忆。',
    mode_appreciate: '切换到欣赏模式，慢慢看、慢慢听。',
    small_talk:
      '我是念念，可以帮你上传照片、补充记忆、写故事或生成电影。你想先做哪一件呢？',
  };
  return replies[intent];
}
