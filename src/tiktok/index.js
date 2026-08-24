import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getSupabase } from '../supabase.js';
import { getWeeklyExchangeData, getMidweekExchangeData } from '../exchange-data.js';
import { computeWeeklyValues, computeMiercolesData } from './weekly-values.js';
import { computeMartesData } from './days/martes.js';
import { renderLunes } from './days/lunes.js';
import { renderMartes } from './days/martes.js';
import { renderMiercoles } from './days/miercoles.js';
import { renderJueves } from './days/jueves.js';
import { renderSabado } from './days/sabado.js';
import { buildCaption } from './captions.js';
import {
  generateFactors, fallbackFactors,
  generateErrorExplicaciones, fallbackExplicaciones, SABADO_ERRORES,
} from './factors.js';
import { getValidAccessToken } from './tokens.js';
import { queryCreatorInfo, publishPhotoCarousel, pollPublishStatus } from './publish.js';
import { uploadSlides, uploadText } from './storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDryRun = process.argv.includes('--dry-run');
const FORCED = process.argv.find((a) => a.startsWith('--type='))?.split('=')[1];

function todayDayKey() {
  if (FORCED) return FORCED;
  const dow = new Date().toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Lima' });
  return { Mon: 'lunes', Tue: 'martes', Wed: 'miercoles', Thu: 'jueves', Sat: 'sabado' }[dow] || null;
}

async function fetchSunatWeek(supabase) {
  const since = new Date();
  since.setDate(since.getDate() - 10);
  const { data, error } = await supabase
    .from('sunat_exchange_rates')
    .select('date, sell_rate')
    .gte('date', since.toISOString().slice(0, 10))
    .order('date', { ascending: true });
  if (error) throw new Error(`Error consultando SUNAT: ${error.message}`);
  return (data || []).filter((r) => r.sell_rate != null).map((r) => ({ date: String(r.date), value: Number(r.sell_rate) }));
}

async function prepare(day, supabase, openai) {
  if (day === 'lunes') {
    const weekly = await getWeeklyExchangeData(supabase);
    if (!weekly) throw new Error('No hay datos semanales');
    const values = computeWeeklyValues(weekly);
    console.log(`[tiktok] Semana: S/ ${values.open.value.toFixed(3)} (${values.open.date}) → S/ ${values.close.value.toFixed(3)} (${values.close.date})`);
    let factors;
    try {
      factors = await generateFactors(openai, process.env.OPENAI_MODEL, values);
      console.log(`[tiktok] Factores (IA): ${factors.map((f) => f.title).join(' | ')}`);
    } catch (err) {
      console.warn(`[tiktok] IA factores no disponible (${err.message}). Usando banco determinista.`);
      factors = fallbackFactors(values.direction);
    }
    return { data: values, render: (out) => renderLunes(values, factors, out) };
  }
  if (day === 'martes') {
    const mid = await getMidweekExchangeData(supabase);
    if (!mid || !mid.houses?.length) throw new Error('No hay casas de cambio disponibles');
    const data = computeMartesData(mid.houses);
    return { data, render: (out) => renderMartes(data, out, new Date().toISOString().slice(0, 10)) };
  }
  if (day === 'miercoles') {
    const [mid, sunatDays] = await Promise.all([getMidweekExchangeData(supabase), fetchSunatWeek(supabase)]);
    if (!mid?.snapshots?.length) throw new Error('No hay snapshots recientes');
    const data = computeMiercolesData(sunatDays, mid.snapshots[0]);
    return { data, render: (out) => renderMiercoles(data, out) };
  }
  if (day === 'jueves') {
    return { data: {}, render: (out) => renderJueves(out) };
  }
  if (day === 'sabado') {
    let explicaciones;
    try {
      explicaciones = await generateErrorExplicaciones(openai, process.env.OPENAI_MODEL);
      console.log('[tiktok] Explicaciones (IA) generadas.');
    } catch (err) {
      console.warn(`[tiktok] IA explicaciones no disponible (${err.message}). Usando banco determinista.`);
      explicaciones = fallbackExplicaciones();
    }
    return { data: { errores: SABADO_ERRORES }, render: (out) => renderSabado(explicaciones, out) };
  }
  throw new Error(`Día no soportado: ${day}`);
}

async function main() {
  const day = todayDayKey();
  if (!day) {
    console.log('[tiktok] Hoy no es día de publicación TikTok (Lun-Mar-Mié-Jue-Sáb).');
    process.exit(0);
  }
  console.log(`[tiktok] === Carrusel TikTok — ${day} ===`);
  if (isDryRun) console.log('[tiktok] MODO DRY RUN — renderiza slides pero no publica');

  const supabase = getSupabase();
  const openai = new (await import('openai')).default({ apiKey: process.env.OPENAI_API_KEY });

  console.log('[tiktok] Preparando datos y contenido...');
  const { data, render } = await prepare(day, supabase, openai);
  const caption = buildCaption(day, data);

  const stamp = new Date().toISOString().slice(0, 10);
  const outDir = path.join(__dirname, '../../temp/tiktok-out', `${day}-${stamp}`);
  console.log(`[tiktok] Renderizando slides en ${outDir} ...`);
  const files = await render(outDir);
  console.log(`[tiktok] ${files.length} slides renderizados.`);

  const txt = [
    `🎬 CARRUSEL TIKTOK — ${day} ${stamp}`,
    '====================================',
    '',
    '📌 TITULO:',
    caption.title,
    '',
    '📝 DESCRIPCION (copiar y pegar):',
    caption.description,
    '',
    '💡 TIP: publica como carrusel de fotos (Photo Mode).',
    'TikTok puede poner música automáticamente, o elige una viral antes de publicar.',
  ].join('\n');
  fs.writeFileSync(path.join(outDir, 'publicacion.txt'), txt, 'utf8');

  if (isDryRun) {
    console.log('\n========== DRY RUN TIKTOK ==========');
    console.log(`Titulo: ${caption.title}`);
    console.log(`--- Descripcion ---\n${caption.description}`);
    console.log(`Slides: ${files.join(', ')}`);
    console.log('========== FIN ==========');
    return;
  }

  const bucket = process.env.TIKTOK_BUCKET || 'tiktok';
  console.log(`[tiktok] Subiendo slides a Supabase bucket "${bucket}"...`);
  const imageUrls = await uploadSlides(supabase, bucket, `${day}-${stamp}`, files);
  const txtUrl = await uploadText(supabase, bucket, `${day}-${stamp}/publicacion.txt`, txt);
  console.log(`[tiktok] 📄 Caption y slides: ${txtUrl.replace('/publicacion.txt', '/')}`);

  const tiktokEnabled = process.env.TIKTOK_ENABLED !== 'false';
  const hasCreds = tiktokEnabled && !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
  if (!hasCreds) {
    console.log('[tiktok] 📱 MODO MANUAL: todo listo para publicar a mano.');
    console.log(`[tiktok] Slides + publicacion.txt en Supabase (bucket "${bucket}/${day}-${stamp}") y localmente en ${outDir}`);
    return;
  }

  const { accessToken } = await getValidAccessToken(supabase);
  const creator = await queryCreatorInfo(accessToken);
  console.log(`[tiktok] Cuenta: @${creator.creator_username} | Privacidad: ${process.env.TIKTOK_PRIVACY_LEVEL || 'SELF_ONLY'}`);

  const postMode = process.env.TIKTOK_POST_MODE || 'DIRECT_POST';
  console.log(`[tiktok] Publicando carrusel (${postMode})...`);
  const init = await publishPhotoCarousel(accessToken, {
    imageUrls,
    title: caption.title,
    description: caption.description,
    privacyLevel: process.env.TIKTOK_PRIVACY_LEVEL || 'SELF_ONLY',
    postMode,
    autoAddMusic: process.env.TIKTOK_AUTO_MUSIC !== 'false',
  });
  console.log(`[tiktok] publish_id: ${init.publish_id}`);

  if (postMode === 'MEDIA_UPLOAD') {
    console.log('[tiktok] Borrador enviado: revisa la bandeja de TikTok en tu celular para elegir música y publicar.');
    return;
  }
  const final = await pollPublishStatus(accessToken, init.publish_id);
  console.log(`[tiktok] ✅ Carrusel publicado. Estado: ${final.status}`);
}

main().catch((err) => {
  console.error('[tiktok] Error fatal:', err.message);
  process.exit(1);
});
