import QRCode from 'qrcode';
import {
  POSTER_COLORS as C,
  POSTER_FONTS as F,
  POSTER_H as H,
  POSTER_W as W,
  buildInfoItems,
  workTypeLabel,
} from '@/lib/poster-design-tokens';

export interface PosterInput {
  type: 'story' | 'memory' | 'movie';
  title: string;
  subtitle?: string;
  summary: string;
  familyName: string;
  photoUrls: string[];
  shareUrl: string;
  /** 最多 3 项，竖线分隔 */
  infoItems?: string[];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function assetUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
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
        let truncated = text.slice(i);
        while (ctx.measureText(`${truncated}…`).width > maxWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
        }
        ctx.fillText(`${truncated}…`, x, currentY);
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

function drawPaperTexture(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  const grain = ctx.createLinearGradient(0, 0, W, H);
  grain.addColorStop(0, 'rgba(255,253,249,0.4)');
  grain.addColorStop(1, 'rgba(248,236,220,0.25)');
  ctx.fillStyle = grain;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.035;
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    ctx.fillStyle = Math.random() > 0.5 ? '#4A3326' : '#DF8B3A';
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();
}

function drawDecorations(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = C.darkCoffee;
  ctx.lineWidth = 2;
  drawRoundRect(ctx, 32, 120, 96, 72, 6);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(620, 180, 28, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = C.brandYellow;
  ctx.globalAlpha = 0.05;
  ctx.font = '20px serif';
  ctx.fillText('✦', 680, 260);
  ctx.fillText('♥', 58, 320);
  ctx.fillText('✦', 702, 980);

  ctx.strokeStyle = C.brandOrange;
  ctx.globalAlpha = 0.03;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(40, 900);
  ctx.quadraticCurveTo(200, 860, 360, 920);
  ctx.stroke();
  ctx.restore();
}

interface PhotoSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  url: string;
}

function buildPhotoSlots(urls: string[], boxX: number, boxY: number, boxW: number, boxH: number): PhotoSlot[] {
  const list = urls.filter(Boolean).slice(0, 4);
  if (list.length === 0) return [];

  if (list.length === 1) {
    return [{ x: boxX + 8, y: boxY + 8, w: boxW - 16, h: boxH - 16, rot: -1.2, url: list[0] }];
  }

  if (list.length === 2) {
    const gap = 12;
    const pw = (boxW - gap - 24) / 2;
    return [
      { x: boxX + 12, y: boxY + 16, w: pw, h: boxH - 32, rot: -2.5, url: list[0] },
      { x: boxX + 12 + pw + gap, y: boxY + 24, w: pw, h: boxH - 40, rot: 2, url: list[1] },
    ];
  }

  const gap = 8;
  const pw = (boxW - gap - 20) / 2;
  const ph = (boxH - gap - 20) / 2;
  const rots = [-2.2, 1.8, -1.5, 2.4];
  const offsets = [
    [10, 12],
    [10 + pw + gap, 18],
    [16, 12 + ph + gap],
    [8 + pw + gap, 8 + ph + gap],
  ];
  return list.map((url, i) => ({
    x: boxX + offsets[i][0],
    y: boxY + offsets[i][1],
    w: pw,
    h: ph,
    rot: rots[i],
    url,
  }));
}

async function drawPhotoCollage(
  ctx: CanvasRenderingContext2D,
  urls: string[],
  type: PosterInput['type']
) {
  const boxX = 40;
  const boxY = 168;
  const boxW = W - 80;
  const boxH = type === 'memory' ? 520 : 480;
  const slots = buildPhotoSlots(urls, boxX, boxY, boxW, boxH);

  if (slots.length === 0) {
    drawRoundRect(ctx, boxX, boxY, boxW, boxH, 22);
    ctx.fillStyle = '#F5EBDD';
    ctx.fill();
    ctx.strokeStyle = 'rgba(223,139,58,0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    return boxY + boxH;
  }

  for (const slot of slots) {
    ctx.save();
    ctx.translate(slot.x + slot.w / 2, slot.y + slot.h / 2);
    ctx.rotate((slot.rot * Math.PI) / 180);

    const bx = -slot.w / 2;
    const by = -slot.h / 2;
    const border = 5;

    ctx.shadowColor = 'rgba(74, 51, 38, 0.12)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = C.photoBorder;
    drawRoundRect(ctx, bx - border, by - border, slot.w + border * 2, slot.h + border * 2, 20);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    drawRoundRect(ctx, bx, by, slot.w, slot.h, 18);
    ctx.clip();
    try {
      const img = await loadImage(slot.url);
      drawCoverImage(ctx, img, bx, by, slot.w, slot.h);
    } catch {
      ctx.fillStyle = '#F0E8D8';
      ctx.fillRect(bx, by, slot.w, slot.h);
    }
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = C.tape;
  ctx.fillRect(boxX + boxW * 0.62, boxY + 8, 52, 18);
  ctx.fillStyle = C.brandYellow;
  ctx.globalAlpha = 0.45;
  ctx.font = '14px serif';
  ctx.fillText('✦', boxX + 18, boxY + boxH - 12);
  ctx.restore();

  return boxY + boxH;
}

function drawInfoRow(ctx: CanvasRenderingContext2D, items: string[], y: number): number {
  if (items.length === 0) return y;
  ctx.font = `400 15px ${F.body}`;
  ctx.fillStyle = C.auxCoffee;
  ctx.textAlign = 'center';

  const usable = items.slice(0, 3);
  const segW = (W - 96) / usable.length;
  usable.forEach((item, i) => {
    const cx = 48 + segW * i + segW / 2;
    const lines = item.length > 14 ? 2 : 1;
    wrapText(ctx, item, cx - segW / 2 + 8, y, segW - 16, 22, lines);
    if (i > 0) {
      ctx.strokeStyle = C.divider;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(48 + segW * i, y - 8);
      ctx.lineTo(48 + segW * i, y + 28);
      ctx.stroke();
    }
  });
  return y + 36;
}

async function drawShareZone(ctx: CanvasRenderingContext2D, shareUrl: string, y: number) {
  const zoneH = 168;
  const zoneX = 36;
  const zoneW = W - 72;
  const zoneY = y;

  drawRoundRect(ctx, zoneX, zoneY, zoneW, zoneH, 24);
  ctx.fillStyle = C.shareZoneBg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(246, 181, 27, 0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();

  try {
    const mascot = await loadImage(assetUrl('/niannian/mascot-wave.poster.png'));
    ctx.drawImage(mascot, zoneX + 16, zoneY + zoneH / 2 - 36, 72, 72);
  } catch {
    ctx.fillStyle = C.brandOrange;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(zoneX + 52, zoneY + zoneH / 2, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const bubbleX = zoneX + 96;
  const bubbleW = zoneW - 96 - 150;
  drawRoundRect(ctx, bubbleX, zoneY + 28, bubbleW, 56, 16);
  ctx.fillStyle = C.card;
  ctx.fill();
  ctx.strokeStyle = 'rgba(125, 92, 57, 0.12)';
  ctx.stroke();

  ctx.fillStyle = C.darkCoffee;
  ctx.font = `400 13px ${F.hand}`;
  ctx.textAlign = 'left';
  wrapText(
    ctx,
    '把照片留下，把故事留下，把记忆留下。',
    bubbleX + 12,
    zoneY + 50,
    bubbleW - 20,
    20,
    2
  );

  const qrSize = 120;
  const qrX = zoneX + zoneW - qrSize - 16;
  const qrY = zoneY + 24;
  const qrDataUrl = await QRCode.toDataURL(shareUrl, {
    width: qrSize,
    margin: 1,
    color: { dark: C.darkCoffee, light: '#FFFFFF' },
  });
  drawRoundRect(ctx, qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 14);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  const qrImg = await loadImage(qrDataUrl);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = C.darkCoffee;
  ctx.font = `600 13px ${F.body}`;
  ctx.textAlign = 'left';
  ctx.fillText('扫码查看完整内容', bubbleX, zoneY + 100);
  ctx.fillStyle = C.lightCoffee;
  ctx.font = `400 11px ${F.body}`;
  ctx.fillText('长按保存海报', bubbleX, zoneY + 122);
  ctx.fillText('分享转发', bubbleX, zoneY + 138);
  ctx.fillText('和家人一起回忆', bubbleX, zoneY + 154);

  return zoneY + zoneH;
}

export async function generateSharePoster(input: PosterInput): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 不可用');

  drawPaperTexture(ctx);
  drawDecorations(ctx);

  try {
    const logo = await loadImage(assetUrl('/niannian/brand-banner.png'));
    const logoH = 88;
    const logoW = (logo.width / logo.height) * logoH;
    ctx.drawImage(logo, (W - logoW) / 2, 32, logoW, logoH);
  } catch {
    try {
      const banner = await loadImage(assetUrl('/niannian/brand-logo.png'));
      const logoH = 96;
      const logoW = (banner.width / banner.height) * logoH;
      ctx.drawImage(banner, (W - logoW) / 2, 28, logoW, logoH);
    } catch {
      /* skip logo */
    }
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = C.darkCoffee;
  ctx.font = `700 28px ${F.brand}`;
  ctx.fillText('念念年年', W / 2, 148);

  ctx.fillStyle = C.brandOrange;
  ctx.font = `500 18px ${F.body}`;
  ctx.fillText(workTypeLabel(input.type), W / 2, 176);

  const photoBottom = await drawPhotoCollage(ctx, input.photoUrls, input.type);

  let textY = photoBottom + 36;
  ctx.textAlign = 'left';
  ctx.fillStyle = C.darkCoffee;
  ctx.font = `700 32px ${F.brand}`;
  textY = wrapText(ctx, input.title, 48, textY, W - 96, 40, 2) + 12;

  const infoItems =
    input.infoItems ??
    buildInfoItems({
      type: input.type,
      subtitle: input.subtitle,
      familyName: input.familyName,
      photoCount: input.photoUrls.filter(Boolean).length,
    });
  textY = drawInfoRow(ctx, infoItems, textY) + 8;

  if (input.summary) {
    ctx.fillStyle = C.auxCoffee;
    ctx.font = `400 16px ${F.body}`;
    wrapText(ctx, input.summary, 48, textY, W - 96, 26, 3);
  }

  const shareZoneY = H - 28 - 24 - 168;
  await drawShareZone(ctx, input.shareUrl, shareZoneY);

  ctx.textAlign = 'center';
  ctx.fillStyle = C.lightCoffee;
  ctx.font = `400 12px ${F.body}`;
  ctx.fillText('让每一张照片都成为回家的理由', W / 2, H - 28);

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
    /* user cancelled */
  }
  return false;
}
