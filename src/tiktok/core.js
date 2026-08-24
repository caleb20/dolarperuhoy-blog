import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.join(__dirname, 'fonts');

export const NAVY = '#12275a';
export const GREEN = '#1f9d44';
export const GREEN_BRIGHT = '#2fbf4f';
export const RED = '#e03131';
export const GOLD = '#f5c518';
export const GRAY_TEXT = '#4b4b4b';

export const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
export const MESES_LOWER = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
export const DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];

let fontsRegistered = false;
export function registerFonts() {
  if (fontsRegistered) return;
  GlobalFonts.registerFromPath(path.join(FONT_DIR, 'Montserrat-ExtraBold.ttf'), 'Montserrat XB');
  GlobalFonts.registerFromPath(path.join(FONT_DIR, 'Montserrat-Bold.ttf'), 'Montserrat B');
  GlobalFonts.registerFromPath(path.join(FONT_DIR, 'Montserrat-SemiBold.ttf'), 'Montserrat SB');
  GlobalFonts.registerFromPath(path.join(FONT_DIR, 'Montserrat-Medium.ttf'), 'Montserrat M');
  fontsRegistered = true;
}

const FAMILIES = {
  ExtraBold: '"Montserrat XB"',
  Bold: '"Montserrat B"',
  SemiBold: '"Montserrat SB"',
  Medium: '"Montserrat M"',
};

export function sampleColor(ctx, x, y) {
  const d = ctx.getImageData(x, y, 1, 1).data;
  return `rgb(${d[0]},${d[1]},${d[2]})`;
}

export function vGradient(ctx, x0, x1, y0, y1, colorTop, colorBottom) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, colorTop);
  g.addColorStop(1, colorBottom);
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}

export function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawTextFitted(ctx, text, cx, cy, { font, size, maxWidth, color, align = 'center', shadow, minSize = 18 }) {
  const family = FAMILIES[font] || font;
  let s = size;
  ctx.font = `${font} ${s}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && s > minSize) {
    s -= 1;
    ctx.font = `${font} ${s}px ${family}`;
  }
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (shadow) {
    ctx.fillStyle = shadow;
    ctx.fillText(text, cx, cy + 3);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, cx, cy);
  return s;
}

export function wrapText(ctx, text, maxWidth, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

export function fitLines(ctx, text, maxWidth, maxLines, sizes) {
  let best = null;
  for (const size of sizes) {
    ctx.font = `${ctx.font.replace(/^\w+ \d+px/, `Medium ${size}px`)}`;
    const candidate = wrapText(ctx, text, maxWidth, maxLines);
    const full = candidate.join(' ').replace(/\s+/g, ' ').trim().length >= text.replace(/\s+/g, ' ').trim().length;
    if (full) return { size, lines: candidate };
    if (!best || candidate.length < best.lines.length) best = { size, lines: candidate };
  }
  return best;
}

export function drawArrow(ctx, cx, cy, direction, color) {
  const L = 96;
  const h = 46;
  const w = 24;
  const hw = 64;
  const rad = Math.PI / 4;
  const ux = Math.cos(rad);
  const uy = direction === 'up' ? -Math.sin(rad) : Math.sin(rad);
  const px = -uy;
  const py = ux;
  const tip = [cx + (ux * L) / 2, cy + (uy * L) / 2];
  const hb = [cx - (ux * (L / 2 - h)), cy - (uy * (L / 2 - h))];
  const base = [cx - (ux * L) / 2, cy - (uy * L) / 2];
  const pt = (c, k) => [c[0] + px * k, c[1] + py * k];
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(...tip);
  ctx.lineTo(...pt(hb, hw / 2));
  ctx.lineTo(...pt(hb, w / 2));
  ctx.lineTo(...pt(base, w / 2));
  ctx.lineTo(...pt(base, -w / 2));
  ctx.lineTo(...pt(hb, -w / 2));
  ctx.lineTo(...pt(hb, -hw / 2));
  ctx.closePath();
  ctx.fill();
}

export function fmtRate(v) {
  return Number(v).toFixed(3);
}

export function fmtComma(v) {
  return Math.round(v).toLocaleString('es-PE');
}

export function dateParts(dateStr) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  return {
    dia: DIAS[d.getUTCDay()],
    num: d.getUTCDate(),
    mes: MESES[d.getUTCMonth()],
    mesLower: MESES_LOWER[d.getUTCMonth()],
    fechaCorta: `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`,
  };
}

export async function loadTemplate(day, n) {
  registerFonts();
  return loadImage(path.join(__dirname, day, `Slide${n}.png`));
}

export function baseCanvas(img) {
  registerFonts();
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return { canvas, ctx };
}

export function exportJpeg(canvas, outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const big = createCanvas(1080, 1920);
  const bctx = big.getContext('2d');
  bctx.drawImage(canvas, 0, 0, 1080, 1920);
  fs.writeFileSync(outPath, big.toBuffer('image/jpeg', 92));
}

export async function renderFixed(day, n, outDir) {
  const img = await loadTemplate(day, n);
  const { canvas } = baseCanvas(img);
  const out = path.join(outDir, `slide${n}.jpg`);
  exportJpeg(canvas, out);
  return out;
}

export function detectWhiteCard(ctx, region) {
  const { x0, x1, y0, y1 } = region;
  const imgData = ctx.getImageData(x0, y1 === undefined ? 0 : y0, x1 - x0, (y1 || ctx.canvas.height) - (y0 || 0));
  let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1;
  const W = x1 - x0;
  for (let y = 0; y < imgData.height; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const i = (y * W + x) * 4;
      if (imgData.data[i] >= 238 && imgData.data[i + 1] >= 238 && imgData.data[i + 2] >= 238) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return {
    x: x0 + minX,
    y: (y0 || 0) + minY,
    w: maxX - minX,
    h: maxY - minY,
  };
}
