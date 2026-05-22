import { createHash } from 'node:crypto';

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[áäàâ]/g, 'a').replace(/[éëèê]/g, 'e').replace(/[íïìî]/g, 'i')
    .replace(/[óöòô]/g, 'o').replace(/[úüùû]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateSlug(article, type) {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  switch (type) {
    case 'weekly': {
      const mon = new Date(today);
      mon.setDate(mon.getDate() - mon.getDay() + 1);
      const fri = new Date(mon);
      fri.setDate(fri.getDate() + 4);
      const fmt = (d) => d.toISOString().split('T')[0];
      return `analisis-semanal-${fmt(mon)}-a-${fmt(fri)}`;
    }
    case 'midweek':
      return `pulso-dolar-media-semana-${dateStr}`;
    case 'educational': {
      const hash = createHash('md5').update(article.title).digest('hex').slice(0, 8);
      return `educacion-financiera-${slugify(article.title).slice(0, 50)}-${hash}`;
    }
    default:
      return `articulo-${dateStr}-${slugify(article.title).slice(0, 30)}`;
  }
}

export async function getExistingArticle(supabase, slug) {
  const { data } = await supabase
    .from('news_articles')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  return data;
}

export async function getCategoryBySlug(supabase, slug) {
  const { data } = await supabase
    .from('news_categories')
    .select('id, name')
    .eq('slug', slug)
    .maybeSingle();
  return data;
}

function getCategoryForType(type) {
  switch (type) {
    case 'weekly': return 'analisis';
    case 'midweek': return 'analisis';
    case 'educational': return 'educacion';
    default: return 'analisis';
  }
}

function getAuthorForType(type) {
  switch (type) {
    case 'weekly': return 'Equipo de Analisis DolarPeruHoy';
    case 'midweek': return 'Equipo de Monitoreo DolarPeruHoy';
    case 'educational': return 'Equipo Editorial DolarPeruHoy';
    default: return 'DolarPeruHoy';
  }
}

export async function publishArticle(supabase, article, type, exchangeData) {
  const categorySlug = getCategoryForType(type);
  let category = await getCategoryBySlug(supabase, categorySlug);

  if (!category) {
    const { data: fallback } = await supabase
      .from('news_categories')
      .select('id, name')
      .limit(1)
      .single();
    category = fallback;
  }

  if (!category) {
    throw new Error('No se encontraron categorias en la base de datos');
  }

  const slug = generateSlug(article, type);

  const existing = await getExistingArticle(supabase, slug);
  if (existing) {
    console.log(`[publisher] Ya existe: ${slug}`);
    return { slug, existing: true };
  }

  const featured_image = exchangeData?.currentRate
    ? `https://placehold.co/1200x675/1e293b/ffffff?text=Dolar+${Number(exchangeData.currentRate.sell_rate || 0).toFixed(3) || ''}`
    : 'https://placehold.co/1200x675/1e293b/ffffff?text=DolarPeruHoy';

  const now = new Date().toISOString();

  const record = {
    slug,
    title: article.title,
    excerpt: article.excerpt,
    body_html: article.body_html,
    category_id: category.id,
    read_time_minutes: article.read_time_minutes || 5,
    featured: false,
    author_name: getAuthorForType(type),
    seo_title: article.seo_title || article.title,
    seo_description: article.seo_description || article.excerpt,
    tags: article.tags || [],
    featured_image,
    analysis_text: article.analysis_text || null,
    impact_text: article.impact_text || null,
    is_published: true,
    source_type: 'original',
    published_at: now,
    updated_at: now,
    created_at: now,
  };

  const { error } = await supabase.from('news_articles').insert(record);

  if (error) {
    throw new Error(`Error al publicar: ${error.message}`);
  }

  console.log(`[publisher] Publicado: /blog/${slug} (${type})`);
  return { slug, existing: false };
}
