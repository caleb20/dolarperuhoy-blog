import OpenAI from 'openai';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

const BASE_SYSTEM = `Eres un analista economico especializado en el mercado cambiario peruano (USD/PEN).
Escribes contenido ORIGINAL para DolarPeruHoy.pe.

REGLAS ESTRICTAS (APLICAN A TODOS LOS TIPOS):
1. NO inventes fuentes externas, noticias, o citas de medios
2. NO menciones "segun X medio" o "como reporto Y"
3. NO copies contenido de otros sitios
4. Escribe en español peruano, tono profesional pero accesible
5. NO uses asteriscos ni markdown en body_html, solo HTML real
6. Debe tener al menos 400 palabras
7. Incluye un <h2>Conclusion</h2> al final`;

function getDayContext() {
  return new Date().toLocaleDateString('es-PE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function buildWeeklyPrompt(data) {
  return `Fecha actual: ${getDayContext()}

Debes escribir un ANALISIS SEMANAL del tipo de cambio en Peru.

DATOS DE LA SEMANA (${data.sunatWeek.length} dias utiles):
${JSON.stringify(data.sunatWeek, null, 2)}

${data.variationText ? `RESUMEN: ${data.variationText}` : ''}

SNAPSHOTS RECIENTES:
${JSON.stringify(data.snapshots.slice(0, 15), null, 2)}

CASAS DE CAMBIO (tasas actuales):
${JSON.stringify(data.houses.slice(0, 10), null, 2)}

Genera un analisis semanal en formato JSON.
ESTRUCTURA:
{
  "title": "string (max 70 chars, ej: 'Analisis Semanal del Dolar: del X al Y de Mayo')",
  "excerpt": "string (2-3 oraciones de resumen, 130-200 chars)",
  "body_html": "string (articulo completo en HTML, 400-800 palabras)",
  "analysis_text": "string (4-6 oraciones destacando lo mas importante)",
  "impact_text": "string (impacto en Peru, 3-4 oraciones)",
  "tags": "string[] (3-6 tags)",
  "seo_title": "string (max 60 chars)",
  "seo_description": "string (max 160 chars)",
  "read_time_minutes": "number (3-8)"
}

ESTRUCTURA DEL ARTICULO (body_html):
- <h2>Resumen semanal</h2>: apertura, cierre, variacion con cifras exactas
- <h2>Dia con mayor variacion</h2>: cual dia cambio mas y cuanto
- <h2>Comparativa entre casas de cambio</h2>: mejores tasas, diferencias
- <h2>Perspectiva</h2>: tendencia basada en los datos
- <h2>Recomendacion</h2>: consejo practico
- <h2>Conclusion</h2>

TODAS las cifras deben venir EXACTAMENTE de los datos proporcionados.`;
}

function buildMidweekPrompt(data) {
  const snapshots = data.snapshots || [];
  const first = snapshots[snapshots.length - 1] || null;
  const last = snapshots[0] || null;
  let variation = '';
  if (first && last) {
    const diff = last.sell_rate - first.sell_rate;
    const dir = diff > 0 ? 'subido' : diff < 0 ? 'bajado' : 'se ha mantenido';
    variation = `En lo que va de semana, el dolar ha ${dir} de S/${Number(first.sell_rate).toFixed(3)} a S/${Number(last.sell_rate).toFixed(3)}`;
  }

  return `Fecha actual: ${getDayContext()}

Debes escribir un ANALISIS DE MEDIA SEMANA del tipo de cambio en Peru.

DATOS RECIENTES:
${variation}

SNAPSHOTS DE LOS ULTIMOS DIAS:
${JSON.stringify(snapshots.slice(0, 10), null, 2)}

CASAS DE CAMBIO (tasas actuales):
${JSON.stringify((data.houses || []).slice(0, 10), null, 2)}

Genera un analisis de media semana en formato JSON.
ESTRUCTURA:
{
  "title": "string (max 70 chars, ej: 'Pulso del Dolar a Media Semana: [tendencia]')",
  "excerpt": "string (2-3 oraciones, 130-200 chars)",
  "body_html": "string (articulo en HTML, 300-500 palabras)",
  "analysis_text": "string (3-4 oraciones)",
  "impact_text": "string (impacto en Peru, 2-3 oraciones)",
  "tags": "string[] (3-6 tags)",
  "seo_title": "string (max 60 chars)",
  "seo_description": "string (max 160 chars)",
  "read_time_minutes": "number (3-6)"
}

ESTRUCTURA (body_html):
- <h2>Como va la semana</h2>: direccion del dolar, cifras
- <h2>Mejores tasas hoy</h2>: casas de cambio destacadas
- <h2>Perspectiva</h2>: hacia donde podria ir basado en la tendencia
- <h2>Conclusion</h2>`;
}

const EDUCATIONAL_TOPICS = [
  "Que es el spread cambiario y por que deberia importarte",
  "5 errores comunes al cambiar dolares en Peru",
  "Casas de cambio online vs bancos: cual te conviene mas",
  "Por que sube y baja el dolar: factores que afectan el tipo de cambio",
  "Como proteger tus ahorros de la volatilidad cambiaria",
  "Conviene comprar dolares ahora o esperar: guia practica",
  "Todo lo que debes saber sobre el spread bancario en Peru",
  "El rol del BCRP en el tipo de cambio peruano",
  "Remesas desde el extranjero: como obtener el mejor tipo de cambio",
  "Diferencias entre tipo de cambio oficial, paralelo e interbancario",
  "Cuando es mejor cambiar dolares en Peru: horarios y dias recomendados",
  "Como detectar una buena tasa de cambio vs una mala",
  "Estrategias de ahorro en dolares para peruanos",
  "Entendiendo la dolarizacion parcial de la economia peruana",
  "Impuestos y comisiones al cambiar dolares en Peru: lo que debes saber",
];

function getRandomTopic() {
  return EDUCATIONAL_TOPICS[Math.floor(Math.random() * EDUCATIONAL_TOPICS.length)];
}

function buildEducationalPrompt() {
  const topic = getRandomTopic();
  return `Fecha actual: ${getDayContext()}

Debes escribir un ARTICULO EDUCATIVO sobre el tipo de cambio en Peru.

TEMA ASIGNADO: "${topic}"

INSTRUCCIONES:
- Escribe contenido EDUCATIVO y ORIGINAL sobre este tema
- NO cites fuentes externas, periodicos, ni medios de comunicacion
- NO menciones eventos especificos de fechas concretas
- Usa conocimiento general sobre economia y finanzas
- El tono debe ser didactico y accesible para el publico general
- Da ejemplos practicos y consejos utiles
- No hagas referencia a "segun expertos" o "estudios recientes"

Genera el articulo en formato JSON.
ESTRUCTURA:
{
  "title": "string (max 70 chars, sobre el tema asignado)",
  "excerpt": "string (2-3 oraciones, 130-200 chars)",
  "body_html": "string (articulo en HTML, 400-700 palabras)",
  "analysis_text": "string (3-4 oraciones de resumen educativo)",
  "impact_text": "string (aplicacion practica para el lector, 2-3 oraciones)",
  "tags": "string[] (3-6 tags relevantes al tema)",
  "seo_title": "string (max 60 chars)",
  "seo_description": "string (max 160 chars)",
  "read_time_minutes": "number (4-8)"
}

ESTRUCTURA (body_html):
- <h2>Introduccion</h2>
- 2-3 secciones con <h2> desarrollando el tema
- <h2>Conclusion</h2>
- SI es lista: usa <ul><li>...</li></ul>
- SI es paso a paso: usa <ol><li>...</li></ol>`;
}

export async function generateArticle(openai, type, data) {
  let system = BASE_SYSTEM;
  let userPrompt;

  switch (type) {
    case 'weekly':
      if (!data) throw new Error('Se requieren datos para analisis semanal');
      system += '\n\nRecibiras datos historicos del tipo de cambio. Tu analisis debe basarse UNICAMENTE en ellos.';
      userPrompt = buildWeeklyPrompt(data);
      break;
    case 'midweek':
      if (!data) throw new Error('Se requieren datos para analisis de media semana');
      system += '\n\nRecibiras datos recientes del tipo de cambio. Tu analisis debe basarse en ellos.';
      userPrompt = buildMidweekPrompt(data);
      break;
    case 'educational':
      system += '\n\nEscribes contenido EDUCATIVO basado en conocimiento general de economia y finanzas. NO citas fuentes externas.';
      userPrompt = buildEducationalPrompt();
      break;
    default:
      throw new Error(`Tipo desconocido: ${type}`);
  }

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('OpenAI no devolvio contenido');

  const article = JSON.parse(content);

  if (!article.title || !article.body_html || !article.excerpt) {
    throw new Error('Respuesta incompleta: falta title/body_html/excerpt');
  }

  article._type = type;
  article._topic = type === 'educational' ? userPrompt.match(/TEMA ASIGNADO: "(.+)"/)?.[1] : null;

  return article;
}
