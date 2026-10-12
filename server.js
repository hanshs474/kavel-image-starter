// A one-page AI image generator. Zero dependencies: Node 18+ and the Kavel HTTP API.
// Without KAVEL_API_KEY it runs on Kavel's free anonymous tier (watermarked, a couple of
// images a day per server IP). Set KAVEL_API_KEY to run on your own account.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const BASE = 'https://www.kavel.ai';
const KEY = process.env.KAVEL_API_KEY || '';
const MODEL = process.env.KAVEL_MODEL || 'kavel-image-v1';
const PORT = Number(process.env.PORT || 3000);
const PAGE = readFileSync(new URL('./index.html', import.meta.url));
// The free tier keys its wallet on x-anon-id; one id per server process is enough.
const ANON_ID = `starter-${randomUUID()}`;
const auth = KEY ? { authorization: `Bearer ${KEY}` } : { 'x-anon-id': ANON_ID };

const json = (res, code, body) => {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((ok, fail) => {
    let s = '';
    req.on('data', (c) => (s += c));
    req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch (e) { fail(e); } });
  });

async function submit(prompt, aspectRatio) {
  const r = await fetch(`${BASE}/api/ai/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...auth },
    body: JSON.stringify({
      provider: 'kie', mediaType: 'image', model: KEY ? MODEL : 'kavel-image-v1',
      scene: 'text-to-image', prompt, options: { aspect_ratio: aspectRatio || '1:1' },
    }),
  });
  const env = await r.json();
  // The quota wall is HTTP 200 with code 0 and data.wall — check it before reading an id.
  if (env.data?.wall) return { error: env.data.reason === 'anon_ip_daily'
    ? 'The free tier is used up for today on this server. Set KAVEL_API_KEY to keep going.'
    : 'Out of free credits. Set KAVEL_API_KEY to keep going.' };
  if (env.code !== 0 || !env.data?.id) return { error: env.message || 'Kavel refused the request.' };
  return { taskId: env.data.id };
}

async function status(taskId) {
  const r = KEY
    ? await fetch(`${BASE}/api/ai/query`, { method: 'POST', headers: { 'content-type': 'application/json', ...auth }, body: JSON.stringify({ taskId }) })
    : await fetch(`${BASE}/api/ai/anon-query?taskId=${encodeURIComponent(taskId)}&provider=kie&mediaType=image`, { headers: auth });
  const env = await r.json();
  const d = env.data || {};
  const url = d.cleanImages?.[0] || d.images?.[0];
  if (url) return { done: true, url };
  // Only success and failed are final; states can step backwards in between.
  if (d.status === 'failed' || d.status === 'error') return { done: true, error: 'The prompt was refused. Try rewording it.' };
  return { done: false };
}

createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    if (req.method === 'GET' && u.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(PAGE);
    }
    if (req.method === 'POST' && u.pathname === '/api/generate') {
      const { prompt, aspectRatio } = await readBody(req);
      if (!prompt || String(prompt).length > 2000) return json(res, 400, { error: 'Write a prompt (up to 2,000 characters).' });
      return json(res, 200, await submit(String(prompt), aspectRatio));
    }
    if (req.method === 'GET' && u.pathname === '/api/status') {
      // Polling is what starts a queued free job, so the page polls until done.
      return json(res, 200, await status(u.searchParams.get('id') || ''));
    }
    if (u.pathname === '/health') return json(res, 200, { ok: true });
    res.writeHead(404).end();
  } catch (e) {
    json(res, 502, { error: 'Could not reach Kavel. Try again in a moment.' });
  }
}).listen(PORT, () => console.log(`listening on :${PORT} (${KEY ? 'API key' : 'free tier'})`));
