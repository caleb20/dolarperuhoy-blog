const FEATURED_IMAGES = [
  { url: 'https://images.pexels.com/photos/5849579/pexels-photo-5849579.jpeg', keywords: ['dolar', 'dollar', 'billete', 'money', 'divisa', 'tipo de cambio'] },
  { url: 'https://images.pexels.com/photos/730551/pexels-photo-730551.jpeg', keywords: ['dolar', 'dollar', 'usd', 'billete', 'currency'] },
  { url: 'https://images.pexels.com/photos/4386371/pexels-photo-4386371.jpeg', keywords: ['cambio', 'exchange', 'casa de cambio', 'divisas', 'currency exchange'] },
  { url: 'https://images.pexels.com/photos/210607/pexels-photo-210607.jpeg', keywords: ['mercado', 'market', 'finanzas', 'finance', 'economia', 'economy'] },
  { url: 'https://images.pexels.com/photos/669453/pexels-photo-669453.jpeg', keywords: ['ahorro', 'savings', 'finanzas personales', 'personal finance', 'inversion'] },
  { url: 'https://images.pexels.com/photos/534216/pexels-photo-534216.jpeg', keywords: ['dolar', 'euro', 'billetes', 'banknotes', 'moneda', 'currency'] },
  { url: 'https://images.pexels.com/photos/164527/pexels-photo-164527.jpeg', keywords: ['calculadora', 'calculator', 'numeros', 'numbers', 'cuentas', 'finanzas'] },
  { url: 'https://images.pexels.com/photos/259209/pexels-photo-259209.jpeg', keywords: ['inversion', 'investment', 'crecimiento', 'growth', 'grafico', 'chart'] },
  { url: 'https://images.pexels.com/photos/2988232/pexels-photo-2988232.jpeg', keywords: ['banco', 'bank', 'edificio', 'building', 'financiero', 'financial'] },
  { url: 'https://images.pexels.com/photos/6863204/pexels-photo-6863204.jpeg', keywords: ['transferencia', 'transfer', 'remesa', 'remittance', 'envio', 'money transfer'] },
  { url: 'https://images.pexels.com/photos/7567443/pexels-photo-7567443.jpeg', keywords: ['peru', 'lima', 'viajes', 'travel', 'turismo', 'sudamerica'] },
  { url: 'https://images.pexels.com/photos/3943717/pexels-photo-3943717.jpeg', keywords: ['ahorro', 'alcancia', 'piggy bank', 'finanzas personales', 'educacion financiera'] },
  { url: 'https://images.pexels.com/photos/6802048/pexels-photo-6802048.jpeg', keywords: ['inflacion', 'inflation', 'economia', 'precios', 'prices'] },
  { url: 'https://images.pexels.com/photos/6863515/pexels-photo-6863515.jpeg', keywords: ['comercio', 'trade', 'exportacion', 'export', 'importacion', 'import'] },
  { url: 'https://images.pexels.com/photos/7412073/pexels-photo-7412073.jpeg', keywords: ['presupuesto', 'budget', 'planificacion', 'planning', 'finanzas'] },
];

async function pickImage(query) {
  if (!query) return FEATURED_IMAGES[0].url;

  const apiKey = process.env.PEXELS_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
        { headers: { Authorization: apiKey } },
      );
      if (res.ok) {
        const data = await res.json();
        if (data.photos?.length > 0) {
          return data.photos[0].src.large;
        }
      }
    } catch {
      // fallback
    }
  }

  const q = query.toLowerCase();
  let bestScore = 0;
  let bestImage = FEATURED_IMAGES[0].url;

  for (const img of FEATURED_IMAGES) {
    let score = 0;
    for (const kw of img.keywords) {
      if (q.includes(kw)) score += 2;
      if (kw.includes(q) || q.includes(kw.slice(0, 5))) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestImage = img.url;
    }
  }

  return bestImage;
}

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
      const base = slugify(article.title).replace(/-+$/, '');
      return `educacion-financiera-${base}`;
    }
    default:
      return `articulo-${dateStr}-${slugify(article.title).replace(/-+$/, '').replace(/-+$/, '')}`;
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

  const featured_image = await pickImage(article.featured_image_query);

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
