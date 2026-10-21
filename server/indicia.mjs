import { json, field, result } from './fetch.mjs';

const origin = 'https://api.indicia.app';
// This is an explicit public-data allowlist. Never forward a caller-provided path,
// headers, cookies, optional fields, or arbitrary provider payload.
export const INDICIA_TOOLS = {
  tiktok: { path: '/v1/search/socials/tiktok', price: 'tiktok', identity: ['username', 'id', 'userId'] },
  epic: { path: '/v1/search/socials/epic', price: 'epic', identity: ['accountId', 'displayName', 'name'] },
  playstation: { path: '/v1/search/socials/playstation', price: 'playstation', identity: ['onlineId', 'accountId', 'profile', 'username'] },
  xbox: { path: '/v1/search/socials/xbox', price: 'xbox', identity: ['gamertag', 'xuid', 'profile', 'id'] },
  steam: { path: '/v1/search/socials/steam', price: 'steam', identity: ['steamId', 'personaName', 'profileUrl'] },
  ip: { path: '/v1/search/infrastructure/ipinfo', price: 'ipinfo', identity: ['ip'] },
  whois: { path: '/v1/search/infrastructure/whois', price: 'whois', identity: ['domain'] },
  certificate: { path: '/v1/search/infrastructure/certificates', price: 'certificates', list: true },
  urlscan: { path: '/v1/search/intelligence/urlscan', price: 'urlscan', collection: 'results' },
  cve: { path: '/v1/search/intelligence/cve', price: 'cve', identity: ['nvd', 'kev', 'kevMatches'] },
  wayback: { path: '/v1/search/intelligence/wayback', price: 'wayback', collection: 'snapshots' },
  crypto: { path: '/v1/tools/crypto', price: 'crypto', identity: ['address'] },
};
export function supportsIndicia(id) { return Object.hasOwn(INDICIA_TOOLS, id); }
async function request(path, apiKey, payload) {
  // Indicia profile/certificate responses can take 15s. Keep a bounded 20s
  // deadline while preserving the ordinary public adapters' 8s default.
  const data = await json(origin + path, {
    method: payload === undefined ? 'GET' : 'POST',
    headers: { 'x-api-key': apiKey, ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  }, 2_000_000, 20000);
  if (!data || data.success !== true || data.error || data.data?.error) throw new Error('Indicia could not complete this request.');
  return data;
}
export async function verifyIndicia(apiKey) {
  if (typeof apiKey !== 'string' || !/^in_[a-zA-Z0-9]{20,200}$/.test(apiKey)) throw new Error('Enter a valid Indicia API key.');
  const data = await request('/v1/info', apiKey);
  if (data.key?.enabled === false) throw new Error('This Indicia key is disabled.');
  return { connected: true, hasProviderCredits: Number(data.user?.tokens || 0) > 0 };
}
function publicUrl(value, fallback) {
  try { const u = new URL(value); if (['https:', 'http:'].includes(u.protocol) && !u.username && !u.password) return u.href; } catch { /* use documentation link */ }
  return fallback;
}
const useful = value => value !== undefined && value !== null && value !== '' && (Array.isArray(value) ? value.length > 0 : typeof value === 'object' ? Object.keys(value).length > 0 : true);
function fields(data) {
  const output = [];
  const visit = (value, path, depth) => {
    if (output.length >= 80 || depth > 6 || !useful(value)) return;
    if (typeof value === 'object') {
      for (const [key, item] of Object.entries(value).slice(0, 80)) {
        // These endpoints expose public records; discard unexpected credential fields.
        if (/password|secret|cookie|api.?key|authorization|(?:access|refresh|auth|session).*token|^token$/i.test(key)) continue;
        visit(item, path ? `${path} / ${key}` : key, depth + 1);
      }
    } else output.push(field(path.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' '), value));
  };
  visit(data, '', 0);
  return output;
}
export function indiciaRecords(toolId, query, data) {
  const spec = INDICIA_TOOLS[toolId];
  if (!supportsIndicia(toolId)) throw new Error('Unsupported Indicia search.');
  if (data === null) return [];
  const fallback = `https://api.indicia.app/openapi`;
  let rows;
  if (spec.list || spec.collection) {
    rows = spec.list ? data : data?.[spec.collection];
    if (!Array.isArray(rows)) throw new Error('Unexpected Indicia response.');
  } else {
    if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error('Unexpected Indicia response.');
    if (!spec.identity.some(key => useful(data[key]))) return [];
    rows = [data];
  }
  return rows.slice(0, 30).filter(row => row && typeof row === 'object' && !row.error).map(row => result(
    'Indicia', row.personaName || row.displayName || row.username || row.gamertag || row.onlineId || row.common_name || row.title || row.ip || row.domain || row.address || query,
    publicUrl(row.profileUrl || row.explorerUrl || row.result || row.url, fallback),
    fields(row),
    'Public-data response supplied by Indicia. Up to 30 records and 80 fields per record are shown. Profile availability and source freshness vary. Network locations are approximate.',
  ));
}
export async function searchIndicia(toolId, query, apiKey) {
  if (!supportsIndicia(toolId)) throw new Error('Unsupported Indicia search.');
  const start = Date.now();
  try {
    const spec = INDICIA_TOOLS[toolId];
    // Fail closed on changed/missing pricing. No automatic paid request or retry.
    const pricing = await request('/v1/pricing', apiKey);
    if (pricing.prices?.[spec.price] !== 0) throw new Error('This Indicia endpoint is not free.');
    const payload = toolId === 'crypto' ? { address: query, network: 'bitcoin' }
      : toolId === 'wayback' ? { url: query, limit: 20 }
      : toolId === 'tiktok' ? { query, type: 'username' } : { query };
    const response = await request(spec.path, apiKey, payload);
    if (!Object.hasOwn(response, 'data')) throw new Error('Unexpected Indicia response.');
    const results = indiciaRecords(toolId, query, response.data);
    if (apiKey && JSON.stringify(results).includes(apiKey)) throw new Error('Unexpected credential in provider response.');
    return [{ name: 'Indicia', status: results.length ? 'found' : 'no_match', duration: Date.now() - start, results }];
  } catch {
    return [{ name: 'Indicia', status: 'unavailable', duration: Date.now() - start, results: [], message: 'Indicia is unavailable, the key lacks access, or the endpoint is no longer free. No paid lookup was attempted.' }];
  }
}
