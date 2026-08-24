import 'dotenv/config';
import http from 'node:http';
import crypto from 'node:crypto';
import { getSupabase } from '../src/supabase.js';
import { saveTokens } from '../src/tiktok/tokens.js';

const PORT = 3927;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || `http://localhost:${PORT}/callback`;
const SCOPES = 'user.info.basic,video.publish,video.upload';

const clientKey = process.env.TIKTOK_CLIENT_KEY;
const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
if (!clientKey || !clientSecret) {
  console.error('Faltan TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET en .env');
  process.exit(1);
}

const state = crypto.randomBytes(12).toString('hex');
const codeVerifier = crypto.randomBytes(48).toString('base64url');
const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
const authUrl =
  'https://www.tiktok.com/v2/auth/authorize/?' +
  new URLSearchParams({
    client_key: clientKey,
    scope: SCOPES,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  }).toString();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  if (url.pathname !== '/callback') {
    res.writeHead(404).end();
    return;
  }
  if (url.searchParams.get('state') !== state) {
    res.writeHead(400).end('State invalido');
    return;
  }
  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400).end(url.searchParams.get('error_description') || 'Sin code');
    return;
  }

  const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });
  const json = await tokenRes.json();
  if (!json.access_token) {
    console.error('Error canjeando el codigo:', JSON.stringify(json));
    res.writeHead(500).end('Error canjeando el codigo. Mira la consola.');
    process.exit(1);
  }

  const tokens = {
    open_id: json.open_id,
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: new Date(Date.now() + json.expires_in * 1000).toISOString(),
  };

  console.log('\n✅ Autorizacion exitosa.');
  console.log(`open_id: ${tokens.open_id}`);
  console.log(`access_token (vence ${tokens.expires_at}): ${tokens.access_token}`);
  console.log(`refresh_token (guardar en GitHub Secret como respaldo): ${tokens.refresh_token}`);

  try {
    const supabase = getSupabase();
    await saveTokens(supabase, tokens);
    console.log('Tokens guardados en Supabase (tabla tiktok_tokens).');
  } catch (err) {
    console.warn(`No se pudo guardar en Supabase: ${err.message}`);
    console.warn('Crea la tabla tiktok_tokens (ver README) o copia el refresh_token de arriba a .env como TIKTOK_REFRESH_TOKEN.');
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>✅ TikTok autorizado</h1><p>Puedes cerrar esta pestaña.</p>');
  server.close();
  process.exit(0);
});

server.listen(PORT, () => {
  console.log(`\nAbre este enlace en tu navegador, inicia sesion con la cuenta de TikTok de DolarPeruHoy y autoriza:\n`);
  console.log(authUrl);
  console.log(`\n(Asegurate que "${REDIRECT_URI}" este registrada como Redirect URI en tu app de TikTok)`);
});
