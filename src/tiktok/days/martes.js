import path from 'node:path';
import {
  NAVY, GOLD,
  sampleColor, vGradient, drawTextFitted, fmtRate, fmtComma,
  loadTemplate, baseCanvas, exportJpeg, renderFixed, dateParts,
} from '../core.js';

const VALUE_COLORS = ['#178a3a', '#1e4f9e', '#e2660f'];
const ROWS = [
  { nameY: 838, valY: 880 },
  { nameY: 1068, valY: 1110 },
  { nameY: 1298, valY: 1340 },
];

async function slide1(dateStr, outDir) {
  const { canvas, ctx } = baseCanvas(await loadTemplate('martes', 1));
  vGradient(ctx, 455, 805, 1018, 1092, sampleColor(ctx, 460, 1026), sampleColor(ctx, 460, 1084));
  const p = dateParts(dateStr);
  ctx.font = 'Bold 50px "Montserrat B"';
  const num = String(p.num);
  const rest = ` de ${p.mesLower}`;
  const total = ctx.measureText(num + rest).width;
  let x = 630 - total / 2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = GOLD;
  ctx.fillText(num, x, 1055);
  x += ctx.measureText(num).width;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(rest, x, 1055);
  exportJpeg(canvas, path.join(outDir, 'slide1.jpg'));
}

async function slideRanking(n, casas, outDir) {
  const { canvas, ctx } = baseCanvas(await loadTemplate('martes', n));
  casas.forEach((casa, i) => {
    const r = ROWS[i];
    vGradient(ctx, 368, 560, r.nameY - 33, r.nameY + 33, sampleColor(ctx, 450, r.nameY - 45), sampleColor(ctx, 450, r.nameY + 40));
    drawTextFitted(ctx, casa.name, 462, r.nameY, { font: 'Bold', size: 44, maxWidth: 185, color: NAVY, minSize: 26 });
    vGradient(ctx, 603, 882, r.valY - 42, r.valY + 42, sampleColor(ctx, 880, r.valY - 40), sampleColor(ctx, 880, r.valY + 42));
    drawTextFitted(ctx, `S/ ${fmtRate(casa.rate)}`, 742, r.valY, { font: 'ExtraBold', size: 56, maxWidth: 272, color: VALUE_COLORS[i] });
  });
  exportJpeg(canvas, path.join(outDir, `slide${n}.jpg`));
}

async function slide4(datos, outDir) {
  const { canvas, ctx } = baseCanvas(await loadTemplate('martes', 4));
  vGradient(ctx, 62, 408, 882, 968, sampleColor(ctx, 418, 892), sampleColor(ctx, 418, 960));
  drawTextFitted(ctx, `S/ ${fmtComma(datos.best * 1000)}`, 235, 925, { font: 'ExtraBold', size: 60, maxWidth: 340, color: '#1a8f3c' });
  vGradient(ctx, 528, 882, 882, 968, sampleColor(ctx, 890, 892), sampleColor(ctx, 890, 960));
  drawTextFitted(ctx, `S/ ${fmtComma(datos.worst * 1000)}`, 705, 925, { font: 'ExtraBold', size: 60, maxWidth: 350, color: '#d92b2b' });
  vGradient(ctx, 228, 578, 1226, 1355, sampleColor(ctx, 215, 1258), sampleColor(ctx, 215, 1342));
  drawTextFitted(ctx, `S/ ${fmtComma(datos.diff)}`, 403, 1300, { font: 'ExtraBold', size: 74, maxWidth: 340, color: GOLD });
  exportJpeg(canvas, path.join(outDir, 'slide4.jpg'));
}

async function slide5(bestName, outDir) {
  const { canvas, ctx } = baseCanvas(await loadTemplate('martes', 5));
  vGradient(ctx, 355, 808, 878, 1018, sampleColor(ctx, 700, 890), sampleColor(ctx, 700, 1005));
  drawTextFitted(ctx, bestName.toUpperCase(), 580, 948, { font: 'ExtraBold', size: 92, maxWidth: 440, color: '#1a7a3a', minSize: 40 });
  exportJpeg(canvas, path.join(outDir, 'slide5.jpg'));
}

export function computeMartesData(houses) {
  const valid = (houses || []).filter((h) => h.buy_rate != null && h.sell_rate != null);
  if (valid.length < 2) throw new Error('Se requieren al menos 2 casas de cambio para martes');
  const topCompra = [...valid].sort((a, b) => b.buy_rate - a.buy_rate).slice(0, 3)
    .map((h) => ({ name: h.name, rate: Number(h.buy_rate) }));
  const topVenta = [...valid].sort((a, b) => a.sell_rate - b.sell_rate).slice(0, 3)
    .map((h) => ({ name: h.name, rate: Number(h.sell_rate) }));
  const rates = valid.map((h) => Number(h.buy_rate));
  const best = Math.max(...rates);
  const worst = Math.min(...rates);
  const bestHouse = valid.find((h) => Number(h.buy_rate) === best);
  return {
    topCompra,
    topVenta,
    best,
    worst,
    diff: Math.round((best - worst) * 1000),
    bestHouse: bestHouse.name,
    dateStr: valid[0].updated_at ? String(valid[0].updated_at).slice(0, 10) : null,
  };
}

export async function renderMartes(data, outDir, today) {
  await slide1(today, outDir);
  await slideRanking(2, data.topCompra, outDir);
  await slideRanking(3, data.topVenta, outDir);
  await slide4(data, outDir);
  await slide5(data.bestHouse, outDir);
  await renderFixed('martes', 6, outDir);
  return [1, 2, 3, 4, 5, 6].map((n) => path.join(outDir, `slide${n}.jpg`));
}
