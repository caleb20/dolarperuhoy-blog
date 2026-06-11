const FEATURED_IMAGES = [
  { url: 'https://images.pexels.com/photos/4386476/pexels-photo-4386476.jpeg', keywords: ['dolar', 'billete', 'rollo', 'banknotes', 'currency'] },
  { url: 'https://images.pexels.com/photos/3483098/pexels-photo-3483098.jpeg', keywords: ['dolar', 'cien', 'billetes', 'pila', 'dinero'] },
  { url: 'https://images.pexels.com/photos/928188/pexels-photo-928188.jpeg', keywords: ['dolar', 'persona', 'sosteniendo', 'billete', 'mano'] },
  { url: 'https://images.pexels.com/photos/4386473/pexels-photo-4386473.jpeg', keywords: ['dinero', 'monton', 'billetes', 'efectivo', 'cash'] },
  { url: 'https://images.pexels.com/photos/5980800/pexels-photo-5980800.jpeg', keywords: ['dolar', 'laptop', 'tecnologia', 'finanzas', 'negocios'] },
  { url: 'https://images.pexels.com/photos/5980879/pexels-photo-5980879.jpeg', keywords: ['carrito', 'compras', 'monedas', 'billetes', 'comercio'] },
  { url: 'https://images.pexels.com/photos/4386154/pexels-photo-4386154.jpeg', keywords: ['billetera', 'wallet', 'dolar', 'cuero', 'dinero'] },
  { url: 'https://images.pexels.com/photos/7111480/pexels-photo-7111480.jpeg', keywords: ['dolar', 'billetes', 'closeup', 'fraude', 'finanzas'] },
  { url: 'https://images.pexels.com/photos/5980864/pexels-photo-5980864.jpeg', keywords: ['bitcoin', 'criptomoneda', 'dolar', 'inversion', 'crypto'] },
  { url: 'https://images.pexels.com/photos/7680637/pexels-photo-7680637.jpeg', keywords: ['mujer', 'feliz', 'dinero', 'ahorro', 'finanzas personales'] },
  { url: 'https://images.pexels.com/photos/730547/pexels-photo-730547.jpeg', keywords: ['bitcoin', 'dolar', 'billetes', 'criptomoneda', 'moneda digital'] },
  { url: 'https://images.pexels.com/photos/4061022/pexels-photo-4061022.jpeg', keywords: ['euro', 'billetes', 'europa', 'divisa', 'currency'] },
  { url: 'https://images.pexels.com/photos/7567550/pexels-photo-7567550.jpeg', keywords: ['dolar', 'tablet', 'grafico', 'analisis', 'inversion'] },
  { url: 'https://images.pexels.com/photos/7076318/pexels-photo-7076318.jpeg', keywords: ['dolar', 'billete', 'macro', 'pirámide', 'ojo'] },
  { url: 'https://images.pexels.com/photos/7735777/pexels-photo-7735777.jpeg', keywords: ['pareja', 'finanzas', 'presupuesto', 'dinero', 'hogar'] },
  { url: 'https://images.pexels.com/photos/8369770/pexels-photo-8369770.jpeg', keywords: ['criptomoneda', 'monedas', 'oro', 'inversion', 'crypto'] },
  { url: 'https://images.pexels.com/photos/4386328/pexels-photo-4386328.jpeg', keywords: ['calculadora', 'calcular', 'finanzas', 'numeros', 'presupuesto'] },
  { url: 'https://images.pexels.com/photos/4386431/pexels-photo-4386431.jpeg', keywords: ['contar', 'dinero', 'billetes', 'manos', 'efectivo'] },
  { url: 'https://images.pexels.com/photos/210600/pexels-photo-210600.jpeg', keywords: ['monedas', 'euro', 'economia', 'ahorro', 'inversion'] },
  { url: 'https://images.pexels.com/photos/3943719/pexels-photo-3943719.jpeg', keywords: ['monedas', 'variadas', 'divisa', 'coleccion', 'finanzas'] },
  { url: 'https://images.pexels.com/photos/5632397/pexels-photo-5632397.jpeg', keywords: ['carrito', 'compras', 'laptop', 'ecommerce', 'online'] },
  { url: 'https://images.pexels.com/photos/3861957/pexels-photo-3861957.jpeg', keywords: ['grafico', 'laptop', 'analisis', 'datos', 'negocios'] },
  { url: 'https://images.pexels.com/photos/4386366/pexels-photo-4386366.jpeg', keywords: ['calculadora', 'dolar', 'notas', 'presupuesto', 'planificacion'] },
  { url: 'https://images.pexels.com/photos/259200/pexels-photo-259200.jpeg', keywords: ['tarjeta', 'credito', 'visa', 'mastercard', 'pago'] },
  { url: 'https://images.pexels.com/photos/164501/pexels-photo-164501.jpeg', keywords: ['tarjetas', 'credito', 'plastic', 'oro', 'financiero'] },
  { url: 'https://images.pexels.com/photos/730553/pexels-photo-730553.jpeg', keywords: ['bitcoin', 'crypto', 'intercambio', 'divisa', 'digital'] },
  { url: 'https://images.pexels.com/photos/4968631/pexels-photo-4968631.jpeg', keywords: ['contar', 'dinero', 'calculadora', 'gastos', 'ahorro'] },
  { url: 'https://images.pexels.com/photos/6694576/pexels-photo-6694576.jpeg', keywords: ['apreton', 'manos', 'acuerdo', 'negocio', 'transaccion'] },
  { url: 'https://images.pexels.com/photos/6694560/pexels-photo-6694560.jpeg', keywords: ['datos', 'analisis', 'reporte', 'negocios', 'finanzas'] },
  { url: 'https://images.pexels.com/photos/4386465/pexels-photo-4386465.jpeg', keywords: ['dolar', 'billetes', 'marmol', 'riqueza', 'divisa'] },
];

export async function pickImage(query) {
  if (!query) return FEATURED_IMAGES[0].url;

  const apiKey = process.env.PEXELS_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape`,
        { headers: { Authorization: apiKey } },
      );
      if (res.ok) {
        const data = await res.json();
        if (data.photos?.length > 0) {
          const randomIndex = Math.floor(Math.random() * data.photos.length);
          return data.photos[randomIndex].src.large;
        }
      }
    } catch {
      // fallback
    }
  }

  const q = query.toLowerCase();
  let bestScore = 0;
  const candidates = [];

  for (const img of FEATURED_IMAGES) {
    let score = 0;
    for (const kw of img.keywords) {
      if (q.includes(kw)) score += 2;
      if (kw.includes(q) || q.includes(kw.slice(0, 5))) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      candidates.length = 0;
      candidates.push(img.url);
    } else if (score > 0 && score === bestScore) {
      candidates.push(img.url);
    }
  }

  return candidates.length > 0
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : FEATURED_IMAGES[Math.floor(Math.random() * FEATURED_IMAGES.length)];
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
    case 'comparativa':
      return `comparativa-tasas-cambio-${dateStr}`;
    case 'guia': {
      const base = slugify(article.title).replace(/-+$/, '');
      return `guia-practica-${base}`;
    }
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
    case 'comparativa': return 'comparativas';
    case 'guia': return 'guias';
    case 'educational': return 'educacion';
    default: return 'analisis';
  }
}

function getAuthorForType(type) {
  switch (type) {
    case 'weekly': return 'Equipo de Analisis DolarPeruHoy';
    case 'midweek': return 'Equipo de Monitoreo DolarPeruHoy';
    case 'comparativa': return 'Equipo de Analisis DolarPeruHoy';
    case 'guia': return 'Equipo Editorial DolarPeruHoy';
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
