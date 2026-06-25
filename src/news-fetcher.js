const MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini';

export async function fetchNewsContext(openai) {
  console.log(`[news-fetcher] Buscando noticias actuales con ${MODEL}...`);

  const response = await openai.responses.create({
    model: MODEL,
    tools: [{ type: 'web_search' }],
    input: `Busca y resume las noticias mas recientes (ultimos 7 dias) sobre el dolar en Peru y el tipo de cambio USD/PEN. Incluye tambien noticias sobre: economia peruana, decisiones del BCRP, eventos politicos relevantes (elecciones, cambios de gobierno), inflacion, y cualquier factor que este afectando al mercado cambiario peruano.

IMPORTANTE: Proporciona un resumen estructurado con:
- Fechas especificas de cada evento
- Datos y cifras concretas
- Fuentes de las noticias
- Contexto de como cada evento afecta al tipo de cambio

No inventes nada. Solo incluye informacion que hayas encontrado en la busqueda.`,
    temperature: 0.3,
    max_output_tokens: 2048,
  });

  const text = response.output_text || '';
  if (!text) {
    throw new Error('No se obtuvo contexto de noticias');
  }

  console.log(`[news-fetcher] Contexto obtenido (${text.length} chars)`);
  return text;
}
