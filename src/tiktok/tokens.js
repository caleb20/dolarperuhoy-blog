const TABLE = 'tiktok_tokens';

export async function loadTokens(supabase) {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', 1).maybeSingle();
  if (error) throw new Error(`No se pudo leer ${TABLE}: ${error.message}`);
  return data || null;
}

export async function saveTokens(supabase, tokens) {
  const row = {
    id: 1,
    open_id: tokens.open_id || null,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expires_at,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from(TABLE).upsert(row);
  if (error) throw new Error(`No se pudo guardar en ${TABLE}: ${error.message}`);
}

async function refreshAccessToken(clientKey, clientSecret, refreshToken) {
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await res.json();
  if (!json.access_token) {
    throw new Error(`Refresh de token TikTok falló: ${JSON.stringify(json)}`);
  }
  return {
    open_id: json.open_id,
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: new Date(Date.now() + json.expires_in * 1000).toISOString(),
  };
}

export async function getValidAccessToken(supabase) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) throw new Error('Faltan TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET');

  const stored = await loadTokens(supabase);
  const refreshToken = stored?.refresh_token || process.env.TIKTOK_REFRESH_TOKEN;
  if (!refreshToken) throw new Error('No hay refresh_token. Ejecuta npm run tiktok:auth primero.');

  const expiresAt = stored?.expires_at ? new Date(stored.expires_at).getTime() : 0;
  if (stored?.access_token && expiresAt > Date.now() + 120000) {
    return { accessToken: stored.access_token, openId: stored.open_id, refreshed: false };
  }

  console.log('[tiktok] Access token vencido o ausente, refrescando...');
  const fresh = await refreshAccessToken(clientKey, clientSecret, refreshToken);
  await saveTokens(supabase, fresh);
  return { accessToken: fresh.access_token, openId: fresh.open_id, refreshed: true };
}
