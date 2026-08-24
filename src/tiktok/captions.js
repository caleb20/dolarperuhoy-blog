const HASHTAGS = '#Dólar #DolarHoy #Perú #TipoDeCambio #Economía #Finanzas #DolarPeruHoy #NoticiasPerú #Mercados #Ahorro';

export function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
function fmtDate(dateStr) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
}

function pick(list) {
  return list[isoWeek() % list.length];
}

export function buildLunesCaption(values) {
  const v = pick([
    { hook: '📊 ANÁLISIS SEMANAL del dólar en Perú 🇵🇪', cta: '¿Subirá o bajará esta semana? Te leemos 👇' },
    { hook: '💵 REPORTE SEMANAL: el dólar en el Perú 🇵🇪', cta: 'Guarda este post para tomar mejores decisiones 📌' },
    { hook: '🇵🇪 ¿QUÉ PASÓ CON EL DÓLAR ESTA SEMANA?', cta: 'Sígueme para el precio del dólar a diario 🔔' },
  ]);
  const arrow = values.direction === 'up' ? '📈' : values.direction === 'down' ? '📉' : '➖';
  const sign = values.direction === 'up' ? '+' : '';
  return {
    title: 'ANÁLISIS SEMANAL del dólar en Perú 🇵🇪 | DolarPeruHoy',
    description: [
      v.hook,
      '',
      `💵 Lunes: S/ ${values.open.value.toFixed(3)} → Viernes: S/ ${values.close.value.toFixed(3)}`,
      `${arrow} Variación: ${sign}${values.diff.toFixed(3)} (${sign}${values.pct.toFixed(2)}%)`,
      '',
      v.cta,
      '',
      HASHTAGS,
    ].join('\n'),
  };
}

export function buildMartesCaption(data) {
  const c1 = data.topCompra[0];
  const v1 = data.topVenta[0];
  return {
    title: '¿DÓNDE CONVIENE CAMBIAR DÓLARES HOY? 💵 | DolarPeruHoy',
    description: [
      '🏆 COMPARATIVA DE TASAS de hoy en Perú 🇵🇪',
      '',
      `💰 Mejor tasa de compra: ${c1.name} — S/ ${c1.rate.toFixed(3)}`,
      `💵 Mejor tasa de venta: ${v1.name} — S/ ${v1.rate.toFixed(3)}`,
      `🔥 Cambiando US$1,000 la diferencia entre la mejor y peor tasa es S/ ${data.diff}`,
      '',
      '🔎 Compara todas las tasas en dolarperuhoy.pe',
      '',
      HASHTAGS,
    ].join('\n'),
  };
}

export function buildMiercolesCaption(data) {
  const arrow = data.diff.direction === 'up' ? '📈 Subió' : data.diff.direction === 'down' ? '📉 Bajó' : '➖ Se mantuvo';
  const sign = data.diff.direction === 'up' ? '+' : '';
  return {
    title: '⚡ PULSO DEL DÓLAR a mitad de semana 🇵🇪 | DolarPeruHoy',
    description: [
      '⚡ PULSO DEL DÓLAR en Perú 🇵🇪',
      '',
      `💵 Compra: S/ ${data.snapshot.buy.toFixed(3)}`,
      `💵 Venta: S/ ${data.snapshot.sell.toFixed(3)}`,
      `${arrow} S/ ${sign}${Math.abs(data.diff.amount).toFixed(3)} vs. el lunes`,
      '',
      '¿Crees que el dólar seguirá subiendo o bajando? 💬 Déjanos tu opinión',
      '',
      HASHTAGS,
    ].join('\n'),
  };
}

export function buildJuevesCaption() {
  const v = pick([
    { cta: '¿Qué otro tema financiero te gustaría ver? 💬' },
    { cta: 'Guarda este post para explicarlo con datos 📌' },
  ]);
  return {
    title: '💡 ¿POR QUÉ SUBE Y BAJA EL DÓLAR? | DolarPeruHoy',
    description: [
      '💡 GUÍA FINANCIERA: ¿por qué sube y baja el dólar? 🇵🇪',
      '',
      '🌎 Economía de EE. UU.',
      '🏦 Tasas de interés',
      '📊 Oferta y demanda',
      '🇵🇪 Situación económica del Perú',
      '',
      v.cta,
      '',
      HASHTAGS,
    ].join('\n'),
  };
}

export function buildSabadoCaption() {
  return {
    title: '⚠️ 5 ERRORES al cambiar dólares | DolarPeruHoy',
    description: [
      '⚠️ 5 ERRORES que pueden hacerte PERDER DINERO al cambiar dólares 🇵🇪',
      '',
      '❌ Cambiar sin comparar tasas',
      '❌ Cambiar grandes montos en una mala tasa',
      '❌ No revisar comisiones',
      '❌ No verificar la casa de cambio',
      '❌ Esperar sin estrategia',
      '',
      '💡 Compara siempre antes de cambiar en dolarperuhoy.pe',
      '',
      HASHTAGS,
    ].join('\n'),
  };
}

export function buildCaption(day, data) {
  switch (day) {
    case 'lunes': return buildLunesCaption(data);
    case 'martes': return buildMartesCaption(data);
    case 'miercoles': return buildMiercolesCaption(data);
    case 'jueves': return buildJuevesCaption();
    case 'sabado': return buildSabadoCaption();
    default: throw new Error(`Día desconocido: ${day}`);
  }
}
