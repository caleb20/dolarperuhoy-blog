import OpenAI from 'openai';

const MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const DEFAULT_MAX_ATTEMPTS = Number.parseInt(process.env.OPENAI_MAX_ATTEMPTS || '3', 10);
const DEFAULT_RETRY_DELAY_MS = Number.parseInt(process.env.OPENAI_RETRY_DELAY_MS || '2000', 10);

const BASE_SYSTEM = `Eres un analista economico especializado en el mercado cambiario peruano (USD/PEN).
Escribes contenido ORIGINAL para DolarPeruHoy.pe.

REGLAS ESTRICTAS:
1. NO inventes fuentes externas, noticias, o citas de medios
2. NO copies contenido de otros sitios
3. Escribe en español peruano, tono profesional pero accesible
4. NO uses asteriscos ni markdown en body_html, solo HTML real
5. Al menos 400 palabras
6. Incluye una seccion de cierre o conclusion al final
7. CADA ARTICULO debe tener ESTRUCTURA UNICA: varia los H2, no repitas el mismo patron entre articulos`;

function getDayContext() {
  return new Date().toLocaleDateString('es-PE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function buildWeeklyPrompt(data) {
  const STRUCTURE_STYLES = [
    'Empieza con el dato mas impactante de la semana, luego desarrolla el contexto, tendencia, comparativa entre casas de cambio, y cierra con perspectiva',
    'Organizalo por temas: primero la apertura y cierre semanal, luego el dia clave, las mejores tasas, y finalmente la proyeccion',
    'Estructura narrativa: situacion actual, factores que movieron el dolar, comparativa de casas, recomendacion practica',
  ];
  const selectedStyle = STRUCTURE_STYLES[Math.floor(Math.random() * STRUCTURE_STYLES.length)];

  return `Fecha actual: ${getDayContext()}

Escribe un ANALISIS SEMANAL del dolar en Peru.

DATOS DE LA SEMANA (${data.sunatWeek.length} dias utiles):
${JSON.stringify(data.sunatWeek, null, 2)}

${data.variationText ? `RESUMEN: ${data.variationText}` : ''}

SNAPSHOTS RECIENTES:
${JSON.stringify(data.snapshots.slice(0, 15), null, 2)}

CASAS DE CAMBIO (tasas actuales):
${JSON.stringify(data.houses.slice(0, 10), null, 2)}

ESTRUCTURA DEL ARTICULO (body_html):
${selectedStyle}

USA TUS PROPIOS H2 segun el flujo del articulo, no los impongas desde afuera.

JSON:
{
  "title": "string (max 70 chars)",
  "excerpt": "string (2-3 oraciones, 130-200 chars)",
  "body_html": "string (articulo completo en HTML, 400-800 palabras)",
  "analysis_text": "string (4-6 oraciones destacando lo mas importante)",
  "impact_text": "string (impacto en Peru, 3-4 oraciones)",
  "tags": "string[] (3-6 tags)",
  "seo_title": "string (max 60 chars)",
  "seo_description": "string (max 160 chars)",
  "read_time_minutes": "number (3-8)",
  "featured_image_query": "string (busqueda corta para imagen de portada)"
}

TODAS las cifras deben venir EXACTAMENTE de los datos.`;
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

  const MID_STRUCTURES = [
    'Comienza con la direccion del dolar en la semana, luego muestra las mejores tasas disponibles, y cierra con la perspectiva',
    'Abre con el cambio mas notable desde el lunes, analiza las casas de cambio destacadas, y termina con proyeccion',
  ];
  const selectedMid = MID_STRUCTURES[Math.floor(Math.random() * MID_STRUCTURES.length)];

  return `Fecha actual: ${getDayContext()}

Escribe un ANALISIS DE MEDIA SEMANA del dolar en Peru.

DATOS RECIENTES:
${variation}

SNAPSHOTS DE LOS ULTIMOS DIAS:
${JSON.stringify(snapshots.slice(0, 10), null, 2)}

CASAS DE CAMBIO (tasas actuales):
${JSON.stringify((data.houses || []).slice(0, 10), null, 2)}

ESTRUCTURA (body_html):
${selectedMid}

USA TUS PROPIOS H2. No repitas la misma estructura de otros articulos.

JSON:
{
  "title": "string (max 70 chars)",
  "excerpt": "string (2-3 oraciones, 130-200 chars)",
  "body_html": "string (articulo en HTML, 300-500 palabras)",
  "analysis_text": "string (3-4 oraciones)",
  "impact_text": "string (impacto en Peru, 2-3 oraciones)",
  "tags": "string[] (3-6 tags)",
  "seo_title": "string (max 60 chars)",
  "seo_description": "string (max 160 chars)",
  "read_time_minutes": "number (3-6)",
  "featured_image_query": "string (busqueda corta para imagen de portada)"
}`;
}

function buildComparativaPrompt(data) {
  const COMP_STRUCTURES = [
    'Empieza con un resumen de las mejores tasas del dia, compara las 5 casas mas destacadas, muestra tabla de diferenciales, y cierra con recomendacion',
    'Abre con el spread promedio del mercado, luego desglosa por tipo de casa (online vs fisica), compara las mejores opciones, y finaliza con consejo',
    'Organiza por categorias: primero las casas online, luego las fisicas, destaca las diferencias de spread, y termina con cual conviene segun el monto',
  ];
  const selected = COMP_STRUCTURES[Math.floor(Math.random() * COMP_STRUCTURES.length)];

  return `Fecha actual: ${getDayContext()}

Escribe una COMPARATIVA DE TASAS de cambio en Peru.

DATOS RECIENTES DEL MERCADO:
${JSON.stringify((data.snapshots || []).slice(0, 5), null, 2)}

CASAS DE CAMBIO (tasas actuales):
${JSON.stringify((data.houses || []).slice(0, 15), null, 2)}

ESTRUCTURA (body_html):
${selected}

USA TUS PROPIOS H2 segun el flujo.

JSON:
{
  "title": "string (max 70 chars, ej: 'Comparativa: Mejores Tasas de Cambio [fecha]')",
  "excerpt": "string (2-3 oraciones, 130-200 chars)",
  "body_html": "string (articulo en HTML, 350-600 palabras)",
  "analysis_text": "string (3-4 oraciones destacando la mejor opcion)",
  "impact_text": "string (ahorro potencial al elegir bien, 2-3 oraciones)",
  "tags": "string[] (3-6 tags, ej: comparativa, tasas, casas de cambio)",
  "seo_title": "string (max 60 chars)",
  "seo_description": "string (max 160 chars)",
  "read_time_minutes": "number (3-5)",
  "featured_image_query": "string (busqueda corta para imagen de portada)"
}`;
}

function buildGuiaPrompt() {
  const GUIAS = [
    "Como comprar dolares en Peru: guia paso a paso",
    "Como vender dolares en Peru obteniendo la mejor tasa",
    "Comparativa: casas de cambio online vs casas fisicas en Lima",
    "Guia para enviar y recibir remesas desde el extranjero",
    "Como afecta el riesgo pais al tipo de cambio peruano",
    "Que bancos ofrecen el mejor tipo de cambio en Peru",
    "Estrategias para cambiar dolares antes de viajar al extranjero",
    "Como funciona el mercado paralelo de dolares en Peru",
  ];
  const topic = GUIAS[Math.floor(Math.random() * GUIAS.length)];
  const GUIAS_STRUCTURES = [
    'Abre con el objetivo de la guia, lista los pasos o requisitos, desarrolla cada paso en detalle, y cierra con resumen y recomendacion',
    'Empieza con la pregunta principal, da opciones comparadas, muestra ejemplos practicos, termina con una recomendacion clara',
    'Organiza como tutorial: primero los preparativos, luego el proceso paso a paso, finalmente tips y errores a evitar',
  ];
  const selected = GUIAS_STRUCTURES[Math.floor(Math.random() * GUIAS_STRUCTURES.length)];

  return `Fecha actual: ${getDayContext()}

Escribe una GUIA PRACTICA sobre el dolar en Peru.

TEMA: "${topic}"

INSTRUCCIONES:
- Contenido 100% ORIGINAL y PRACTICO
- NO cites fuentes externas ni eventos de fechas concretas
- Tono directo y util
- Incluye ejemplos con montos realistas
- Enfasis en el ahorro y la mejor decision

ESTRUCTURA:
${selected}

USA TUS PROPIOS H2 segun el flujo del contenido.

JSON:
{
  "title": "string (max 70 chars)",
  "excerpt": "string (2-3 oraciones, 130-200 chars)",
  "body_html": "string (articulo en HTML, 400-700 palabras)",
  "analysis_text": "string (3-4 oraciones resumiendo los puntos clave)",
  "impact_text": "string (beneficio practico para el lector, 2-3 oraciones)",
  "tags": "string[] (3-6 tags)",
  "seo_title": "string (max 60 chars)",
  "seo_description": "string (max 160 chars)",
  "read_time_minutes": "number (4-7)",
  "featured_image_query": "string (busqueda corta para imagen de portada)"
}`;
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
  "Inflacion en Peru: como afecta el valor de tus ahorros en soles",
  "Que es el indice de tipo de cambio real y por que importa",
  "CTS 2026: cuanto puedes retirar y a que tipo de cambio conviene",
  "Como negociar una mejor tasa de cambio en una casa de cambio",
  "ETF en dolares: una opcion de inversion para peruanos",
  "El impacto de las elecciones en el tipo de cambio peruano",
  "Dolarizar tu portafolio: cuanto y cuando hacerlo",
  "Criptomonedas vs dolar: cual es mejor refugio en Peru",
  "Entendiendo las reservas internacionales y su efecto en el dolar",
  "Prestamos en dolares vs soles: cual te conviene mas en 2026",
];

function getRandomTopic() {
  return EDUCATIONAL_TOPICS[Math.floor(Math.random() * EDUCATIONAL_TOPICS.length)];
}

function buildEducationalPrompt() {
  const topic = getRandomTopic();
  const EDU_STRUCTURES = [
    'Abre con una pregunta o situacion cotidiana, luego explica los conceptos, da ejemplos practicos, y cierra con consejos aplicables',
    'Empieza definiendo el problema, luego desarrolla las alternativas o soluciones, y termina con recomendaciones',
    'Organizalo como guia paso a paso: primero los conceptos basicos, luego la aplicacion practica, y finalmente errores comunes a evitar',
  ];
  const selectedEdu = EDU_STRUCTURES[Math.floor(Math.random() * EDU_STRUCTURES.length)];

  return `Fecha actual: ${getDayContext()}

Escribe un ARTICULO EDUCATIVO sobre el dolar en Peru.

TEMA: "${topic}"

INSTRUCCIONES:
- Contenido EDUCATIVO y ORIGINAL
- NO cites fuentes externas ni eventos de fechas concretas
- Tono didactico y accesible
- Ejemplos practicos y consejos utiles
- No menciones "segun expertos" o "estudios recientes"

ESTRUCTURA (body_html):
${selectedEdu}

USA TUS PROPIOS H2 segun el flujo.

JSON:
{
  "title": "string (max 70 chars)",
  "excerpt": "string (2-3 oraciones, 130-200 chars)",
  "body_html": "string (articulo en HTML, 400-700 palabras)",
  "analysis_text": "string (3-4 oraciones de resumen educativo)",
  "impact_text": "string (aplicacion practica, 2-3 oraciones)",
  "tags": "string[] (3-6 tags)",
  "seo_title": "string (max 60 chars)",
  "seo_description": "string (max 160 chars)",
  "read_time_minutes": "number (4-8)",
  "featured_image_query": "string (busqueda corta para imagen de portada)"
}`;
}

function buildNewsPrompt(newsContext, data) {
  const NEWS_STRUCTURES = [
    'Empieza con el evento mas relevante de la semana, explica su impacto en el tipo de cambio, relaciona con la situacion economica actual, y cierra con perspectiva para las proximas semanas',
    'Abre con el contexto politico/economico reciente, analiza como afecta al dolar, compara con semanas anteriores, y termina con recomendaciones practicas',
    'Organiza por temas: primero las noticias politicas, luego las economicas, su impacto en el tipo de cambio, y finalmente que esperar en el corto plazo',
  ];
  const selected = NEWS_STRUCTURES[Math.floor(Math.random() * NEWS_STRUCTURES.length)];

  return `Fecha actual: ${getDayContext()}

Escribe un ARTICULO DE ACTUALIDAD sobre el dolar en Peru basado en NOTICIAS RECIENTES.

CONTEXTO DE NOTICIAS ACTUALES (basado en busqueda web):
${newsContext}

${data?.snapshots ? `DATOS DEL TIPO DE CAMBIO RECIENTES:
${JSON.stringify(data.snapshots.slice(0, 5), null, 2)}` : ''}

${data?.houses ? `CASAS DE CAMBIO (tasas actuales):
${JSON.stringify(data.houses.slice(0, 5), null, 2)}` : ''}

INSTRUCCIONES:
- Basate en las noticias reales proporcionadas arriba
- No inventes eventos ni fechas
- Relaciona las noticias con el tipo de cambio USD/PEN
- Incluye datos concretos de las noticias (fechas, cifras)
- Tono analitico pero accesible
- Enfasis en como afecta al lector peruano

ESTRUCTURA (body_html):
${selected}

USA TUS PROPIOS H2 segun el flujo del contenido.

JSON:
{
  "title": "string (max 70 chars, ej: 'Impacto de [evento] en el dolar: analisis [fecha]')",
  "excerpt": "string (2-3 oraciones, 130-200 chars)",
  "body_html": "string (articulo en HTML, 400-700 palabras)",
  "analysis_text": "string (3-4 oraciones destacando los puntos clave)",
  "impact_text": "string (impacto para el lector peruano, 2-3 oraciones)",
  "tags": "string[] (3-6 tags, incluir al menos 2 relacionados a las noticias)",
  "seo_title": "string (max 60 chars)",
  "seo_description": "string (max 160 chars)",
  "read_time_minutes": "number (3-6)",
  "featured_image_query": "string (busqueda corta para imagen de portada)"
}`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function shouldRetryOpenAIError(error) {
  const status = error?.status ?? error?.response?.status;
  if (status === 408 || status === 409 || status === 429 || status >= 500) {
    return true;
  }

  const message = error?.message?.toLowerCase() || '';
  return [
    'premature close',
    'fetch failed',
    'network',
    'socket hang up',
    'timeout',
    'timed out',
    'econnreset',
    'connection',
  ].some((token) => message.includes(token));
}

export async function generateArticle(openai, type, data, options = {}) {
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
    case 'comparativa':
      if (!data) throw new Error('Se requieren datos para comparativa');
      system += '\n\nRecibiras datos actuales del mercado. Tu comparativa debe basarse UNICAMENTE en ellos.';
      userPrompt = buildComparativaPrompt(data);
      break;
    case 'guia':
      system += '\n\nEscribes una GUIA PRACTICA basada en conocimiento general. NO citas fuentes externas.';
      userPrompt = buildGuiaPrompt();
      break;
    case 'educational':
      system += '\n\nEscribes contenido EDUCATIVO basado en conocimiento general de economia y finanzas. NO citas fuentes externas.';
      userPrompt = buildEducationalPrompt();
      break;
    case 'news':
      if (!options.newsContext) throw new Error('Se requiere contexto de noticias');
      system += '\n\nRecibiste noticias reales de eventos recientes. Tu analisis debe basarse ESTRICTAMENTE en ellas. No inventes nada. Cita los eventos con sus fechas reales.';
      userPrompt = buildNewsPrompt(options.newsContext, data);
      break;
    default:
      throw new Error(`Tipo desconocido: ${type}`);
  }

  const maxAttempts = Math.max(1, Number.parseInt(String(options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS), 10) || 1);
  const retryDelayMs = Math.max(0, Number.parseInt(String(options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS), 10) || 0);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.9,
        max_completion_tokens: 4096,
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
    } catch (error) {
      const canRetry = shouldRetryOpenAIError(error);
      if (!canRetry || attempt === maxAttempts) {
        throw error;
      }

      const delayMs = retryDelayMs * attempt;
      console.warn(
        `[ai-writer] Error temporal al generar articulo (intento ${attempt}/${maxAttempts}): ${error.message}. Reintentando en ${delayMs}ms...`,
      );
      await wait(delayMs);
    }
  }
}
