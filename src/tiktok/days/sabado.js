import path from 'node:path';
import {
  GRAY_TEXT,
  loadTemplate, baseCanvas, exportJpeg, renderFixed,
} from '../core.js';

// Detecta la tarjeta blanca grande del lado izquierdo (slides de "Error #N")
function detectWhiteCard(ctx) {
  let bestRow = null;
  let top = -1;
  let bottom = -1;
  for (let y = 560; y <= 1360; y += 2) {
    const row = ctx.getImageData(25, y, 545, 1).data;
    let runStart = -1;
    let bestRun = null;
    for (let x = 0; x <= 545; x++) {
      const i = x * 4;
      const r = row[i], g = row[i + 1], b = row[i + 2];
      const bright = (r + g + b) / 3 >= 225;
      const neutral = Math.max(r, g, b) - Math.min(r, g, b) <= 34;
      const white = x < 545 && bright && neutral;
      if (white && runStart < 0) runStart = x;
      if ((!white || x === 544) && runStart >= 0) {
        const len = x - runStart;
        if (len > 220 && (!bestRun || len > bestRun.w)) bestRun = { x: 25 + runStart, w: len };
        runStart = -1;
      }
    }
    if (bestRun) {
      if (top < 0) top = y;
      bottom = y;
      if (!bestRow || bestRun.w > bestRow.w) bestRow = { ...bestRun, y };
    }
  }
  if (!bestRow) return null;
  return { x: bestRow.x + 30, y: top + 55, w: bestRow.w - 60, h: bottom - top - 95 };
}

async function slideError(n, explicacion, outDir) {
  const { canvas, ctx } = baseCanvas(await loadTemplate('sabado', n));
  const card = detectWhiteCard(ctx);
  if (!card) throw new Error(`No se encontró la tarjeta blanca en Slide${n} de sábado`);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let placed = null;
  for (const size of [34, 31, 28, 25, 23]) {
    const lh = Math.round(size * 1.35);
    ctx.font = `Medium ${size}px "Montserrat M"`;
    const maxLines = Math.max(3, Math.floor(card.h / lh));
    const lines = wrap(ctx, explicacion, card.w, maxLines);
    const totalH = lines.length * lh;
    if (totalH <= card.h && lines.join(' ').length >= explicacion.replace(/\s+/g, ' ').trim().length - 1) {
      placed = { lines, lh, size };
      break;
    }
    if (!placed || lines.length * lh < placed.lines.length * placed.lh) {
      placed = { lines, lh, size };
    }
  }
  const startY = card.y + Math.max(18, (card.h - placed.lines.length * placed.lh) / 2);
  placed.lines.forEach((ln, i) => {
    ctx.fillStyle = GRAY_TEXT;
    ctx.fillText(ln, card.x, startY + i * placed.lh);
  });
  exportJpeg(canvas, path.join(outDir, `slide${n}.jpg`));
}

function wrap(ctx, text, maxWidth, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth) line = test;
    else {
      if (line) lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

export async function renderSabado(explicaciones, outDir) {
  await renderFixed('sabado', 1, outDir);
  for (let i = 0; i < 5; i++) {
    await slideError(i + 2, explicaciones[i] || '', outDir);
  }
  await renderFixed('sabado', 7, outDir);
  await renderFixed('sabado', 8, outDir);
  return [1, 2, 3, 4, 5, 6, 7, 8].map((n) => path.join(outDir, `slide${n}.jpg`));
}
