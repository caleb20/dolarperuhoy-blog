import OpenAI from 'openai';

const MODEL = 'gpt-5.4-mini';
const DEFAULT_MAX_ATTEMPTS = Number.parseInt(process.env.OPENAI_MAX_ATTEMPTS || '3', 10);
const DEFAULT_RETRY_DELAY_MS = Number.parseInt(process.env.OPENAI_RETRY_DELAY_MS || '2000', 10);

const BASE_SYSTEM = `Eres un analista economico y redactor SEO especializado en el mercado cambiario peruano (USD/PEN).
Escribes contenido ORIGINAL para DolarPeruHoy.pe.

REGLAS ESTRICTAS DE SEO:
1. NO inventes fuentes externas, noticias, o citas de medios
2. NO copies contenido de otros sitios
3. Escribe en español peruano, tono profesional pero accesible
4. NO uses asteriscos ni markdown en body_html, solo HTML real
5. Al menos 400 palabras
6. Incluye una seccion de cierre o conclusion al final
7. CADA ARTICULO debe tener ESTRUCTURA UNICA: varia los H2, no repitas el mismo patron entre articulos

REGLAS PARA TITULOS Y SEO (ALTAMENTE OPTIMIZADAS PARA CTR):
- title: Max 65-70 chars. PATRONES QUE FUNCIONAN MEJOR EN CTR:
  1. Empieza con la CIFRA o DATO CLAVE: "Dolar Sube a S/3.42: Analisis Semanal"
  2. Usa NUMEROS: "CTS 2026: 5 Claves para Calcular tu Deposito"
  3. Formulas con beneficio: keyword + promesa + contexto
  4. Preguntas que la gente busca: "?Cuando Pagan la CTS 2026 en Peru?"
  EJEMPLOS: "Dolar HOY en Peru: Cotizacion a S/3.42 - Mejor Tipo de Cambio" | "CTS 2026: Cuanto Pagan, Fechas y Calculo del Deposito" | "Dolar Baja a S/3.40: Que Pasara esta Semana?"
- seo_title: Max 55-60 chars. MAS CORTO Y DIRECTO. Incluye keyword + dato numerico o diferencia. Ej: "CTS 2026: Monto, Fechas y Calculo" | "Dolar Hoy: Cotizacion a S/3.42 en Peru"
- seo_description: Max 150-155 chars. Usa este patron: [keyword] + [dato concreto] + [beneficio para el lector] + [llamada a accion suave]. Ej: "?Descubre cuando pagan la CTS 2026 en Peru, cuanto recibes segun tu sueldo y hasta cuando puedes retirarla. Calcula tu monto exacto aqui."
- EVITA ABSOLUTAMENTE titulos genericos. Cada titulo debe ser UNICO y responderse esta pregunta: "?Por que alguien haria clic en esto y no en otro resultado?"
- Los tags deben incluir la keyword principal y terminos relacionados que la gente busca

REGLAS PARA featured_image_query (IMAGEN DE PORTADA):
- Describe VISUALMENTE el tema del articulo en 2-5 palabras (espanol o ingles), ej: "ahorro monedas alcancia", "declaracion impuestos formulario", "deposito banco dinero", "persona planeando presupuesto"
- La imagen DEBE corresponder al tema: si el articulo habla de CTS, ahorro, impuestos o inversiones, NUNCA uses "dolar" ni "billetes de dolar" en el query
- Solo usa "dolar" en el query si el tema central del articulo es el tipo de cambio`;

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

TITULO: DEBE incluir el valor de cierre mas reciente y la direccion (subio/bajo). Ej: "Dolar Sube a S/3.42: Analisis Semanal del Tipo de Cambio en Peru" o "Dolar Cierra la Semana en S/3.40: Que Esperar la Proxima Semana"

JSON:
{
  "title": "string (max 70 chars, INCLUYE CIFRA CLAVE + DIRECCION)",
  "excerpt": "string (2-3 oraciones, 130-200 chars)",
  "body_html": "string (articulo completo en HTML, 400-800 palabras)",
  "analysis_text": "string (4-6 oraciones destacando lo mas importante)",
  "impact_text": "string (impacto en Peru, 3-4 oraciones)",
  "tags": "string[] (3-6 tags)",
  "seo_title": "string (max 60 chars, INCLUYE CIFRA + DIRECCION)",
  "seo_description": "string (max 155 chars, INCLUYE CIFRA + DIRECCION + BENEFICIO)",
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

TITULO: DEBE incluir el valor actual del dolar y la direccion de la semana. Ej: "Dolar en S/3.41: Pulso de Media Semana - Cotizacion Actual" o "Dolar Baja a S/3.40: Analisis a Mitad de Semana"

JSON:
{
  "title": "string (max 70 chars, INCLUYE CIFRA Y DIRECCION)",
  "excerpt": "string (2-3 oraciones, 130-200 chars)",
  "body_html": "string (articulo en HTML, 300-500 palabras)",
  "analysis_text": "string (3-4 oraciones)",
  "impact_text": "string (impacto en Peru, 2-3 oraciones)",
  "tags": "string[] (3-6 tags)",
  "seo_title": "string (max 60 chars, INCLUYE CIFRA)",
  "seo_description": "string (max 155 chars, INCLUYE CIFRA + DIRECCION + BENEFICIO)",
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

TITULO: Incluye la MEJOR TASA encontrada y la palabra "Comparativa". Ej: "Comparativa: Mejor Tasa de Cambio a S/3.40 — Gana mas por tus Dolares"

JSON:
{
  "title": "string (max 70 chars, INCLUYE MEJOR TASA DEL DIA)",
  "excerpt": "string (2-3 oraciones con la mejor opcion destacada, 130-200 chars)",
  "body_html": "string (articulo en HTML, 350-600 palabras)",
  "analysis_text": "string (3-4 oraciones destacando la mejor opcion y el ahorro potencial)",
  "impact_text": "string (ahorro potencial al elegir bien, 2-3 oraciones, ej: 'Puedes ahorrar hasta S/...')",
  "tags": "string[] (3-6 tags, ej: comparativa, tasas, casas de cambio)",
  "seo_title": "string (max 60 chars, INCLUYE MEJOR TASA)",
  "seo_description": "string (max 155 chars, INCLUYE MEJOR TASA + AHORRO POTENCIAL)",
  "read_time_minutes": "number (3-5)",
  "featured_image_query": "string (busqueda corta para imagen de portada)"
}`;
}

function buildGuiaPrompt() {
  const GUIAS = [
    "Como comprar dolares en Peru: guia paso a paso",
    "Como vender dolares en Peru obteniendo la mejor tasa",
    "Guia para enviar y recibir remesas desde el extranjero",
    "Estrategias para cambiar dolares antes de viajar al extranjero",
    "Como funcionan el dolar paralelo y el interbancario en Peru",
    "CTS 2026: guia paso a paso para calcular tu deposito",
    "Gratificacion: como calcular cuantos soles te depositan",
    "Como hacer un presupuesto mensual que funcione: guia practica",
    "Fondo de emergencia: cuanto ahorrar y donde guardarlo en Peru",
    "Guia para abrir un deposito a plazo fijo y ganar mas intereses",
    "Tarjeta de credito: como usarla sin pagar intereses",
    "Guia para elegir tu primer seguro de salud en Peru",
    "Como funciona el credito hipotecario y cuanto necesitas para la cuota",
    "Impuestos para trabajadores: que descuentos te aplican en planilla",
  ];
  const topic = GUIAS[Math.floor(Math.random() * GUIAS.length)];
  const GUIAS_STRUCTURES = [
    'Abre con el objetivo de la guia, lista los pasos o requisitos, desarrolla cada paso en detalle, y cierra con resumen y recomendacion',
    'Empieza con la pregunta principal, da opciones comparadas, muestra ejemplos practicos, termina con una recomendacion clara',
    'Organiza como tutorial: primero los preparativos, luego el proceso paso a paso, finalmente tips y errores a evitar',
  ];
  const selected = GUIAS_STRUCTURES[Math.floor(Math.random() * GUIAS_STRUCTURES.length)];

  return `Fecha actual: ${getDayContext()}

Escribe una GUIA PRACTICA sobre finanzas personales o el dolar en Peru.

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

TITULO: Usa formato "Guia [tema]: [beneficio numerico]". Ej: "Guia para Cambiar Dolares: Como Ahorrar hasta S/15 por cada $100"

JSON:
{
  "title": "string (max 70 chars, incluye 'Guia' o 'Pasos' y un beneficio concreto)",
  "excerpt": "string (2-3 oraciones con el beneficio principal, 130-200 chars)",
  "body_html": "string (articulo en HTML, 400-700 palabras)",
  "analysis_text": "string (3-4 oraciones resumiendo los puntos clave con datos practicos)",
  "impact_text": "string (ahorro o beneficio cuantificable para el lector, 2-3 oraciones)",
  "tags": "string[] (3-6 tags)",
  "seo_title": "string (max 60 chars, keyword + beneficio)",
  "seo_description": "string (max 155 chars, beneficio principal + cuantificacion + llamado a accion)",
  "read_time_minutes": "number (4-7)",
  "featured_image_query": "string (busqueda corta para imagen de portada)"
}`;
}

const EDUCATIONAL_TOPICS = [
  // --- Siempre verdes (indefinido) ---
  "Por que sube y baja el dolar: factores que afectan el tipo de cambio",
  "El rol del BCRP en el tipo de cambio peruano",
  "Remesas desde el extranjero: como obtener el mejor tipo de cambio",
  "Entendiendo la dolarizacion parcial de la economia peruana",
  "Que es el indice de tipo de cambio real y por que importa",
  "Criptomonedas vs dolar: cual es mejor refugio en Peru",
  "Entendiendo las reservas internacionales y su efecto en el dolar",
  "Prestamos en dolares vs soles: cual te conviene mas en 2026",
  "ETF en dolares: una opcion de inversion para peruanos",
  "Cuanto debes ganar para vivir bien en Peru en 2026",
  "Presupuesto familiar: como distribuir tus ingresos mensuales",
  "Ahorro e inversion: diferencias y cual empezar primero",
  "Tarjetas de credito en Peru: cuotas sin intereses vs pago total",
  "Fondo de emergencia: cuanto ahorrar y donde guardarlo en Peru",
  "Gastos hormiga: como identificarlos y ahorrar mas cada mes",
  "Alquilar o comprar departamento en Peru: analisis financiero",
  "Seguros de salud en Peru: EPS vs SIS vs seguros privados",
  "Comprar auto en Peru: credito vehicular vs pagar al contado",
  "Emprender en Peru: costos de formalizacion y primeros pasos",
  "Sunat: cuanto puedes ganar sin pagar impuestos",
  "MiVivienda 2026: requisitos, cuotas y como acceder al credito",
  "Cajas municipales: por que pagan mas interes que los bancos",
  "Historial crediticio: que es y como mejorarlo en Peru",
  "Cuanto cuesta vivir en provincia vs Lima en 2026",
  "Seguro de vida: cuanto cuesta y como elegirlo en Peru",
  "Educacion financiera para tu primer sueldo: que hacer primero",
  "Yape y Plin: limites, comisiones y seguridad en pagos",
  "Cuanto de tu sueldo puedes destinar a alquiler y gastos fijos",
  // --- Estacionales: Enero - Febrero ---
  "CTS 2026: calendario de pagos, fechas clave y como calcular el deposito",
  "Declaracion de Renta 2025 SUNAT: cronograma paso a paso",
  "Declaracion de Renta 2025: como declarar por primera vez ante SUNAT",
  "Vacaciones utiles 2026: cuanto cuestan y como financiarlas",
  "Impuestos a la renta Peru: todo lo que debes saber como trabajador",
  "Sunat 2026: nuevas obligaciones fiscales para personas naturales",
  // --- Estacionales: Marzo - Abril ---
  "CTS 2026: fecha de deposito mayo, calcular monto y hasta cuando retirar",
  "CTS 2026: conviene retirar todo o dejarlo en el banco",
  "Declaracion de Renta 2025 SUNAT: ultimos dias y como declarar correcto",
  "Inflacion en Peru 2026: como afecta tu economia diaria y ahorros",
  "Tipo de cambio Abril 2026: tendencias y perspectivas del dolar en Peru",
  "Casas de cambio en Lima vs online: cual opcion da mejor tasa",
  // --- Estacionales: Mayo - Junio ---
  "Gratificacion Julio 2026: fecha tope, calculo del monto y deposito",
  "Gratificacion 2026: cuanto te deposita tu empleador y como se calcula",
  "CTS mayo 2026: ya depositaron, cuanto retirar y que hacer con ese dinero",
  "CTS y Gratificacion: diferencias, montos y cuales son tus derechos",
  "Invertir tu gratificacion: opciones seguras y rentables en Peru",
  "Tipo de cambio Junio 2026: tendencia del dolar antes de Fiestas Patrias",
  "Prestamos en bancos peruanos: tasas de interes y cual elegir en 2026",
  "Cuanto cuesta vivir en Lima 2026: presupuesto mensual actualizado",
  // --- Estacionales: Julio - Agosto ---
  "Fiestas Patrias Peru 2026: cuanto gastaran los peruanos en julio",
  "Presupuesto para Fiestas Patrias: celebrar sin descuidar tus finanzas",
  "Tipo de cambio post Fiestas Patrias: tendencia del dolar en agosto",
  "Ahorro en soles vs dolares en Peru: que conviene mas en 2026",
  "Gratificacion recibida: donde invertir ese dinero extra",
  "Seguro de desempleo Peru 2026: como funciona y quienes pueden acceder",
  "Historial crediticio en Peru: como mejorarlo para obtener prestamos",
  "CTS noviembre 2026: lo que debes saber con 3 meses de anticipacion",
  // --- Estacionales: Setiembre - Octubre ---
  "CTS noviembre 2026: fecha exacta, calculo y guia completa",
  "CTS 2026: cuanto depositan en noviembre y hasta cuando retirar",
  "Gratificacion Diciembre 2026: fecha, calculo y cuanto te pagan",
  "ONP o AFP en 2026: cual te conviene mas segun tu sueldo y edad",
  "Tipo de cambio Octubre 2026: panorama del dolar en Peru",
  "Presupuesto para fin de ano: prepara tus finanzas para Navidad",
  // --- Estacionales: Noviembre - Diciembre ---
  "Gratificacion Diciembre 2026: fecha tope y cuanto te depositan",
  "Navidad 2026: cuanto gastaran los peruanos en regalos y cena",
  "Cierre de ano 2026: proteger tus ahorros de la volatilidad del dolar",
  "Propósitos financieros 2027: metas de ahorro e inversion",
  "Compra navidad: como no endeudarte en diciembre con tarjetas",
  "Cuentas de ahorro en Peru 2026: mejores tasas y donde abrirlas",
];

function getWeightedTopic() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12

  // Indices en EDUCATIONAL_TOPICS: siempre verde [0-27], luego grupos bimensuales
  const evergreen = { start: 0, end: 27 };
  const groups = [
    { months: [1, 2],  start: 28, end: 33 },  // Ene-Feb
    { months: [3, 4],  start: 34, end: 39 },  // Mar-Abr
    { months: [5, 6],  start: 40, end: 47 },  // May-Jun
    { months: [7, 8],  start: 48, end: 55 },  // Jul-Ago
    { months: [9, 10], start: 56, end: 61 },  // Sep-Oct
    { months: [11, 12],start: 62, end: 67 },  // Nov-Dic
  ];

  const current = groups.find((g) => g.months.includes(month));
  const seasonal = current
    ? EDUCATIONAL_TOPICS.slice(current.start, current.end + 1)
    : [];

  // 50% estacional, 50% siempre verde (evita saturar con el mismo tema)
  const pool = Math.random() < 0.5 && seasonal.length > 0
    ? seasonal
    : EDUCATIONAL_TOPICS.slice(evergreen.start, evergreen.end + 1);

  return pool[Math.floor(Math.random() * pool.length)];
}

function buildEducationalPrompt() {
  const topic = getWeightedTopic();
  const EDU_STRUCTURES = [
    'Abre con una pregunta o situacion cotidiana, luego explica los conceptos, da ejemplos practicos, y cierra con consejos aplicables',
    'Empieza definiendo el problema, luego desarrolla las alternativas o soluciones, y termina con recomendaciones',
    'Organizalo como guia paso a paso: primero los conceptos basicos, luego la aplicacion practica, y finalmente errores comunes a evitar',
  ];
  const selectedEdu = EDU_STRUCTURES[Math.floor(Math.random() * EDU_STRUCTURES.length)];

  const isSeasonal = /\b(CTS|Gratificacion|Fiestas Patrias|Declaracion|Navidad|vacaciones|mayo|julio|diciembre|2026|2025)\b/i.test(topic);

  return `Fecha actual: ${getDayContext()}

Escribe un ARTICULO EDUCATIVO sobre finanzas personales o el dolar en Peru.

TEMA: "${topic}"

INSTRUCCIONES:
- Contenido EDUCATIVO y ORIGINAL
- Tono didactico y accesible
- Ejemplos practicos con montos realistas
- No menciones "segun expertos" o "estudios recientes"
${isSeasonal ? `- IMPORTANTE: Usa fechas y datos concretos (ej: "la gratificacion se deposita en julio", "la CTS se paga en mayo y noviembre"). No inventes cifras oficiales exactas pero si da rangos realistas y contexto temporal util.` : `- NO uses fechas ni eventos concretos. Manten el contenido atemporal.`}

ESTRUCTURA (body_html):
${selectedEdu}

USA TUS PROPIOS H2 segun el flujo.

TITULO: Usa NUMEROS y BENEFICIOS. Ej: "CTS 2026: 5 Pasos para Calcular tu Deposito" o "?Donde Invertir S/1000 en Peru? 3 Opciones con Mayor Rentabilidad"

JSON:
{
  "title": "string (max 70 chars, USA NUMEROS O PREGUNTAS PARA ATRAPAR CLICS)",
  "excerpt": "string (2-3 oraciones que respondan directamente a la duda del usuario, 130-200 chars)",
  "body_html": "string (articulo en HTML, 400-700 palabras)",
  "analysis_text": "string (3-4 oraciones de resumen educativo con datos practicos)",
  "impact_text": "string (aplicacion practica y cuanto puede ahorrar/ganar el lector, 2-3 oraciones)",
  "tags": "string[] (3-6 tags, incluye la keyword principal)",
  "seo_title": "string (max 60 chars, incluye NUMERO o BENEFICIO)",
  "seo_description": "string (max 155 chars, responde la pregunta clave e incluye un beneficio numerico)",
  "read_time_minutes": "number (4-8)",
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
      article._topic = type === 'educational' ? userPrompt.match(/TEMA: "(.+)"/)?.[1] : null;

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
