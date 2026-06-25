import 'dotenv/config';
import { getSupabase } from './supabase.js';
import { pickImage } from './publisher.js';

async function updateExistingImages() {
  const supabase = getSupabase();

  const { data: articles, error } = await supabase
    .from('news_articles')
    .select('id, slug, title, tags, featured_image')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Error al consultar articulos:', error.message);
    process.exit(1);
  }

  if (!articles?.length) {
    console.log('No se encontraron articulos con featured_image_query');
    return;
  }

  console.log(`Actualizando imagenes de ${articles.length} articulos...`);

  let updated = 0;
  let skipped = 0;
  const errors = [];

  for (const article of articles) {
    try {
      const query = Array.isArray(article.tags) && article.tags.length > 0
        ? article.tags.slice(0, 3).join(' ')
        : article.title || 'dolar peru';

      const newImage = await pickImage(query);

      if (newImage === article.featured_image) {
        skipped++;
        continue;
      }

      const { error: updateError } = await supabase
        .from('news_articles')
        .update({
          featured_image: newImage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', article.id);

      if (updateError) {
        errors.push({ slug: article.slug, error: updateError.message });
      } else {
        console.log(`  [OK] ${article.slug}: ${article.featured_image?.split('/').pop() || 'none'} -> ${newImage.split('/').pop()}`);
        updated++;
      }
    } catch (err) {
      errors.push({ slug: article.slug, error: err.message });
    }
  }

  console.log(`\nResumen: ${updated} actualizados, ${skipped} sin cambios, ${errors.length} errores`);

  if (errors.length > 0) {
    console.log('\nErrores:');
    for (const e of errors) {
      console.log(`  - ${e.slug}: ${e.error}`);
    }
  }
}

updateExistingImages();
