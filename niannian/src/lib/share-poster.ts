import QRCode from 'qrcode';

export interface PosterInput {
  type: 'story' | 'memory';
  title: string;
  subtitle?: string;
  summary: string;
  familyName: string;
  photoUrls: string[];
  shareUrl: string;
}

const W = 750;
const H = 1334;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
): number {
  const chars = text.split('');
  let line = '';
  let lineCount = 0;
  let currentY = y;

  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = chars[i];
      currentY += lineHeight;
      lineCount++;
      if (lineCount >= maxLines - 1) {
        const rest = text.slice(i);
        let truncated = rest;
        while (ctx.measureText(truncated + '…').width > maxWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
        }
        ctx.fillText(truncated + '…', x, currentY);
        return currentY + lineHeight;
      }
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, currentY);
  return currentY + lineHeight;
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (imgRatio > boxRatio) {
    sw = img.height * boxRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxRatio;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

export async function generateSharePoster(input: PosterInput): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 不可用');

  // 背景
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#FFF8F0');
  bg.addColorStop(1, '#F8F4ED');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 顶部品牌
  ctx.fillStyle = '#D98A45';
  ctx.font = '500 24px serif';
  ctx.textAlign = 'center';
  ctx.fillText('念念年年', W / 2, 72);

  ctx.fillStyle = '#B8A898';
  ctx.font = '20px sans-serif';
  ctx.fillText(
    input.type === 'story' ? '家庭记忆故事' : '家庭记忆卡',
    W / 2,
    108
  );

  // 主图区域
  const photoX = 48;
  const photoY = 140;
  const photoW = W - 96;
  const photoH = input.type === 'memory' ? 520 : 400;

  ctx.save();
  drawRoundRect(ctx, photoX, photoY, photoW, photoH, 24);
  ctx.clip();

  const urls = input.photoUrls.filter(Boolean);
  if (urls.length >= 4 && input.type === 'story') {
    const halfW = photoW / 2;
    const halfH = photoH / 2;
    const positions = [
      [photoX, photoY],
      [photoX + halfW, photoY],
      [photoX, photoY + halfH],
      [photoX + halfW, photoY + halfH],
    ];
    for (let i = 0; i < 4; i++) {
      try {
        const img = await loadImage(urls[i]);
        drawCoverImage(ctx, img, positions[i][0], positions[i][1], halfW, halfH);
      } catch {
        ctx.fillStyle = '#F0E8D8';
        ctx.fillRect(positions[i][0], positions[i][1], halfW, halfH);
      }
    }
  } else if (urls.length >= 2 && input.type === 'story') {
    const halfW = photoW / 2;
    for (let i = 0; i < Math.min(2, urls.length); i++) {
      try {
        const img = await loadImage(urls[i]);
        drawCoverImage(ctx, img, photoX + i * halfW, photoY, halfW, photoH);
      } catch {
        ctx.fillStyle = '#F0E8D8';
        ctx.fillRect(photoX + i * halfW, photoY, halfW, photoH);
      }
    }
  } else if (urls.length > 0) {
    try {
      const img = await loadImage(urls[0]);
      drawCoverImage(ctx, img, photoX, photoY, photoW, photoH);
    } catch {
      ctx.fillStyle = '#F0E8D8';
      ctx.fillRect(photoX, photoY, photoW, photoH);
      ctx.fillStyle = '#B8A898';
      ctx.font = '48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📷', W / 2, photoY + photoH / 2);
    }
  } else {
    ctx.fillStyle = '#F0E8D8';
    ctx.fillRect(photoX, photoY, photoW, photoH);
  }
  ctx.restore();

  // 边框
  ctx.strokeStyle = '#E8DCC8';
  ctx.lineWidth = 2;
  drawRoundRect(ctx, photoX, photoY, photoW, photoH, 24);
  ctx.stroke();

  let textY = photoY + photoH + 48;

  // 家庭名
  if (input.familyName) {
    ctx.fillStyle = '#D98A45';
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(input.familyName, 48, textY);
    textY += 36;
  }

  // 标题
  ctx.fillStyle = '#4B3B2F';
  ctx.font = 'bold 36px serif';
  ctx.textAlign = 'left';
  textY = wrapText(ctx, input.title, 48, textY, W - 96, 44, 2) + 8;

  // 副标题
  if (input.subtitle) {
    ctx.fillStyle = '#8B7355';
    ctx.font = '24px sans-serif';
    textY = wrapText(ctx, input.subtitle, 48, textY, W - 96, 34, 1) + 12;
  }

  // 摘要
  if (input.summary) {
    ctx.fillStyle = '#8B7355';
    ctx.font = '26px sans-serif';
    textY = wrapText(ctx, input.summary, 48, textY, W - 96, 38, 3) + 16;
  }

  // 二维码区域
  const qrSize = 140;
  const qrX = W - 48 - qrSize;
  const qrY = H - 48 - qrSize - 60;

  const qrDataUrl = await QRCode.toDataURL(input.shareUrl, {
    width: qrSize,
    margin: 1,
    color: { dark: '#4B3B2F', light: '#FFFFFF' },
  });
  const qrImg = await loadImage(qrDataUrl);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = '#4B3B2F';
  ctx.font = '22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('扫码查看完整内容', 48, qrY + 40);
  ctx.fillStyle = '#B8A898';
  ctx.font = '20px sans-serif';
  ctx.fillText('长按保存海报 · 发送到微信', 48, qrY + 76);
  ctx.fillText('分享给家人一起回忆', 48, qrY + 108);

  // 底部
  ctx.fillStyle = '#D8CCB8';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('让照片重新成为家人的连接', W / 2, H - 36);

  return canvas.toDataURL('image/png', 0.92);
}

export function downloadPoster(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export async function sharePosterNative(dataUrl: string, title: string): Promise<boolean> {
  if (!navigator.share || !navigator.canShare) return false;
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], 'niannian-poster.png', { type: 'image/png' });
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({ title, files: [file] });
      return true;
    }
  } catch {
    // user cancelled or unsupported
  }
  return false;
}
