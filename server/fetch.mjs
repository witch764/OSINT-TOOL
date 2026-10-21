// Requests in provider adapters use fixed, trusted endpoints. Arbitrary URLs use resolve.mjs.
export async function text(url, options = {}, limit = 1_000_000, timeoutMs = 8000) {
  const response = await fetch(url, {
    ...options,
    redirect: 'error',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: 'application/json', 'User-Agent': 'WitchSearch/1.0 (public-source-research)', ...options.headers },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new Error('Source response exceeded limit');
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks).toString();
}
export async function json(url, options, limit, timeoutMs) {
  const body = await text(url, options, limit, timeoutMs);
  return body === null ? null : JSON.parse(body);
}
const short = value => value == null ? 'Not published' : String(value).slice(0, 1500);
export const field = (label, value) => ({ label, value: short(value) });
export const result = (source, title, url, fields = [], description = '') => ({ source, title: short(title), url, fields, description: short(description) });
export const strip = value => String(value || '').replace(/<[^>]*>/g, '').trim();
