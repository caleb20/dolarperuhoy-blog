import path from 'node:path';
import {
  NAVY, GREEN, GREEN_BRIGHT, RED,
  sampleColor, vGradient, drawTextFitted, drawArrow,
  fmtRate, loadTemplate, baseCanvas, exportJpeg, renderFixed, dateParts,
} from '../core.js';

function dayLabel(dateStr) {
  const p = dateParts(dateStr);
  return `${p.dia} ${p.fechaCorta}`;
}

async function slide2(values, outDir) {
  const { canvas, ctx } = baseCanvas(await loadTemplate('lunes', 2));
  for (const [y0, y1] of [[728, 832], [958, 1062], [1156, 1262]]) {
    vGradient(ctx, 545, 895, y0, y1, sampleColor(ctx, 552, y0 + 4), sampleColor(ctx, 552, y1 - 4));
  }
  const shadow = 'rgba(4,12,32,0.9)';
  drawTextFitted(ctx, `S/ ${fmtRate(values.open.value)}`, 720, 782, { font: 'ExtraBold', size: 68, maxWidth: 330, color: '#ffffff', shadow });
  drawTextFitted(ctx, `S/ ${fmtRate(values.close.value)}`, 720, 1012, { font: 'ExtraBold', size: 68, maxWidth: 330, color: '#ffffff', shadow });
  if (values.direction === 'flat') {
    drawTextFitted(ctx, 'SIN CAMBIO', 730, 1210, { font: 'ExtraBold', size: 54, maxWidth: 300, color: '#ffffff', shadow });
  } else {
    const color = values.direction === 'up' ? GREEN_BRIGHT : RED;
    drawArrow(ctx, 597, 1207, values.direction, color);
    const sign = values.direction === 'up' ? '+' : '-';
    drawTextFitted(ctx, `${sign}${Math.abs(values.diff).toFixed(3)}`, 775, 1210, { font: 'ExtraBold', size: 62, maxWidth: 240, color, shadow });
  }
  exportJpeg(canvas, path.join(outDir, 'slide2.jpg'));
}

async function slide3(values, outDir) {
  const { canvas, ctx } = baseCanvas(await loadTemplate('lunes', 3));
  ctx.fillStyle = sampleColor(ctx, 60, 700);
  ctx.fillRect(42, 660, 858, 675);

  const days = values.days.slice(0, 5);
  const vals = days.map((d) => d.value);
  const step = 0.02;
  const minR = Math.floor((Math.min(...vals) - 0.004) / step) * step;
  let maxR = Math.ceil((Math.max(...vals) + 0.004) / step) * step;
  if (maxR - minR < step * 2) maxR = minR + step * 2;
  const ticks = [];
  for (let v = maxR; v >= minR - 1e-9; v -= (maxR - minR) / 4) ticks.push(Number(v.toFixed(4)));

  const axisX = 126;
  const plotRight = 890;
  const topY = 685;
  const baseY = 1245;
  const yFor = (v) => baseY - ((v - minR) / (maxR - minR)) * (baseY - topY);

  ctx.textBaseline = 'middle';
  ctx.font = 'ExtraBold 30px "Montserrat XB"';
  ctx.fillStyle = NAVY;
  ctx.textAlign = 'right';
  for (const t of ticks) ctx.fillText(t.toFixed(3), 116, yFor(t));

  ctx.strokeStyle = 'rgba(160,170,160,0.7)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 7]);
  for (const t of ticks) {
    if (Math.abs(yFor(t) - baseY) < 1) continue;
    ctx.beginPath();
    ctx.moveTo(axisX + 6, yFor(t));
    ctx.lineTo(plotRight, yFor(t));
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(axisX, topY - 18);
  ctx.lineTo(axisX, baseY);
  ctx.lineTo(plotRight + 4, baseY);
  ctx.stroke();

  const n = days.length;
  const xFor = (i) => (n === 1 ? (axisX + plotRight) / 2 : 200 + (i * 645) / (n - 1));
  const pts = days.map((d, i) => ({ x: xFor(i), y: yFor(d.value), ...d }));

  const areaGrad = ctx.createLinearGradient(0, topY, 0, baseY);
  areaGrad.addColorStop(0, 'rgba(60,170,75,0.32)');
  areaGrad.addColorStop(1, 'rgba(60,170,75,0.05)');
  ctx.fillStyle = areaGrad;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, baseY);
  for (const p of pts) ctx.lineTo(p.x, p.y);
  ctx.lineTo(pts[pts.length - 1].x, baseY);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  ctx.textAlign = 'center';
  for (const p of pts) {
    const lx = Math.min(Math.max(p.x, 80), 862);
    drawTextFitted(ctx, p.value.toFixed(3), lx, p.y - 32, { font: 'ExtraBold', size: 30, maxWidth: 90, color: NAVY });
  }
  for (const p of pts) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = GREEN;
    ctx.stroke();
  }
  for (let i = 0; i < n; i++) {
    const d = days[i];
    const [dia, ...rest] = d.label.split(' ');
    const x = pts[i].x;
    ctx.font = 'Bold 29px "Montserrat B"';
    ctx.fillStyle = NAVY;
    ctx.fillText(dia, x, 1282);
    ctx.font = 'Medium 27px "Montserrat M"';
    ctx.fillStyle = GREEN;
    ctx.fillText(rest.join(' '), x, 1316);
  }
  exportJpeg(canvas, path.join(outDir, 'slide3.jpg'));
}

async function slide4(factors, outDir) {
  const { canvas, ctx } = baseCanvas(await loadTemplate('lunes', 4));
  const rows = [
    { ribbon: [644, 709], card: [715, 868], lineY: [748, 793, 838] },
    { ribbon: [905, 971], card: [975, 1128], lineY: [1008, 1053, 1098] },
    { ribbon: [1167, 1238], card: [1242, 1388], lineY: [1268, 1313, 1358] },
  ];
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 3; i++) {
    const f = factors[i] || { title: `FACTOR ${i + 1}`, description: '' };
    const r = rows[i];
    const rg = ctx.createLinearGradient(0, r.ribbon[0], 0, r.ribbon[1]);
    rg.addColorStop(0, sampleColor(ctx, 380, r.ribbon[0] + 8));
    rg.addColorStop(1, sampleColor(ctx, 380, r.ribbon[1] - 8));
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(345, r.ribbon[0]);
    ctx.lineTo(692, r.ribbon[0]);
    ctx.lineTo(656, r.ribbon[1]);
    ctx.lineTo(345, r.ribbon[1]);
    ctx.closePath();
    ctx.fill();
    drawTextFitted(ctx, f.title.toUpperCase(), 505, (r.ribbon[0] + r.ribbon[1]) / 2, {
      font: 'ExtraBold', size: 40, maxWidth: 270, color: '#ffffff', shadow: 'rgba(0,40,10,0.55)',
    });
    ctx.fillStyle = sampleColor(ctx, 860, r.card[0] + 8);
    ctx.fillRect(400, r.card[0], 470, r.card[1] - r.card[0]);
    ctx.textAlign = 'left';
    let lines = null;
    for (const size of [33, 30, 27, 25]) {
      ctx.font = `Medium ${size}px "Montserrat M"`;
      const cand = wrap3(ctx, f.description, 445);
      if (cand.length <= 3) { lines = cand; break; }
      if (!lines || cand.length < lines.length) lines = cand;
    }
    lines.forEach((ln, li) => {
      ctx.fillStyle = '#4b4b4b';
      ctx.fillText(ln, 418, r.lineY[li]);
    });
  }
  exportJpeg(canvas, path.join(outDir, 'slide4.jpg'));
}

function wrap3(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth) line = test;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderLunes(values, factors, outDir) {
  values.days = values.days.map((d) => ({ ...d, label: dayLabel(d.date) }));
  await renderFixed('lunes', 1, outDir);
  await slide2(values, outDir);
  await slide3(values, outDir);
  await slide4(factors, outDir);
  await renderFixed('lunes', 5, outDir);
  await renderFixed('lunes', 6, outDir);
  return [1, 2, 3, 4, 5, 6].map((n) => path.join(outDir, `slide${n}.jpg`));
}
