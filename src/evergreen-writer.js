import 'dotenv/config';
import OpenAI from 'openai';

const SEARCH_MODEL = process.env.OPENAI_SEARCH_MODEL || process.env.OPENAI_MODEL || 'gpt-5.4-mini';

const prompts = {
  'que-es-tipo-cambio': `Eres un periodista economico peruano. Investiga en la web y escribe contenido educativo actualizado sobre "¿Qué es el tipo de cambio?" para DolarPeruHoy.pe.

Devuelve SOLO un JSON valido (sin markdown, sin explicaciones) con esta estructura:

{
  "sections": {
    "definicion": {
      "content": ["parrafo 1", "parrafo 2", "parrafo 3 - menciona que el tipo de cambio no es fijo y cambia por oferta y demanda"]
    },
    "tipos": {
      "content": [],
      "subsections": [
        { "title": "Tipo de cambio interbancario", "text": "explicacion..." },
        { "title": "Tipo de cambio SUNAT", "text": "explicacion..." },
        { "title": "Tipo de cambio compra", "text": "explicacion..." },
        { "title": "Tipo de cambio venta", "text": "explicacion..." },
        { "title": "Dólar Ocoña", "text": "explicacion..." }
      ]
    },
    "factores": {
      "content": ["parrafo introductorio sobre los factores"],
      "bullets": [
        "Decisiones del BCRP: ...",
        "Tasas de la FED: ...",
        "Precio del cobre: ...",
        "Inflacion: ...",
        "Estabilidad politica: ...",
        "Remesas: ...",
        "Comercio exterior: ..."
      ]
    },
    "importancia": {
      "content": ["parrafo introductorio"],
      "bullets": [
        "Precios de productos: ...",
        "Ahorros: ...",
        "Creditos: ...",
        "Viajes: ...",
        "Inversiones: ..."
      ]
    }
  },
  "faqItems": [
    { "q": "Pregunta?", "r": "Respuesta" },
    { "q": "Pregunta?", "r": "Respuesta" },
    { "q": "Pregunta?", "r": "Respuesta" },
    { "q": "Pregunta?", "r": "Respuesta" }
  ]
}

IMPORTANTE:
- Cada parrafo: 2-3 oraciones. Datos actualizados 2026.
- Enfoque exclusivo en Peru.
- Bullets: max 7 items, cada uno con explicacion breve.
- FAQs: minimo 4 preguntas reales que busca la gente en Google.`,

  'dolar-ocona': `Eres un periodista economico peruano. Investiga en la web y escribe contenido educativo actualizado sobre "¿Qué es el dólar Ocoña?" para DolarPeruHoy.pe.

Devuelve SOLO un JSON valido:

{
  "sections": {
    "que-es": {
      "content": ["parrafo 1: que es y donde queda la calle Ocoña", "parrafo 2: como funciona el mercado paralelo", "parrafo 3: por que se llama dolar Ocoña y su relevancia"]
    },
    "comparativa": {
      "content": ["parrafo introductorio"],
      "rows": [
        { "opcion": "Casas online (Kambista, Rextie)", "tipo": "Mejor spread (0.5-1.5%)", "seguridad": "Alta (SBS)", "rapidez": "15 min - 2 h" },
        { "opcion": "Dólar Ocoña (casas físicas)", "tipo": "Spread medio (1-3%)", "seguridad": "Media (verificar SBS)", "rapidez": "Inmediato (efectivo)" },
        { "opcion": "Bancos (BCP, BBVA, Interbank)", "tipo": "Spread alto (2-4%)", "seguridad": "Maxima", "rapidez": "Inmediato" },
        { "opcion": "Cambistas de calle", "tipo": "Spread variable", "seguridad": "Baja (no regulados)", "rapidez": "Inmediato" }
      ]
    },
    "ventajas": {
      "content": [],
      "bullets": {
        "pros": ["ventaja 1 con explicacion", "ventaja 2 con explicacion", "ventaja 3 con explicacion", "ventaja 4 con explicacion"],
        "cons": ["desventaja 1 con explicacion", "desventaja 2 con explicacion", "desventaja 3 con explicacion", "desventaja 4 con explicacion"]
      }
    },
    "consejos": {
      "content": [],
      "tips": ["consejo 1: explicacion", "consejo 2: explicacion", "consejo 3: explicacion", "consejo 4: explicacion", "consejo 5: explicacion", "consejo 6: explicacion"]
    }
  }
}

IMPORTANTE: Datos actualizados 2026. Cada bullet/tip debe ser informativo y util.`,

  'diferencia-compra-venta-dolares': `Eres un periodista economico peruano. Investiga y escribe sobre "Diferencia entre compra y venta de dólares (spread)" para DolarPeruHoy.pe.

Devuelve SOLO un JSON valido:

{
  "sections": {
    "que-es": {
      "content": ["parrafo 1: que es tipo de cambio compra", "parrafo 2: que es tipo de cambio venta", "parrafo 3: por que existen dos precios", "parrafo 4: que es el spread y como se gana"]
    },
    "ejemplo": {
      "content": ["parrafo introductorio al ejemplo"],
      "ejemplo": {
        "compra": "S/ X.XX",
        "venta": "S/ X.XX",
        "spread": "S/ X.XX (X.XX%)",
        "explicacion": ["linea 1 con calculo", "linea 2 con calculo", "linea 3: conclusion"]
      }
    },
    "por-que-existe": {
      "content": [],
      "bullets": ["razon 1 con explicacion", "razon 2 con explicacion", "razon 3 con explicacion", "razon 4 con explicacion"]
    },
    "como-ahorrar": {
      "content": [],
      "tips": [
        { "title": "Titulo consejo 1", "desc": "Descripcion detallada" },
        { "title": "Titulo consejo 2", "desc": "Descripcion detallada" },
        { "title": "Titulo consejo 3", "desc": "Descripcion detallada" },
        { "title": "Titulo consejo 4", "desc": "Descripcion detallada" },
        { "title": "Titulo consejo 5", "desc": "Descripcion detallada" }
      ]
    }
  }
}

IMPORTANTE: Datos actualizados 2026. Ejemplo con numeros realistas del mercado peruano.`,

  'dolar-sunat': `Eres un periodista economico peruano. Investiga y escribe sobre "¿Qué es el dólar SUNAT?" para DolarPeruHoy.pe.

Devuelve SOLO un JSON valido:

{
  "sections": {
    "que-es": {
      "content": ["parrafo 1: definicion de dolar SUNAT", "parrafo 2: quien lo publica y para que", "parrafo 3: diferencia con otros tipos de cambio"]
    },
    "como-se-calcula": {
      "content": ["parrafo explicando como se calcula", "parrafo sobre la publicacion diaria"],
      "bullets": ["paso 1: ...", "paso 2: ...", "paso 3: ...", "paso 4: ..."]
    },
    "para-que-sirve": {
      "content": [],
      "bullets": ["uso 1 con explicacion", "uso 2 con explicacion", "uso 3 con explicacion", "uso 4 con explicacion", "uso 5 con explicacion", "uso 6 con explicacion"]
    },
    "diferencias": {
      "content": ["parrafo introductorio"],
      "rows": [
        { "tipo": "Dólar SUNAT", "uso": "Tributario, aduanero, contable", "quien": "SUNAT", "frecuencia": "Diaria (publica)" },
        { "tipo": "Dólar interbancario", "uso": "Operaciones entre bancos", "quien": "BCRP / Mercado", "frecuencia": "Tiempo real" },
        { "tipo": "Dólar bancos", "uso": "Compra/venta al publico", "quien": "BCP, BBVA, Interbank, etc.", "frecuencia": "Tiempo real" },
        { "tipo": "Dólar Ocoña", "uso": "Mercado paralelo fisico", "quien": "Casas de cambio calle Ocona", "frecuencia": "Variable" },
        { "tipo": "Dólar online", "uso": "Compra/venta digital", "quien": "Kambista, Rextie, etc.", "frecuencia": "Tiempo real" }
      ]
    }
  }
}

IMPORTANTE: Datos actualizados 2026. Enfoque Peru.`,

  'dolar-interbancario': `Eres un periodista economico peruano. Investiga y escribe sobre "¿Qué es el dólar interbancario?" para DolarPeruHoy.pe.

Devuelve SOLO un JSON valido:

{
  "sections": {
    "que-es": {
      "content": ["parrafo 1: definicion de dolar interbancario", "parrafo 2: quienes participan y montos minimos", "parrafo 3: por que es la referencia del mercado"]
    },
    "como-funciona": {
      "content": ["parrafo introductorio"],
      "bullets": ["punto 1 con explicacion", "punto 2 con explicacion", "punto 3 con explicacion", "punto 4 con explicacion", "punto 5 con explicacion"]
    },
    "participantes": {
      "content": [],
      "cards": [
        { "nombre": "BCRP (Banco Central de Reserva del Peru)", "rol": "explicacion de su rol en el mercado interbancario" },
        { "nombre": "Bancos comerciales", "rol": "explicacion de su rol" },
        { "nombre": "Empresas de cambio de divisas autorizadas", "rol": "explicacion de su rol" }
      ]
    },
    "importancia": {
      "content": ["parrafo introductorio"],
      "bullets": ["razon 1 con explicacion", "razon 2 con explicacion", "razon 3 con explicacion", "razon 4 con explicacion", "razon 5 con explicacion"]
    }
  }
}

IMPORTANTE: Datos actualizados 2026. Enfoque Peru.`
};

async function generateContent(openai, slug) {
  console.error(`\n=== Generando: ${slug} ===`);
  
  const response = await openai.responses.create({
    model: SEARCH_MODEL,
    tools: [{ type: 'web_search' }],
    input: prompts[slug],
    temperature: 0.4,
    max_output_tokens: 4096,
  });

  const text = response.output_text || '';
  if (!text) throw new Error(`Respuesta vacia para ${slug}`);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('RAW:', text.slice(0, 300));
    throw new Error(`No se encontro JSON en ${slug}`);
  }

  const data = JSON.parse(jsonMatch[0]);
  console.error(`  OK (${text.length} chars)`);
  return { slug, data };
}

async function main() {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const slugs = process.argv[2] === 'all' 
    ? Object.keys(prompts) 
    : [process.argv[2]];

  if (!slugs[0] || !prompts[slugs[0]]) {
    console.error(`Usa: node evergreen-writer.js <slug|all>`);
    console.error(`Slugs: ${Object.keys(prompts).join(', ')}`);
    process.exit(1);
  }

  const results = [];
  for (const slug of slugs) {
    try {
      const result = await generateContent(openai, slug);
      results.push(result);
    } catch (err) {
      console.error(`Error ${slug}: ${err.message}`);
    }
  }

  // Output clean JSON to stdout
  console.log(JSON.stringify(results, null, 2));
  console.error(`\nCompletado: ${results.length}/${slugs.length} paginas`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
