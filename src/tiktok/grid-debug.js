import { createCanvas, loadImage } from '@napi-rs/canvas';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../../temp/tiktok-cal');
fs.mkdirSync(OUT, { recursive: true });

const targets = process.argv.slice(2);
for (const t of targets) {
  const [day, n] = t.split('/');
  const img = await loadImage(path.join(__dirname, day, `Slide${n}.png`));
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  ctx.strokeStyle = 'rgba(255,0,255,0.85)';
  ctx.fillStyle = 'magenta';
  ctx.font = '16px sans-serif';
  ctx.lineWidth = 1;
  for (let x = 0; x <= img.width; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, img.height); ctx.stroke();
    if (x % 100 === 0) { ctx.fillText(String(x), x + 2, 18); ctx.fillText(String(x), x + 2, img.height - 6); }
  }
  for (let y = 0; y <= img.height; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(img.width, y); ctx.stroke();
    if (y % 100 === 0) { ctx.fillText(String(y), 2, y + 16); ctx.fillText(String(y), img.width - 40, y + 16); }
  }
  fs.writeFileSync(path.join(OUT, `grid-${day}-${n}.png`), canvas.toBuffer('image/png'));
  console.log(`grid-${day}-${n}.png`);
}
