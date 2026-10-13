// Vercel function: POST /api/generate. Same contract as server.js.
import { submit } from '../lib/kavel.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { prompt, aspectRatio } = req.body || {};
  if (!prompt || String(prompt).length > 2000) return res.status(400).json({ error: 'Write a prompt (up to 2,000 characters).' });
  try {
    res.status(200).json(await submit(String(prompt), aspectRatio, String(req.headers['x-client-id'] || '')));
  } catch {
    res.status(502).json({ error: 'Could not reach Kavel. Try again in a moment.' });
  }
}
