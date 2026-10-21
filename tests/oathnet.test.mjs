import test from 'node:test';
import assert from 'node:assert/strict';
import { searchOathnet, validateOathnetQuery, approvedOathnetEmails } from '../server/oathnet.mjs';
import { createApi } from '../server/api.mjs';
import { createMemoryStore } from '../server/store.mjs';

const key = 'synthetic-oathnet-key-for-tests';
const email = 'owned@example.com';
const env = { OATHNET_API_KEY: key, OATHNET_APPROVED_EMAILS: JSON.stringify({ researcher: [email] }), OATHNET_INFOSTEALER_ENABLED: 'true' };
const json = data => new Response(JSON.stringify({ success: true, data }));
const init = () => json({ session: { id: 'sess_test' } });
const breach = () => ({ items: [{ email, dbname: 'example_2024', password: 'secret-password', extra: { token: 'secret-token' }, ip: 'private-ip', address_street: 'private-address' }], meta: { total: 1, has_more: false } });
const stealer = () => ({ items: [{ email: [email], domain: ['example.com'], pwned_at: '2024-03-15T10:30:00Z', indexed_at: '2024-03-20T12:00:00Z', password: 'secret-password', cookie: 'secret-cookie', token: 'secret-token', log_id: 'private-log', url_str: 'https://example.com/?token=secret-url-token' }], meta: { total: 1, has_more: false } });
async function mocked(fetcher, run) {
  const original = globalThis.fetch;
  globalThis.fetch = fetcher;
  try { await run(); } finally { globalThis.fetch = original; }
}
function fixture(overrides = {}) {
  const store = createMemoryStore();
  const handle = createApi({ store, env: { ...env, ...overrides } });
  const request = async (path, data, cookie, ip = 'test-ip') => {
    const response = await handle(new Request('https://witchsearch.example/api' + path, {
      method: data === undefined ? 'GET' : 'POST',
      headers: { ...(data === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { cookie } : {}) },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    }), { ip });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  };
  const signup = name => request('/auth/signup', { username: name, password: 'synthetic-test-password' });
  const search = (mode, query = email, cookie) => request('/search', { toolId: mode, mode, query }, cookie);
  return { store, request, signup, search };
}

test('exact email/identifier validation and malformed authorization configuration deny broad searches', () => {
  for (const value of ['*@example.com', 'owned@example.com OR *', 'example.com', 'owned@example.com\nother', {}, ['owned@example.com']]) {
    assert.throws(() => validateOathnetQuery('oathnet-exposure', value));
  }
  assert.equal(validateOathnetQuery('oathnet-exposure', ' Owned@Example.com '), email);
  assert.throws(() => validateOathnetQuery('oathnet-discord', '1234'));
  assert.throws(() => validateOathnetQuery('oathnet-roblox', '../private'));
  assert.throws(() => validateOathnetQuery('oathnet-steam', 'http://localhost'));
  assert.throws(() => validateOathnetQuery('oathnet-xbox', 'name&admin=true'));
  for (const config of ['{', '[]', '{"researcher":"owned@example.com"}', '{"researcher":["*@example.com"]}', '{"researcher":["owned@example.com",null]}']) {
    assert.deepEqual(approvedOathnetEmails({ OATHNET_APPROVED_EMAILS: config }, 'researcher'), []);
  }
  assert.deepEqual(approvedOathnetEmails(env, 'unapproved'), []);
  assert.deepEqual(approvedOathnetEmails({}, '__proto__'), []);
});

test('exposure requires login and per-account approval; rejected requests never call the provider or charge', async () => {
  const f = fixture();
  const approved = await f.signup('researcher');
  const other = await f.signup('other_user');
  let calls = 0;
  await mocked(async () => { calls++; throw new Error('must not call'); }, async () => {
    assert.equal((await f.request('/oathnet/access')).status, 401);
    assert.equal((await f.search('oathnet-exposure', email)).status, 401);
    assert.equal((await f.search('oathnet-exposure', email, other.cookie)).status, 403);
    assert.equal((await f.search('oathnet-infostealer', email, other.cookie)).status, 403);
    assert.equal((await f.search('oathnet-exposure', 'different@example.com', approved.cookie)).status, 403);
    assert.equal((await f.request('/search', { mode: 'oathnet-exposure', query: email }, approved.cookie)).status, 400);
    assert.equal((await f.request('/search', { toolId: 'email', mode: 'oathnet-exposure', query: email }, approved.cookie)).status, 400);
    assert.equal((await f.request('/search', { toolId: 'oathnet-exposure', mode: 'oathnet-exposure', query: email, provider: 'indicia' }, approved.cookie)).status, 400);
  });
  assert.equal(calls, 0);
  assert.equal((await f.store.read('user/researcher')).data.credits, 5);
  assert.equal((await f.store.read('user/other_user')).data.credits, 5);
  assert.deepEqual((await f.request('/oathnet/access', undefined, other.cookie)).data.emails, []);
  const access = await f.request('/oathnet/access', undefined, approved.cookie);
  assert.deepEqual(access.data.emails, [email]);
  assert.ok(!JSON.stringify(access.data).includes(key));
});

test('missing key and disabled infostealer access fail before provider traffic; catalog exposes no secret', async () => {
  for (const overrides of [{ OATHNET_API_KEY: '' }, { OATHNET_INFOSTEALER_ENABLED: 'false' }]) {
    const f = fixture(overrides);
    const user = await f.signup('researcher');
    await mocked(async () => { throw new Error('must not call'); }, async () => {
      assert.equal((await f.search('oathnet-infostealer', email, user.cookie)).status, 503);
    });
    const config = await f.request('/config');
    const tools = config.data.toolGroups.flatMap(group => group.tools);
    assert.equal(tools.find(tool => tool.id === 'oathnet-infostealer').available, false);
    assert.ok(!JSON.stringify(config.data).includes(key));
    assert.equal((await f.store.read('user/researcher')).data.credits, 5);
  }
});

test('breach/infostealer requests use exact filters and field projections; raw secrets never reach reports/history/export', async () => {
  for (const mode of ['oathnet-exposure', 'oathnet-infostealer']) {
    const f = fixture();
    const user = await f.signup('researcher');
    const calls = [];
    await mocked(async (url, options) => {
      calls.push({ url: new URL(url), options });
      assert.equal(new URL(url).origin, 'https://oathnet.org');
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers['x-api-key'], key);
      assert.ok(options.signal instanceof AbortSignal);
      return String(url).endsWith('/search/init') ? init() : json(mode === 'oathnet-infostealer' ? stealer() : breach());
    }, async () => {
      const response = await f.search(mode, email, user.cookie);
      assert.equal(response.status, 200);
      assert.equal(response.data.search.status, 'complete');
      assert.equal(response.data.search.provider, 'oathnet');
      assert.equal(response.data.user.credits, 4);
      assert.equal(calls.length, 2);
      assert.deepEqual(JSON.parse(calls[0].options.body), { query: email, search_type: 'email' });
      assert.equal(calls[1].url.pathname, `/api/service/v2/${mode === 'oathnet-infostealer' ? 'stealer' : 'breach'}/search`);
      assert.equal(calls[1].url.searchParams.get('search_id'), 'sess_test');
      assert.equal(calls[1].url.searchParams.get('page_size'), '100');
      assert.deepEqual(calls[1].url.searchParams.getAll('fields[]'), mode === 'oathnet-infostealer' ? ['email', 'domain', 'pwned_at', 'indexed_at'] : ['email', 'dbname']);
      assert.deepEqual(JSON.parse(calls[1].options.body), { filter: { field: 'email', operator: 'eq', value: email } });
      await f.request('/history/save', { id: response.data.search.id, saved: true }, user.cookie);
      const history = await f.request('/history', undefined, user.cookie);
      const stored = await f.store.read('user/researcher');
      const serialized = JSON.stringify([response.data, history.data, stored]);
      for (const forbidden of [key, 'secret-password', 'secret-cookie', 'secret-token', 'private-log', 'private-ip', 'private-address', 'secret-url-token']) assert.ok(!serialized.includes(forbidden), forbidden);
      const fields = response.data.search.sources[0].results[0].fields;
      if (mode === 'oathnet-infostealer') {
        assert.equal(fields.find(field => field.label === 'Affected domains in this page').value, 'example.com');
        assert.equal(fields.find(field => field.label.startsWith('Latest exposure')).value, '2024-03-15T10:30:00.000Z');
        assert.ok(response.data.search.sources[0].results[0].description.includes('revoke active sessions'));
      }
    });
  }
});

test('provider failures are unavailable with refunds and safe actionable messages, never no-match results', async () => {
  for (const status of [401, 403, 404, 429, 500]) {
    const f = fixture();
    const user = await f.signup('researcher');
    await mocked(async url => String(url).endsWith('/search/init') ? init() : new Response(key + ' private provider error', { status }), async () => {
      const response = await f.search('oathnet-exposure', email, user.cookie);
      assert.equal(response.data.search.status, 'failed');
      assert.equal(response.data.user.credits, 5);
      const source = response.data.search.sources[0];
      assert.equal(source.status, 'unavailable');
      assert.deepEqual(source.results, []);
      assert.ok(source.message.includes('OathNet'));
      assert.ok(!JSON.stringify(response).includes(key));
    });
  }
});

test('identity mismatches, broken envelopes, incomplete summaries, oversized responses and network failures fail closed', async () => {
  const invalid = [
    () => new Response('not json'),
    () => json({}),
    () => new Response(JSON.stringify({ success: false, message: key })),
    () => json({ items: [{ email: 'someone-else@example.com' }], meta: { total: 1, has_more: false } }),
    () => json({ items: [], meta: { total: 5, has_more: true } }),
    () => new Response('x'.repeat(1_000_001)),
    () => { throw new DOMException('timeout with ' + key, 'TimeoutError'); },
  ];
  for (const make of invalid) {
    await mocked(async url => String(url).endsWith('/search/init') ? init() : make(), async () => {
      const [source] = await searchOathnet('oathnet-exposure', email, key);
      assert.equal(source.status, 'unavailable');
      assert.deepEqual(source.results, []);
      assert.ok(!JSON.stringify(source).includes(key));
    });
  }
  await mocked(async () => json({ session: {} }), async () => {
    assert.equal((await searchOathnet('oathnet-discord', '300760994454437890', key))[0].status, 'unavailable');
  });
  await mocked(async url => String(url).endsWith('/search/init') ? init() : json({ items: [{ email: [email, 'other@example.com'] }], meta: { total: 1, has_more: false } }), async () => {
    assert.equal((await searchOathnet('oathnet-infostealer', email, key))[0].status, 'unavailable');
  });
});

test('no matches and truncated pages remain honest about coverage', async () => {
  for (const data of [{ items: [], meta: { total: 0, has_more: false } }, { ...breach(), meta: { total: 200, has_more: true } }]) {
    await mocked(async url => String(url).endsWith('/search/init') ? init() : json(data), async () => {
      const [source] = await searchOathnet('oathnet-exposure', email, key);
      assert.equal(source.status, data.items.length ? 'found' : 'no_match');
      assert.ok(source.results[0].description.includes('does not prove'));
      if (data.meta.has_more) assert.ok(JSON.stringify(source).includes('up to 100'));
    });
  }
});

test('public profile adapters follow documented paths and omit unknown fields and identity pivots', async () => {
  const fixtures = [
    ['oathnet-discord', '300760994454437890', '/api/service/discord-userinfo', 'discord_id', { id: '300760994454437890', username: 'PublicUser', global_name: 'Public Name' }],
    ['oathnet-roblox', '156', '/api/service/roblox-userinfo', 'user_id', { user_id: '156', username: 'PublicUser', Discord: 'private-linked-account' }],
    ['oathnet-roblox', 'PublicUser', '/api/service/roblox-userinfo', 'username', { 'User ID': '156', 'Current Username': 'PublicUser' }],
    ['oathnet-steam', 'publicuser', '/api/service/steam', 'steam_id', { username: 'PublicUser', meta: { id: '76561199443618616' } }],
    ['oathnet-xbox', 'PublicUser', '/api/service/xbox', 'xbl_id', { username: 'PublicUser', meta: { id: '2535419058108561', meta: { gamerscore: '45', realname: 'private-realname' } } }],
  ];
  for (const [mode, query, path, param, data] of fixtures) {
    await mocked(async (url, options) => {
      if (String(url).endsWith('/search/init')) return init();
      assert.equal(new URL(url).pathname, path);
      assert.equal(new URL(url).searchParams.get(param), query);
      return json({ ...data, password: 'private-password', token: 'private-token', email: 'private-email', url: 'javascript:alert(1)' });
    }, async () => {
      const [source] = await searchOathnet(mode, query, key);
      assert.equal(source.status, 'found', mode);
      assert.ok(source.results[0].url.startsWith('https://'));
      assert.ok(!JSON.stringify(source).includes('private-'));
    });
  }
});

test('OathNet uses persistent per-account limits shared by modules; the rejected check does not charge', async () => {
  const f = fixture();
  const user = await f.signup('researcher');
  await mocked(async url => String(url).endsWith('/search/init') ? init() : new Response('', { status: 403 }), async () => {
    for (let i = 0; i < 5; i++) assert.equal((await f.search(i % 2 ? 'oathnet-infostealer' : 'oathnet-exposure', email, user.cookie)).status, 200);
    const limited = await f.search('oathnet-exposure', email, user.cookie);
    assert.equal(limited.status, 429);
    assert.equal((await f.store.read('user/researcher')).data.credits, 5);
  });
});

test('infostealer timestamps sort chronologically across timezones and invalid dates are not displayed', async () => {
  const data = { items: [
    { email: [email], domain: ['example.com'], pwned_at: '2024-03-15T23:30:00-05:00', indexed_at: 'not-a-timestamp' },
    { email: [email], domain: ['example.org'], pwned_at: '2024-03-16T01:30:00Z' },
  ], meta: { total: 2, has_more: false } };
  await mocked(async url => String(url).endsWith('/search/init') ? init() : json(data), async () => {
    const [source] = await searchOathnet('oathnet-infostealer', email, key);
    assert.equal(source.status, 'found');
    const fields = source.results[0].fields;
    assert.equal(fields.find(field => field.label.startsWith('Latest exposure')).value, '2024-03-16T04:30:00.000Z');
    assert.equal(fields.find(field => field.label.startsWith('Earliest exposure')).value, '2024-03-16T01:30:00.000Z');
    assert.equal(fields.find(field => field.label.startsWith('Latest indexed')).value, 'Not published');
  });
});
