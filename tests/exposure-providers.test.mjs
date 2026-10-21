import test from 'node:test';
import assert from 'node:assert/strict';
import { searchHibp } from '../server/exposure.mjs';
import { abuseipdbRecords } from '../server/reputation.mjs';
import { createApi } from '../server/api.mjs';
import { createMemoryStore } from '../server/store.mjs';
import { runSearch, validateSearch } from '../server/search.mjs';
import { extraSearch } from '../server/public.mjs';
import { TOOLS } from '../server/catalog.mjs';
const email = 'owned@example.com';
const key = 'synthetic-hibp-key';
const json = data => new Response(JSON.stringify(data));
async function mocked(fetcher, run) { const original = globalThis.fetch; globalThis.fetch = fetcher; try { await run(); } finally { globalThis.fetch = original; } }
function fixture(overrides = {}) {
  const env = { HIBP_API_KEY: key, EXPOSURE_APPROVED_EMAILS: JSON.stringify({ researcher: [email] }), ...overrides };
  const store = createMemoryStore();
  const handle = createApi({ store, env });
  const request = async (path, data, cookie) => {
    const response = await handle(new Request('https://witchsearch.example/api' + path, { method: data === undefined ? 'GET' : 'POST', headers: { ...(data === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { cookie } : {}) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) }), { ip: 'test-ip' });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  };
  const signup = name => request('/auth/signup', { username: name, password: 'synthetic-test-password' });
  return { request, signup, store };
}

test('HIBP documented 404 means no matches; authentication, quota, malformed responses and secret echoes fail closed', async () => {
  for (const status of [401, 403, 429, 500]) await mocked(async () => new Response(key, { status }), async () => {
    const source = await searchHibp(email, key);
    assert.equal(source.status, 'unavailable'); assert.ok(!JSON.stringify(source).includes(key));
  });
  await mocked(async () => new Response('', { status: 404 }), async () => {
    const source = await searchHibp(email, key); assert.equal(source.status, 'no_match'); assert.ok(source.results[0].description.includes('does not prove'));
  });
  for (const data of [{ error: 'invalid' }, [{}], [{ Name: key }]]) await mocked(async () => json(data), async () => assert.equal((await searchHibp(email, key)).status, 'unavailable'));
});

test('unified exposure uses approved exact email, safe HIBP metadata, provider attribution and checked-at timestamps', async () => {
  const f = fixture();
  const user = await f.signup('researcher');
  await mocked(async (url, options) => {
    assert.equal(new URL(url).origin, 'https://haveibeenpwned.com');
    assert.equal(new URL(url).pathname, '/api/v3/breachedAccount/owned%40example.com');
    assert.equal(new URL(url).searchParams.get('truncateResponse'), 'false');
    assert.equal(options.headers['hibp-api-key'], key); assert.equal(options.headers['User-Agent'], 'WitchSearch/1.0'); assert.equal(options.redirect, 'error');
    return json([{ Name: 'ExampleBreach', Domain: 'example.com', BreachDate: '2024-01-01', Description: 'secret-raw-description', token: 'secret-token', Password: 'secret-password' }]);
  }, async () => {
    const response = await f.request('/search', { mode: 'account-exposure', query: email }, user.cookie);
    assert.equal(response.status, 200); assert.equal(response.data.search.status, 'complete'); assert.equal(response.data.user.credits, 4); assert.equal(response.data.search.provider, 'combined');
    const source = response.data.search.sources[0];
    assert.equal(source.name, 'Have I Been Pwned'); assert.ok(Number.isFinite(Date.parse(source.checkedAt)));
    assert.ok(JSON.stringify(source).includes('ExampleBreach')); assert.ok(!JSON.stringify(source).includes('secret-')); assert.ok(!JSON.stringify(source).includes(key));
    const history = await f.request('/history', undefined, user.cookie); assert.ok(!JSON.stringify(history.data).includes('secret-'));
  });
});

test('shared approval cannot be overridden by legacy config, browser fields, or another account', async () => {
  const f = fixture({ EXPOSURE_APPROVED_EMAILS: '{}', OATHNET_APPROVED_EMAILS: JSON.stringify({ researcher: [email] }) });
  const user = await f.signup('researcher');
  await mocked(async () => { throw new Error('must not call'); }, async () => {
    const response = await f.request('/search', { mode: 'account-exposure', query: email, authorized: true, filter: { field: 'email', value: email } }, user.cookie);
    assert.equal(response.status, 403); assert.equal((await f.store.read('user/researcher')).data.credits, 5);
  });
  assert.deepEqual((await f.request('/exposure/access', undefined, user.cookie)).data.emails, []);
  assert.equal((await f.request('/exposure/access')).status, 401);
});

test('unified providers remain independent; successful metadata survives another provider failure and all failures refund', async () => {
  const f = fixture({ OATHNET_API_KEY: 'synthetic-oathnet-key' });
  const user = await f.signup('researcher');
  for (const healthy of [true, false]) await mocked(async url => new URL(url).hostname === 'oathnet.org' ? new Response('', { status: 403 }) : healthy ? json([{ Name: 'Example' }]) : new Response('', { status: 429 }), async () => {
    const response = await f.request('/search', { mode: 'account-exposure', query: email }, user.cookie);
    assert.equal(response.data.search.status, healthy ? 'complete' : 'failed');
    assert.equal(response.data.user.credits, 4);
    assert.equal(response.data.search.sources.length, 2);
    assert.equal(response.data.search.sources[0].status, 'unavailable');
  });
});

test('exposure without a configured provider is disabled before charging', async () => {
  const f = fixture({ HIBP_API_KEY: '' }); const user = await f.signup('researcher');
  const response = await f.request('/search', { mode: 'account-exposure', query: email }, user.cookie);
  assert.equal(response.status, 503); assert.ok(response.data.error.includes('HIBP_API_KEY')); assert.equal((await f.store.read('user/researcher')).data.credits, 5);
});

test('AbuseIPDB read-only check validates IPs, uses a header key and drops raw reports/secrets', async () => {
  assert.throws(() => validateSearch('abuseipdb', '127.0.0.1')); assert.throws(() => validateSearch('abuseipdb', '8.8.8.8&admin=true'));
  await mocked(async (url, options) => {
    assert.equal(new URL(url).origin, 'https://api.abuseipdb.com'); assert.equal(new URL(url).pathname, '/api/v2/check'); assert.equal(new URL(url).searchParams.get('ipAddress'), '8.8.8.8'); assert.equal(new URL(url).searchParams.get('maxAgeInDays'), '90'); assert.equal(new URL(url).searchParams.has('verbose'), false); assert.equal(options.headers.Key, key); assert.equal(options.redirect, 'error');
    return json({ data: { ipAddress: '8.8.8.8', abuseConfidenceScore: 0, totalReports: 0, numDistinctUsers: 0, reports: [{ comment: 'secret-raw-report' }], token: 'secret-token' } });
  }, async () => {
    const rows = await abuseipdbRecords('8.8.8.8', key); assert.equal(rows.length, 1); assert.ok(!JSON.stringify(rows).includes('secret-'));
  });
  await mocked(async () => json({ data: { ipAddress: '1.1.1.1', abuseConfidenceScore: 0, totalReports: 0 } }), async () => assert.rejects(() => abuseipdbRecords('8.8.8.8', key)));
});

test('existing URLScan and IPinfo adapters attach optional keys only to their fixed documented endpoints', async () => {
  await mocked(async (url, options) => {
    assert.ok(String(url).startsWith('https://urlscan.io/api/v1/search/')); assert.equal(options.headers['api-key'], 'synthetic-urlscan-key'); return json({ results: [] });
  }, async () => {
    const sources = await runSearch('urlscan', 'example.com', { URLSCAN_API_KEY: 'synthetic-urlscan-key' }, TOOLS.find(tool => tool.id === 'urlscan')); assert.equal(sources[0].status, 'no_match');
  });
  await mocked(async () => json({ message: 'provider changed response' }), async () => {
    const sources = await runSearch('urlscan', 'example.com', {}, TOOLS.find(tool => tool.id === 'urlscan')); assert.equal(sources[0].status, 'unavailable');
  });
  const tasks = [];
  extraSearch((name, operation) => { if (name === 'IPinfo') tasks.push(operation); }, 'ip', '8.8.8.8', { IPINFO_TOKEN: 'synthetic-ipinfo-key' });
  await mocked(async (url, options) => {
    assert.equal(String(url), 'https://api.ipinfo.io/lite/8.8.8.8'); assert.equal(options.headers.Authorization, 'Bearer synthetic-ipinfo-key'); return json({ ip: '8.8.8.8', asn: 'AS15169', as_name: 'Google LLC', country_code: 'US' });
  }, async () => {
    const rows = await tasks[0](); assert.ok(rows[0].fields.some(field => field.label === 'Country' && field.value === 'US')); assert.ok(!JSON.stringify(rows).includes('synthetic-ipinfo-key'));
  });
});
