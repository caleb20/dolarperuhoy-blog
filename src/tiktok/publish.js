const API = 'https://open.tiktokapis.com/v2';

export async function queryCreatorInfo(accessToken) {
  const res = await fetch(`${API}/post/publish/creator_info/query/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (json.error?.code !== 'ok') {
    throw new Error(`creator_info falló: ${json.error?.code} ${json.error?.message}`);
  }
  return json.data;
}

export async function publishPhotoCarousel(accessToken, { imageUrls, title, description, privacyLevel, postMode, autoAddMusic }) {
  const postInfo =
    postMode === 'MEDIA_UPLOAD'
      ? { title, description }
      : {
          title,
          description,
          privacy_level: privacyLevel,
          disable_comment: false,
          auto_add_music: autoAddMusic !== false,
        };
  const body = {
    media_type: 'PHOTO',
    post_mode: postMode,
    post_info: postInfo,
    source_info: {
      source: 'PULL_FROM_URL',
      photo_cover_index: 0,
      photo_images: imageUrls,
    },
  };
  const res = await fetch(`${API}/post/publish/content/init/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.error?.code !== 'ok') {
    throw new Error(`publish init falló (${res.status}): ${json.error?.code} ${json.error?.message}`);
  }
  return json.data;
}

export async function pollPublishStatus(accessToken, publishId, { intervalMs = 6000, timeoutMs = 180000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const res = await fetch(`${API}/post/publish/status/fetch/?publish_id=${encodeURIComponent(publishId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await res.json();
    if (json.error?.code && json.error.code !== 'ok') {
      throw new Error(`status falló: ${json.error.code} ${json.error.message}`);
    }
    const status = json.data?.status;
    if (status === 'SUCCESS') return { status, data: json.data };
    if (status === 'FAILED') throw new Error(`Publicación TikTok falló: ${JSON.stringify(json.data)}`);
    console.log(`[tiktok] Estado: ${status || 'desconocido'}, esperando...`);
  }
  throw new Error('Timeout esperando confirmación de TikTok (el post puede seguir procesándose)');
}
