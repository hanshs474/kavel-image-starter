// A one-page AI image generator. Zero dependencies: Node 18+ and the Kavel HTTP API.
// Without KAVEL_API_KEY it runs on Kavel's free anonymous tier (watermarked, a couple of
// images a day per server IP). Set KAVEL_API_KEY to run on your own account.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { submit, status } from './lib/kavel.js';

const PORT = Number(process.env.PORT || 3000);
const PAGE = readFileSync(new URL('./index.html', import.meta.url));
const KEY = process.env.KAVEL_API_KEY || '';
const clientId = (req) => String(req.headers['x-client-id'] || '');

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
      return json(res, 200, await submit(String(prompt), aspectRatio, clientId(req)));
    }
    if (req.method === 'GET' && u.pathname === '/api/status') {
      // Polling is what starts a queued free job, so the page polls until done.
      return json(res, 200, await status(u.searchParams.get('id') || '', clientId(req)));
    }
    if (u.pathname === '/health') return json(res, 200, { ok: true });
    res.writeHead(404).end();
  } catch (e) {
    json(res, 502, { error: 'Could not reach Kavel. Try again in a moment.' });
  }
}).listen(PORT, () => console.log(`listening on :${PORT} (${KEY ? 'API key' : 'free tier'})`));
