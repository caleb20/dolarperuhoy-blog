const FALLBACK = {
  up: [
    { title: 'MAYOR DEMANDA', description: 'Aumentó la demanda de dólares en el mercado local y presionó el tipo de cambio al alza.' },
    { title: 'DÓLAR GLOBAL', description: 'La fortaleza internacional del dólar tras novedades económicas de EE. UU. influyó en el sol.' },
    { title: 'FLUJO EXTERIOR', description: 'Menor ingreso de divisas por exportaciones e inversión afectó la oferta de dólares.' },
  ],
  down: [
    { title: 'MAYOR OFERTA', description: 'Mayor oferta de dólares en el mercado local ayudó a que el tipo de cambio bajara.' },
    { title: 'INTERVENCIÓN', description: 'Las intervenciones del BCRP en el mercado cambiario contribuyeron a estabilizar el precio.' },
    { title: 'PRECIO COBRE', description: 'El buen momento del cobre y otras materias primas fortaleció al sol frente al dólar.' },
  ],
  flat: [
    { title: 'MERCADO CALMO', description: 'Un mercado cambiario estable mantuvo el tipo de cambio casi sin cambios esta semana.' },
    { title: 'BALANCE BCPR', description: 'Las operaciones del BCRP equilibraron la oferta y demanda de divisas.' },
    { title: 'SIN NOVEDAD', description: 'Sin factores locales ni internacionales relevantes que movieran el precio.' },
  ],
};

export function fallbackFactors(direction) {
  return FALLBACK[direction] || FALLBACK.flat;
}

export async function generateFactors(openai, model, values) {  const dias = values.days.map((d) => `${d.date}: S/ ${d.value.toFixed(3)}`).join(', ');
  const prompt = `Eres analista financiero del portal DolarPeruHoy (Perú). Esta semana el tipo de cambio USD/PEN ${values.direction === 'up' ? 'SUBIÓ' : values.direction === 'down' ? 'BAJÓ' : 'SE MANTUVO'} de S/ ${values.open.value.toFixed(3)} (lunes ${values.open.date}) a S/ ${values.close.value.toFixed(3)} (viernes ${values.close.date}). Variación: ${values.diff.toFixed(3)} (${values.pct.toFixed(2)}%). Datos diarios: ${dias}.

Genera los 3 principales factores que explican ese movimiento esta semana (demanda de divisas, BCRP, commodities/cobre, dólar global, política local, flujos de inversión, etc.).

Responde SOLO con JSON válido, sin texto extra:
{"factors":[{"title":"...","description":"..."}]}

Reglas estrictas:
- Exactamente 3 factores, ordenados por importancia.
- "title": máximo 16 caracteres, en MAYÚSCULAS, sin punto final.
- "description": máximo 95 caracteres, explica el factor y cómo impactó en el dólar. Sin hashtags.`;

  const res = await openai.chat.completions.create({
    model: model || 'gpt-4.1-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.6,
  });
  const parsed = JSON.parse(res.choices[0].message.content);
  const factors = (parsed.factors || []).slice(0, 3);
  if (factors.length !== 3 || factors.some((f) => !f.title || !f.description)) {
    throw new Error('Respuesta IA incompleta para factores');
  }
  return factors;
}

export const SABADO_ERRORES = [
  'Cambiar sin comparar tasas.',
  'Cambiar grandes cantidades en una mala tasa.',
  'No revisar si existen comisiones.',
  'No verificar la casa de cambio.',
  'Esperar demasiado sin tener una estrategia.',
];

const EXPLICACIONES_FALLBACK = [
  'Las casas de cambio pueden variar varios centavos entre s�. Sin comparar, puedes perder una parte importante de tu dinero en cada operaci�n que realizas.',
  'Cuanto mayor es el monto, mayor es el impacto de una mala tasa. Unos centavos de diferencia sobre una cifra grande representan una p�rdida real de soles.',
  'Algunas casas anuncian tasas atractivas pero cobran comisiones o cargos ocultos. La tasa final que recibes puede ser peor que la que viste al inicio.',
  'Cambiar en lugares no autorizados o informales expone tu dinero a riesgos: tasas enga�osas, billetes falsos y cero protecci�n si algo sale mal.',
  'El tipo de cambio cambia a cada momento. Esperar el momento perfecto casi nunca funciona y muchas terminan cambiando en peores condiciones.',
];

export async function generateErrorExplicaciones(openai, model) {
  const lista = SABADO_ERRORES.map((e, i) => `${i + 1}. ${e}`).join('\n');
  const prompt = [
    'Eres el editor financiero de DolarPeruHoy (Peru). Para un carrusel educativo sobre errores al cambiar dolares, explica por que cada uno es un error:',
    '',
    lista,
    '',
    'Responde SOLO con JSON valido:',
    '{"explicaciones":["..."]}',
    '',
    'Reglas: exactamente 5 explicaciones en el mismo orden, cada una de 130 a 240 caracteres, tono simple y directo para publico general peruano, sin hashtags ni emojis.',
  ].join('\n');
  const res = await openai.chat.completions.create({
    model: model || 'gpt-4.1-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });
  const parsed = JSON.parse(res.choices[0].message.content);
  const list = parsed.explicaciones || [];
  if (list.length !== 5 || list.some((t) => typeof t !== 'string' || t.length < 40)) {
    throw new Error('Respuesta IA incompleta para explicaciones');
  }
  return list;
}

export function fallbackExplicaciones() {
  return EXPLICACIONES_FALLBACK;
}
