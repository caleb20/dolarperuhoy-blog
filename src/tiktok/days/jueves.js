import path from 'node:path';
import { renderFixed } from '../core.js';

export async function renderJueves(outDir) {
  for (const n of [1, 2, 3, 4, 5, 6, 7]) {
    await renderFixed('jueves', n, outDir);
  }
  return [1, 2, 3, 4, 5, 6, 7].map((n) => path.join(outDir, `slide${n}.jpg`));
}
