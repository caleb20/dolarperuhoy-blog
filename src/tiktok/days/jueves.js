import path from 'node:path';
import {
  loadTemplate, baseCanvas, exportJpeg, renderFixed, wrapText,
} from '../core.js';

const BODY_COLOR = '#e8edf5';
const BODY_FONT = 'Medium';

function drawParagraph(ctx, text, { x, y, maxWidth, lineHeight, size = 32 }) {
  ctx.font = `${BODY_FONT} ${size}px "Montserrat M"`;
  ctx.fillStyle = BODY_COLOR;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const lines = wrapText(ctx, text, maxWidth, 20);
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
}

// Coordenadas verificadas visualmente contra las plantillas reales (941x1672).
async function slide3(outDir) {
  const { canvas, ctx } = baseCanvas(await loadTemplate('jueves', 3));

  drawParagraph(ctx, 'El BCRP fija la tasa en Perú, y la FED hace lo mismo en EE. UU. Cuando la FED sube su tasa más rápido que el BCRP, el dólar se vuelve más atractivo para los inversionistas.', {
    x: 62, y: 545, maxWidth: 335, lineHeight: 42, size: 30,
  });

  drawParagraph(ctx, 'Sale capital de Perú buscando ese mayor rendimiento, y el dólar se encarece.', {
    x: 62, y: 1205, maxWidth: 325, lineHeight: 33, size: 24,
  });

  drawParagraph(ctx, 'El dólar pierde atractivo frente a otras monedas, y el sol tiende a fortalecerse.', {
    x: 492, y: 1205, maxWidth: 345, lineHeight: 33, size: 24,
  });

  exportJpeg(canvas, path.join(outDir, 'slide3.jpg'));
}

async function slide4(outDir) {
  const { canvas, ctx } = baseCanvas(await loadTemplate('jueves', 4));

  drawParagraph(ctx, 'Es la ley más básica del mercado cambiario: el dólar es una mercancía más. Si más personas o empresas quieren comprarlo que venderlo, su precio sube. Si ocurre lo contrario, baja.', {
    x: 70, y: 560, maxWidth: 335, lineHeight: 42, size: 30,
  });

  exportJpeg(canvas, path.join(outDir, 'slide4.jpg'));
}

async function slide5(outDir) {
  const { canvas, ctx } = baseCanvas(await loadTemplate('jueves', 5));

  drawParagraph(ctx, 'Cuando el Perú crece, exporta más y atrae inversión, el sol se fortalece porque hay más confianza en la economía local. Si hay incertidumbre política, los inversionistas prefieren resguardar su dinero en dólares.', {
    x: 62, y: 630, maxWidth: 375, lineHeight: 42, size: 30,
  });

  exportJpeg(canvas, path.join(outDir, 'slide5.jpg'));
}

export async function renderJueves(outDir) {
  await renderFixed('jueves', 1, outDir);
  await renderFixed('jueves', 2, outDir);
  await slide3(outDir);
  await slide4(outDir);
  await slide5(outDir);
  await renderFixed('jueves', 6, outDir);
  await renderFixed('jueves', 7, outDir);
  return [1, 2, 3, 4, 5, 6, 7].map((n) => path.join(outDir, `slide${n}.jpg`));
}
