import { field, result } from './fetch.mjs';
import { approvedOathnetEmails, searchOathnet } from './oathnet.mjs';
import { providerJson, providerSource } from './provider-http.mjs';

export const exposureProviders = env => [
  { name: 'OathNet breach', configured: Boolean(env.OATHNET_API_KEY?.trim()) },
  { name: 'OathNet infostealer', configured: Boolean(env.OATHNET_API_KEY?.trim() && env.OATHNET_INFOSTEALER_ENABLED === 'true') },
  { name: 'Have I Been Pwned', configured: Boolean(env.HIBP_API_KEY?.trim()) },
];
export function authorizeExposure(env, username, query) {
  if (!exposureProviders(env).some(provider => provider.configured)) throw Object.assign(new Error('Exposure providers are not configured. The site owner must set OATHNET_API_KEY or HIBP_API_KEY in the server environment.'), { status: 503 });
  if (!approvedOathnetEmails(env, username).includes(query)) throw Object.assign(new Error('This email is not approved for your account. Ask the site owner to verify authorization and configure EXPOSURE_APPROVED_EMAILS.'), { status: 403 });
}
export async function searchHibp(query, apiKey) {
  return providerSource('Have I Been Pwned', async () => {
    if (!apiKey?.trim()) throw new Error('Missing API key');
    const rows = await providerJson('Have I Been Pwned', `https://haveibeenpwned.com/api/v3/breachedAccount/${encodeURIComponent(query)}?truncateResponse=false`, { 'hibp-api-key': apiKey }, { notFoundIsEmpty: true });
    if (!Array.isArray(rows) || rows.some(row => !row || typeof row.Name !== 'string' || !row.Name)) throw new Error('Unexpected breach list');
    const names = rows.slice(0, 50).map(row => row.Name);
    const domains = [...new Set(rows.slice(0, 50).map(row => row.Domain).filter(value => typeof value === 'string' && /^(?:[a-z0-9-]+\.)+[a-z]{2,63}$/i.test(value)))];
    const dates = rows.map(row => row.BreachDate).filter(value => typeof value === 'string' && /^\d{4}-\d\d-\d\d$/.test(value)).sort();
    const row = { ...result('Have I Been Pwned', rows.length ? 'Breach exposure found' : 'No exposure matches returned', 'https://haveibeenpwned.com/', [
      field('Exposure status', rows.length ? 'Exposure found' : 'No matches returned'), field('Approved email', query),
      field('Breaches reported', rows.length), field('Breach sources (up to 50)', names.join(', ') || 'None returned'),
      field('Affected domains (up to 50 breaches)', domains.join(', ') || 'Not published'),
      field('Latest breach date reported', dates.at(-1) || 'Not published'), field('Checked at', new Date().toISOString()),
    ], 'Have I Been Pwned breach metadata. No matches does not prove safety; sensitive or retired breaches may not be returned. If exposed, change reused passwords, revoke sessions, and enable multi-factor authentication.'), kind: 'exposure' };
    if (JSON.stringify(row).includes(apiKey)) throw new Error('Provider echoed key');
    return { results: [row], found: rows.length > 0 };
  });
}
export async function searchExposure(query, env) {
  const sources = [];
  if (env.OATHNET_API_KEY?.trim()) {
    sources.push(searchOathnet('oathnet-exposure', query, env.OATHNET_API_KEY));
    if (env.OATHNET_INFOSTEALER_ENABLED === 'true') sources.push(searchOathnet('oathnet-infostealer', query, env.OATHNET_API_KEY).then(items => items.map(source => ({ ...source, name: 'OathNet infostealer' }))));
  }
  if (env.HIBP_API_KEY?.trim()) sources.push(searchHibp(query, env.HIBP_API_KEY).then(source => [source]));
  return (await Promise.all(sources)).flat();
}
