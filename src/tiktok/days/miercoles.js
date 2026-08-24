import path from 'node:path';
import {
  GREEN_BRIGHT,
  sampleColor, vGradient, roundRectPath, drawTextFitted,
  fmtRate, loadTemplate, baseCanvas, exportJpeg, renderFixed,
} from '../core.js';

const PILLS = [
  { cy: 763, key: 'lun' },
  { cy: 940, key: 'mar' },
  { cy: 1123, key: 'mie' },
];

async function slide2(snapshot, outDir) {
  const { canvas, ctx } = baseCanvas(await loadTemplate('miercoles', 2));
  vGradient(ctx, 118, 822, 662, 872, sampleColor(ctx, 470, 668), sampleColor(ctx, 470, 868));
  drawTextFitted(ctx, `S/ ${fmtRate(snapshot.buy)}`, 470, 768, { font: 'ExtraBold', size: 120, maxWidth: 690, color: '#ffffff' });
  vGradient(ctx, 118, 822, 1058, 1272, sampleColor(ctx, 470, 1066), sampleColor(ctx, 470, 1266));
  drawTextFitted(ctx, `S/ ${fmtRate(snapshot.sell)}`, 470, 1168, { font: 'ExtraBold', size: 120, maxWidth: 690, color: '#ffffff' });
  exportJpeg(canvas, path.join(outDir, 'slide2.jpg'));
}

async function slide3(diff, outDir) {
  const { canvas, ctx } = baseCanvas(await loadTemplate('miercoles', 3));
  const up = diff.direction !== 'down';
  const val = `S/ ${Math.abs(diff.amount).toFixed(3)}`;
  vGradient(ctx, 340, 870, 728, 852, sampleColor(ctx, 345, 740), sampleColor(ctx, 345, 840));
  drawTextFitted(ctx, val, 605, 791, { font: 'ExtraBold', size: 84, maxWidth: 500, color: GREEN_BRIGHT });
  vGradient(ctx, 340, 870, 1144, 1266, sampleColor(ctx, 345, 1156), sampleColor(ctx, 345, 1256));
  drawTextFitted(ctx, val, 605, 1205, { font: 'ExtraBold', size: 84, maxWidth: 500, color: '#e8362b' });
  ctx.fillStyle = 'rgba(6,12,28,0.74)';
  if (up) { roundRectPath(ctx, 52, 614, 836, 342, 30); ctx.fill(); }
  else { roundRectPath(ctx, 52, 1029, 836, 342, 30); ctx.fill(); }
  exportJpeg(canvas, path.join(outDir, 'slide3.jpg'));
}

async function slide4(days, outDir) {
  const { canvas, ctx } = baseCanvas(await loadTemplate('miercoles', 4));
  for (const p of PILLS) {
    const v = days[p.key];
    if (v == null) continue;
    const g = ctx.createLinearGradient(0, p.cy - 26, 0, p.cy + 26);
    g.addColorStop(0, sampleColor(ctx, 720, p.cy - 20));
    g.addColorStop(1, sampleColor(ctx, 720, p.cy + 20));
    ctx.fillStyle = g;
    roundRectPath(ctx, 700, p.cy - 28, 178, 56, 26);
    ctx.fill();
    drawTextFitted(ctx, `S/ ${fmtRate(v)}`, 789, p.cy, { font: 'Bold', size: 40, maxWidth: 165, color: '#ffffff' });
  }
  exportJpeg(canvas, path.join(outDir, 'slide4.jpg'));
}

export async function renderMiercoles(data, outDir) {
  await renderFixed('miercoles', 1, outDir);
  await slide2(data.snapshot, outDir);
  await slide3(data.diff, outDir);
  await slide4(data.days, outDir);
  await renderFixed('miercoles', 5, outDir);
  return [1, 2, 3, 4, 5].map((n) => path.join(outDir, `slide${n}.jpg`));
}
