import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabase } from './supabase.js';
import { getWeeklyExchangeData, getMidweekExchangeData } from './exchange-data.js';
import { generateArticle } from './ai-writer.js';
import { publishArticle } from './publisher.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOPICS_FILE = path.join(__dirname, '..', 'data', 'recent-topics.json');
const TOPIC_MEMORY_DAYS = 65; // cubre la ventana estacional bimensual + margen

function loadRecentTopicsEntries() {
  try {
    const raw = fs.readFileSync(TOPICS_FILE, 'utf-8');
    const entries = JSON.parse(raw);
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}

function pruneOldEntries(entries) {
  const cutoff = Date.now() - TOPIC_MEMORY_DAYS * 24 * 60 * 60 * 1000;
  return entries.filter((e) => new Date(e.date).getTime() >= cutoff);
}

function getRecentTopics() {
  return pruneOldEntries(loadRecentTopicsEntries()).map((e) => e.topic);
}

function recordTopic(topic) {
  if (!topic) return;
  const entries = pruneOldEntries(loadRecentTopicsEntries());
  entries.push({ topic, date: new Date().toISOString() });
  fs.mkdirSync(path.dirname(TOPICS_FILE), { recursive: true });
  fs.writeFileSync(TOPICS_FILE, JSON.stringify(entries, null, 2));
}

const isDryRun = process.argv.includes('--dry-run');
const FORCED_TYPE = process.env.FORCE_TYPE || process.argv.find((a) => a.startsWith('--type='))?.split('=')[1];

function getArticleType() {
  if (FORCED_TYPE) return FORCED_TYPE;
  const day = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/Lima' });
  switch (day) {
    case 'Monday': return 'weekly';
    case 'Tuesday': return 'comparativa';
    case 'Wednesday': return 'midweek';
    case 'Thursday': return 'educational';
    case 'Friday': return 'guia';
    case 'Saturday': return 'educational';
    default: return null;
  }
}

const TYPE_LABELS = {
  weekly: 'Analisis Semanal',
  midweek: 'Pulso de Media Semana',
  comparativa: 'Comparativa de Tasas',
  educational: 'Guia Financiera',
  guia: 'Guia Practica',
};

const TOPIC_TRACKED_TYPES = new Set(['educational', 'guia']);

async function main() {
  const articleType = getArticleType();

  if (!articleType) {
    console.log(`[blog] Hoy no es dia de publicacion (Lun-Mar-Mie-Jue-Sab).`);
    process.exit(0);
  }

  console.log(`[blog] Tipo: ${TYPE_LABELS[articleType]} (${articleType})`);
  if (isDryRun) console.log(`[blog] MODO DRY RUN — No se publicara nada`);

  const supabase = getSupabase();

  let exchangeData = null;
  if (articleType === 'weekly') {
    exchangeData = await getWeeklyExchangeData(supabase);
    if (!exchangeData) {
      console.error('[blog] No hay datos para analisis semanal. Abortando.');
      process.exit(1);
    }
    console.log(`[blog] Datos: ${exchangeData.sunat.length} SUNAT, ${exchangeData.snapshots.length} snapshots, ${exchangeData.houses.length} casas`);
    console.log(`[blog] Variacion: ${exchangeData.variationText || 'N/A'}`);
  } else if (articleType === 'midweek' || articleType === 'comparativa') {
    exchangeData = await getMidweekExchangeData(supabase);
    if (!exchangeData) {
      console.error(`[blog] No hay datos para ${articleType}. Abortando.`);
      process.exit(1);
    }
    console.log(`[blog] Datos: ${exchangeData.snapshots.length} snapshots recientes, ${exchangeData.houses.length} casas`);
  }

  const openai = new (await import('openai')).default({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const recentTopics = TOPIC_TRACKED_TYPES.has(articleType) ? getRecentTopics() : [];
  if (TOPIC_TRACKED_TYPES.has(articleType)) {
    console.log(`[blog] Temas evitados (publicados en los ultimos ${TOPIC_MEMORY_DAYS} dias): ${recentTopics.length}`);
  }

  console.log(`[blog] Generando articulo con IA...`);
  const article = await generateArticle(openai, articleType, exchangeData, { recentTopics });

  console.log(`[blog] Titulo: ${article.title}`);
  console.log(`[blog] Tags: ${(article.tags || []).join(', ')}`);
  console.log(`[blog] Imagen: ${article.featured_image_query || 'default'}`);
  if (article._topic) console.log(`[blog] Tema: ${article._topic}`);

  if (isDryRun) {
    console.log(`\n========== DRY RUN ==========`);
    console.log(`Tipo: ${articleType}`);
    console.log(`Titulo: ${article.title}`);
    console.log(`Imagen query: ${article.featured_image_query || '(default)'}`);
    console.log(`SEO: ${article.seo_title}`);
    console.log(`Desc: ${article.seo_description}`);
    console.log(`Tags: ${(article.tags || []).join(', ')}`);
    console.log(`Read: ${article.read_time_minutes} min`);
    console.log(`\n--- analysis_text ---`);
    console.log(article.analysis_text || '(vacio)');
    console.log(`\n--- impact_text ---`);
    console.log(article.impact_text || '(vacio)');
    console.log(`\n--- body_html (primeros 500 chars) ---`);
    console.log((article.body_html || '').slice(0, 500));
    console.log(`\n========== FIN ==========`);
    process.exit(0);
  }

  const result = await publishArticle(supabase, article, articleType, exchangeData);

  if (result.existing) {
    console.log(`[blog] El articulo ya existia (${result.slug}). Todo ok.`);
  } else {
    console.log(`[blog] Publicado: /blog/${result.slug}`);
    if (TOPIC_TRACKED_TYPES.has(articleType) && article._topic) {
      recordTopic(article._topic);
      console.log(`[blog] Tema registrado para evitar repetirlo pronto.`);
    }
  }

  console.log(`[blog] Proceso completado.`);
}

main().catch((err) => {
  console.error('[blog] Error fatal:', err.message);
  process.exit(1);
});
