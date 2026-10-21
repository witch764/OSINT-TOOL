import { field, result } from './fetch.mjs';

const origin = 'https://oathnet.org/api';
const docs = 'https://docs.oathnet.org/';
const exposureMode = 'oathnet-exposure';
const stealerMode = 'oathnet-infostealer';
export const isExposureMode = mode => [exposureMode, stealerMode].includes(mode);
export const OATHNET_TOOLS = [
  { id: 'oathnet-discord', name: 'OathNet Discord Profile', mode: 'oathnet-discord', icon: 'messages', description: 'Look up a public Discord profile by numeric user ID.', placeholder: 'Discord user ID (14–19 digits)…', example: '300760994454437890' },
  { id: 'oathnet-roblox', name: 'OathNet Roblox Profile', mode: 'oathnet-roblox', icon: 'game', description: 'Look up a public Roblox profile by username or numeric user ID.', placeholder: 'Roblox username or user ID…', example: 'Roblox' },
  { id: 'oathnet-steam', name: 'OathNet Steam Profile', mode: 'oathnet-steam', icon: 'game', description: 'Look up a public Steam profile by vanity name or SteamID64.', placeholder: 'Steam vanity name or 17-digit ID…', example: 'robinwalker' },
  { id: 'oathnet-xbox', name: 'OathNet Xbox Profile', mode: 'oathnet-xbox', icon: 'game', description: 'Look up a public Xbox profile by gamertag or XUID.', placeholder: 'Xbox gamertag or XUID…', example: 'ethan' },
  { id: exposureMode, name: 'Account Exposure Check', mode: exposureMode, icon: 'shield', description: 'Check an approved email address for breach exposure. Results contain source names and counts only.' },
  { id: stealerMode, name: 'Infostealer Exposure Intelligence', mode: stealerMode, icon: 'shield', description: 'Check an approved account email for infostealer exposure. Shows affected domains, provider timestamps, and remediation advice. Authorized OathNet API access is required.' },
].map(tool => ({ ...tool, provider: 'OathNet', requiredEnv: 'OATHNET_API_KEY', setupUrl: 'https://oathnet.org/dashboard?tab=account' }));

const specs = {
  'oathnet-discord': { path: '/service/discord-userinfo', param: 'discord_id', type: 'discord_id' },
  'oathnet-roblox': { path: '/service/roblox-userinfo', param: 'username', type: 'username' },
  'oathnet-steam': { path: '/service/steam', param: 'steam_id', type: 'steam_id' },
  'oathnet-xbox': { path: '/service/xbox', param: 'xbl_id', type: 'xbox_id' },
};
export const isOathnetMode = mode => OATHNET_TOOLS.some(tool => tool.mode === mode);
const problem = (status, message) => Object.assign(new Error(message), { status });
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const scalar = value => ['string', 'number', 'boolean'].includes(typeof value);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;

export function validateOathnetQuery(mode, value) {
  if (!isOathnetMode(mode) || typeof value !== 'string') throw problem(400, 'Choose a supported OathNet lookup.');
  const query = value.trim();
  if (!query || query.length > 160 || /[\x00-\x1f\x7f]/.test(query)) throw problem(400, 'Enter a valid identifier of up to 160 characters.');
  if (isExposureMode(mode)) {
    // No wildcards, broad queries, or provider filter syntax in email identifiers.
    if (!/^[a-z0-9.!#$%&'+/=?^_`{|}~-]{1,64}@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(query)) throw problem(400, 'Enter an exact email address.');
    return query.toLowerCase();
  }
  const valid = mode === 'oathnet-discord' ? /^\d{14,19}$/.test(query)
    : mode === 'oathnet-roblox' ? /^(?:[1-9]\d{0,15}|[a-zA-Z0-9_]{3,20})$/.test(query)
    : mode === 'oathnet-steam' ? /^[a-zA-Z0-9_-]{2,64}$/.test(query)
    : /^[a-zA-Z0-9][a-zA-Z0-9 #]{0,31}$/.test(query);
  if (!valid) throw problem(400, `Enter a valid ${mode.slice(8)} user identifier.`);
  return query;
}

// Operator approval is bound to an existing WitchSearch login. A checkbox supplied
// by a browser cannot grant access. Invalid configuration denies all exposure checks.
export function approvedOathnetEmails(env, username) {
  try {
    const config = JSON.parse(env.EXPOSURE_APPROVED_EMAILS || env.OATHNET_APPROVED_EMAILS || '{}');
    if (!object(config) || !Object.hasOwn(config, username) || !Array.isArray(config[username]) || config[username].length > 20) return [];
    return [...new Set(config[username].map(email => validateOathnetQuery(exposureMode, email)))];
  } catch { return []; }
}
export function authorizeOathnet(env, username, mode, query) {
  if (!env.OATHNET_API_KEY?.trim()) throw problem(503, 'OathNet is not configured. Ask the site owner to set OATHNET_API_KEY in the server environment.');
  if (mode === stealerMode && env.OATHNET_INFOSTEALER_ENABLED !== 'true') throw problem(503, 'Infostealer API access is disabled. Authorized OathNet API access and OATHNET_INFOSTEALER_ENABLED=true are required.');
  if (isExposureMode(mode) && !approvedOathnetEmails(env, username).includes(query)) throw problem(403, 'This email is not approved for your account. Ask the site owner to verify your authorization and configure EXPOSURE_APPROVED_EMAILS (or OATHNET_APPROVED_EMAILS).');
}

async function request(path, apiKey, { params = {}, payload, signal } = {}) {
  const url = new URL(origin + path);
  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : [value]) url.searchParams.append(key, item);
  }
  const response = await fetch(url, {
    method: payload === undefined ? 'GET' : 'POST', redirect: 'error', signal,
    headers: { Accept: 'application/json', 'x-api-key': apiKey, ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });
  if (!response.ok) {
    await response.body?.cancel();
    const message = response.status === 401 ? 'OathNet rejected the API key. The site owner must check OATHNET_API_KEY.'
      : response.status === 403 ? 'OathNet denied access. Check the subscription, endpoint permission, and remaining quota in the OathNet dashboard.'
      : response.status === 429 ? 'OathNet rate limit or quota reached. Try again later.'
      : response.status === 404 ? 'OathNet could not find this resource. No exposure conclusion can be drawn.'
      : 'OathNet is temporarily unavailable. Try again later.';
    throw problem(response.status, message);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Missing provider response');
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 1_000_000) throw new Error('Provider response exceeds limit');
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel(); }
  const envelope = JSON.parse(Buffer.concat(chunks).toString());
  if (!object(envelope) || envelope.success !== true || !object(envelope.data)) throw new Error('Unexpected OathNet response');
  return envelope.data;
}

function profile(mode, query, data) {
  let title, url, pairs;
  if (mode === 'oathnet-discord') {
    if (data.id !== query || !nonempty(data.username)) throw new Error('Unexpected Discord profile');
    title = data.username;
    url = `https://discord.com/users/${data.id}`;
    pairs = [['User ID', data.id], ['Username', data.username], ['Display name', data.global_name], ['Created', data.creation_date]];
  } else if (mode === 'oathnet-roblox') {
    const id = String(data.user_id || data['User ID'] || '');
    title = data.username || data['Current Username'];
    if (!/^[1-9]\d{0,15}$/.test(id) || !nonempty(title)) throw new Error('Unexpected Roblox profile');
    url = `https://www.roblox.com/users/${id}/profile`;
    pairs = [['User ID', id], ['Username', title], ['Display name', data['Display Name']], ['Joined', data['Join Date']]];
  } else if (mode === 'oathnet-steam') {
    const id = data.meta?.id || data.meta?.raw_data?.steamid;
    title = data.username;
    if (!nonempty(title) || !/^\d{17}$/.test(id)) throw new Error('Unexpected Steam profile');
    url = `https://steamcommunity.com/profiles/${id}`;
    pairs = [['SteamID64', id], ['Username', title], ['Visibility', data.meta?.raw_data?.communityvisibilitystate]];
  } else {
    title = data.username;
    if (!nonempty(title) || !nonempty(data.meta?.id)) throw new Error('Unexpected Xbox profile');
    url = `https://www.xbox.com/play/user/${encodeURIComponent(title)}`;
    pairs = [['XUID', data.meta.id], ['Gamertag', title], ['Gamerscore', data.meta?.meta?.gamerscore], ['Account tier', data.meta?.meta?.accounttier]];
  }
  // Explicit field allowlist: never recursively flatten provider data, linked
  // identities, private fields, credentials, or arbitrary URLs into reports.
  return result('OathNet', title, url, pairs.filter(([, value]) => scalar(value)).map(([label, value]) => field(label, value)), 'Public profile supplied by OathNet. A matching profile does not establish who controls the account.');
}

function exposure(query, data, stealer = false) {
  const { items, meta } = data;
  if (!Array.isArray(items) || items.length > 100 || !object(meta) || !Number.isSafeInteger(meta.total) || meta.total < items.length || typeof meta.has_more !== 'boolean') throw new Error('Unexpected exposure summary');
  // Verify the exact identity even if the upstream ignores the filter. Discard
  // the entire response on mismatch rather than showing a misleading summary.
  if (items.some(item => !object(item) || (stealer
    ? !Array.isArray(item.email) || item.email.length !== 1 || typeof item.email[0] !== 'string' || item.email[0].toLowerCase() !== query
    : typeof item.email !== 'string' || item.email.toLowerCase() !== query))) throw new Error('Exposure identity mismatch');
  if ((meta.total > 0 && items.length === 0) || (meta.total === 0 && meta.has_more)) throw new Error('Incomplete exposure summary');
  const names = [...new Set(items.map(item => item.dbname).filter(name => typeof name === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_. -]{0,119}$/.test(name)))];
  const domains = [...new Set(items.flatMap(item => Array.isArray(item.domain) ? item.domain : []).filter(domain => typeof domain === 'string' && domain.length <= 253 && /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/.test(domain)))];
  const timestamp = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
  const dates = key => [...new Set(items.map(item => item[key]).filter(timestamp).map(value => new Date(value).toISOString()))].sort();
  const compromised = dates('pwned_at');
  const indexed = dates('indexed_at');
  const row = result('OathNet', items.length ? `${stealer ? 'Infostealer' : 'Breach'} exposure found` : 'No exposure matches returned', docs + `guides/${stealer ? 'stealer' : 'breach'}-search`, [
    field('Exposure status', items.length ? 'Exposure found' : 'No matches returned'),
    field('Approved email', query), field('Matching records reported by OathNet', meta.total),
    field('Records checked in this page', items.length),
    ...(stealer ? [
      field('Affected domains in this page', domains.join(', ') || 'Not published'),
      field('Earliest exposure timestamp in this page', compromised[0] || 'Not published'),
      field('Latest exposure timestamp in this page', compromised.at(-1) || 'Not published'),
      field('Latest indexed timestamp in this page', indexed.at(-1) || 'Not published'),
    ] : [field('Breach sources in this page', names.join(', ') || 'None published')]),
    field('Checked at', new Date().toISOString()),
    field('More results available', meta.has_more || meta.total > items.length ? 'Yes — summary covers the returned page only (up to 100 records)' : 'No'),
  ], 'No matches does not prove an account is safe. If exposed, use a clean device to change reused passwords, revoke active sessions and tokens, enable multi-factor authentication, and investigate the affected device for malware. Provider timestamps describe the returned records, not proof of a current infection.');
  return { ...row, kind: 'exposure' };
}

export async function searchOathnet(mode, query, apiKey) {
  const start = Date.now();
  try {
    query = validateOathnetQuery(mode, query);
    // One deadline bounds both requests, response streaming, and parsing. No
    // automatic retry can silently consume additional provider quota.
    const signal = AbortSignal.timeout(18000);
    const type = isExposureMode(mode) ? 'email' : mode === 'oathnet-roblox' && /^\d+$/.test(query) ? 'roblox_id' : specs[mode].type;
    const init = await request('/service/search/init', apiKey, { payload: { query, search_type: type }, signal });
    const sessionId = init.session?.id;
    if (typeof sessionId !== 'string' || !/^[a-zA-Z0-9_-]{1,200}$/.test(sessionId)) throw new Error('Missing search session');
    let row, found = true;
    if (isExposureMode(mode)) {
      const stealer = mode === stealerMode;
      const data = await request(`/service/v2/${stealer ? 'stealer' : 'breach'}/search`, apiKey, {
        params: { search_id: sessionId, page_size: 100, 'fields[]': stealer ? ['email', 'domain', 'pwned_at', 'indexed_at'] : ['email', 'dbname'] },
        payload: { filter: { field: 'email', operator: 'eq', value: query } }, signal,
      });
      row = exposure(query, data, stealer);
      found = data.items.length > 0;
    } else {
      const spec = specs[mode];
      const param = mode === 'oathnet-roblox' && /^\d+$/.test(query) ? 'user_id' : spec.param;
      const data = await request(spec.path, apiKey, { params: { [param]: query, search_id: sessionId }, signal });
      row = profile(mode, query, data);
    }
    if (apiKey && JSON.stringify(row).includes(apiKey)) throw new Error('Provider echoed credential');
    return [{ name: 'OathNet', status: found ? 'found' : 'no_match', duration: Date.now() - start, results: [row] }];
  } catch (error) {
    return [{ name: 'OathNet', status: 'unavailable', duration: Date.now() - start, results: [], message: error.status ? error.message : error.name === 'TimeoutError' ? 'OathNet timed out. Try again later.' : 'OathNet returned an unreadable or unexpected response. No exposure conclusion can be drawn.' }];
  }
}
