export async function ensurePublicBucket(supabase, bucket) {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = (buckets || []).some((b) => b.name === bucket);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(bucket, { public: true });
    if (error && !/already exists|Duplicate/i.test(error.message)) {
      throw new Error(`No se pudo crear el bucket ${bucket}: ${error.message}`);
    }
    console.log(`[tiktok] Bucket público "${bucket}" creado.`);
  }
}

export async function uploadSlides(supabase, bucket, remoteDir, files) {
  await ensurePublicBucket(supabase, bucket);
  const urls = [];
  for (const filePath of files) {
    const name = filePath.split(/[\\/]/).pop();
    const remotePath = `${remoteDir}/${name}`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(remotePath, filePath, { contentType: 'image/jpeg', upsert: true });
    if (error) throw new Error(`Subida falló (${remotePath}): ${error.message}`);
    const { data } = supabase.storage.from(bucket).getPublicUrl(remotePath);
    urls.push(data.publicUrl);
  }
  return urls;
}
export async function uploadText(supabase, bucket, remotePath, content) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(remotePath, content, { contentType: 'text/plain; charset=utf-8', upsert: true });
  if (error) throw new Error('Subida de TXT fallo (' + remotePath + '): ' + error.message);
  const { data } = supabase.storage.from(bucket).getPublicUrl(remotePath);
  return data.publicUrl;
}
