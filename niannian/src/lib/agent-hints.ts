import type { PipelineStats } from '@/lib/agent-types';
import { formatPipelineProgress } from '@/lib/agent-types';

export type AgentPage =
  | 'home'
  | 'upload'
  | 'memory'
  | 'story'
  | 'movie'
  | 'profile'
  | 'appreciate'
  | 'edit'
  | 'share'
  | 'display'
  | 'compose'
  | 'analyze';

export interface AgentHintContext {
  page: AgentPage;
  appreciate?: boolean;
  pipeline?: PipelineStats;
  completionAvg?: number;
  pendingCount?: number;
  analyzedCount?: number;
  photoCount?: number;
  storyCount?: number;
  movieCount?: number;
  itemCompletion?: number;
  itemLabel?: 'memory' | 'story' | 'movie';
  hintSeed?: string;
}

const DISPLAY_HINTS = [
  '看完觉得温暖吗？要不要给家里打个电话，一起聊聊这些回忆？',
  '有些细节只有家人才记得——要不要问问家里人，这件事是怎么回事？',
  '家里还有老照片吗？上传更多，念念能帮你讲更完整的故事。',
];

const SHARE_HINTS = [
  '分享出去后，要不要给家里人打个电话，聊聊背后的故事？',
  '家人可能记得更多——要不要问问他们，当时是怎么回事？',
  '如果还有老照片，上传进来，故事可以变得更完整。',
];

const APPRECIATE_DISPLAY_HINTS = [
  '这些回忆很珍贵。要不要给家里打个电话，一起慢慢聊？',
  '有些故事只有长辈才记得全——要不要问问家里人？',
  '如果还有老照片，可以让家人帮你找出来，一起上传。',
];

function pickHint(options: string[], seed = ''): string {
  if (options.length === 0) return '念念不忘，岁岁年年。';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % options.length;
  }
  return options[hash]!;
}

export function resolveAgentPage(pathname: string): AgentPage {
  if (pathname.startsWith('/share/')) return 'share';
  if (pathname.includes('/play')) return 'display';
  if (pathname.startsWith('/appreciate')) return 'appreciate';
  if (pathname === '/') return 'home';
  if (pathname === '/profile') return 'profile';
  if (pathname.includes('/upload') || pathname === '/create') return 'upload';
  if (pathname.includes('/compose')) return 'compose';
  if (pathname.includes('/analyze')) return 'analyze';
  if (/\/photos\/[^/]+$/.test(pathname)) return 'edit';
  if (/\/stories\/[^/]+$/.test(pathname) && !pathname.includes('/play')) return 'edit';
  if (pathname.startsWith('/stories')) return 'story';
  if (pathname.startsWith('/movies')) return 'movie';
  if (pathname.startsWith('/family')) return 'memory';
  return 'home';
}

export function getAgentHint(ctx: AgentHintContext): string {
  const {
    page,
    appreciate = false,
    pipeline,
    completionAvg = pipeline?.completionAvg ?? 0,
    pendingCount = pipeline?.pendingCount ?? 0,
    analyzedCount = pipeline?.analyzedCount ?? 0,
    photoCount = pipeline?.photoCount ?? 0,
    storyCount = pipeline?.storyCount ?? 0,
    movieCount = pipeline?.movieCount ?? 0,
    itemCompletion,
    itemLabel,
    hintSeed = page,
  } = ctx;

  const progress = pipeline ? formatPipelineProgress(pipeline) : '';

  if (page === 'share') {
    return pickHint(appreciate ? APPRECIATE_DISPLAY_HINTS : SHARE_HINTS, hintSeed);
  }

  if (page === 'display') {
    return pickHint(appreciate ? APPRECIATE_DISPLAY_HINTS : DISPLAY_HINTS, hintSeed);
  }

  if (page === 'edit') {
    const itemPart =
      itemCompletion != null ? `当前这项完成了 ${itemCompletion}%。` : '';
    if (itemLabel === 'memory') {
      return `${itemPart}${progress} 补充几句为什么拍下它，或者问问家里人，故事会更动人。`;
    }
    if (itemLabel === 'story') {
      return `${itemPart}${progress} 可以调整标题和顺序，也可以重新发现新的故事视角。`;
    }
    return `${itemPart}${progress}`;
  }

  if (page === 'compose') {
    return `${progress} 选几张记忆卡，念念帮你串成一个故事。`;
  }

  if (page === 'analyze') {
    return `${progress} 念念正在读懂照片，完成后记得补充你的记忆。`;
  }

  switch (page) {
    case 'home':
      return appreciate
        ? '欢迎回来。照片、故事、电影都在这里，慢慢看就好。'
        : '你好，我是念念。上传家庭照片，我会帮你读懂每一张背后的故事。';
    case 'upload':
      if (photoCount >= 5) {
        return `${progress} 照片选好了吗？上传完成后，我会自动开始解析。`;
      }
      return `${progress} 建议一次上传 5–20 张有故事的照片；也可以问问家里人有没有老照片。`;
    case 'memory':
      if (pendingCount > 0) {
        return `${progress} 还有 ${pendingCount} 张待解析，先让念念读懂它们。`;
      }
      if (completionAvg >= 70) {
        return `${progress} 记忆已经比较完整，可以试着生成故事啦。`;
      }
      if (analyzedCount > 0) {
        return `${progress} 点击记忆卡补充细节，或者打电话问问家人当时怎么回事。`;
      }
      return `${progress} 每张照片都会变成一张记忆卡。`;
    case 'story':
      if (storyCount === 0) {
        return `${progress} 故事来自记忆卡。先完善记忆，再回来生成故事。`;
      }
      return `${progress} 故事来自你们的记忆，不是相册流水账。`;
    case 'movie':
      if (movieCount === 0) {
        return `${progress} 电影由故事生成。先去故事页看看，再回来生成人生电影。`;
      }
      return `${progress} 人生电影已经就绪，可以分享给家人一起观看。`;
    case 'profile':
      return appreciate
        ? '这里是你的家庭记忆入口。想回顾时，从欣赏模式开始就好。'
        : '你的记忆、故事和电影，都会在这里找到入口。';
    case 'appreciate':
      return '慢慢看，这些都是属于你们家的珍贵时刻。想聊聊的话，给家里打个电话吧。';
    default:
      return '念念不忘，岁岁年年。';
  }
}
