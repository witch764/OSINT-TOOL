import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRobloxScan, matchesRobloxName } from '../server/roblox-scan.mjs';
import { runSearch, validateSearch } from '../server/search.mjs';
import { TOOLS } from '../server/catalog.mjs';
const tool = TOOLS.find(t => t.id === 'roblox-scraper');
const base = { count: 4, includeUnavailable: true, showIds: true, showStatus: true };
const user = (id, name) => ({ id, name, displayName: name.toUpperCase(), hasVerifiedBadge: false });
async function withDirectory(mock, operation) {
  const original = globalThis.fetch;
  globalThis.fetch = mock;
  try { await operation(); } finally { globalThis.fetch = original; }
}

test('batch validation supports a one-digit ID and rejects unbounded/invalid work before provider calls', () => {
  assert.equal(validateSearch('roblox-batch', '1'), '1');
  for (const input of [{ count: 201 }, { count: 0 }, { count: 1.5 }, { count: '10' }, { count: null }, { showIds: 'true' }, { exactLength: 0 }, { keywords: ['test'] }, { startsWith: 'x'.repeat(65) }, { workers: 500 }]) assert.throws(() => validateRobloxScan('1', input));
  for (const id of ['0', '-1', '1e4', 'https://roblox.com', '9007199254740992']) assert.throws(() => validateRobloxScan(id));
  assert.throws(() => validateRobloxScan('9007199254740991', { count: 2 }));
  assert.equal(validateRobloxScan('9007199254740991', { count: 1 }).count, 1);
});

test('filters combine case-insensitive literal keywords, prefix, suffix and exact username length', () => {
  const options = validateRobloxScan('1', { keywords: 'builder, ROB', startsWith: 'ro', endsWith: 'ox', exactLength: 6 });
  assert.equal(matchesRobloxName('Roblox', options), true);
  assert.equal(matchesRobloxName('Roblox2', options), false);
  assert.equal(matchesRobloxName('Builder', options), false);
  assert.equal(matchesRobloxName('Roblox', validateRobloxScan('1', { keywords: '(a+)+$' })), false);
});

test('scan uses a bounded public directory POST and distinguishes unavailable IDs without inventing deletion', async () => {
  const requests = [];
  await withDirectory(async (url, options) => {
    assert.equal(String(url), 'https://users.roblox.com/v1/users');
    assert.equal(options.method, 'POST');
    const body = JSON.parse(options.body); requests.push(body);
    return new Response(JSON.stringify({ data: body.excludeBannedUsers ? [user(1, 'Roblox'), user(2, 'Builder')] : [user(1, 'Roblox'), user(2, 'Builder'), user(3, 'Blocked')] }));
  }, async () => {
    const sources = await runSearch('roblox-batch', '1', {}, tool, base);
    assert.equal(sources.length, 1);
    assert.equal(sources[0].status, 'found');
    assert.equal(sources[0].results.length, 4);
    const [first,, banned, missing] = sources[0].results;
    assert.equal(first.fields.find(f=>f.label==='User ID').value, '1');
    assert.match(banned.fields.find(f=>f.label==='Status').value, /^Excluded/);
    assert.equal(missing.kind, 'unavailable');
    assert.match(missing.description, /deletion is not confirmed/);
    assert.deepEqual(requests.map(r=>r.userIds), [[1,2,3,4], [1,2,3,4]]);
  });
});

test('display toggles work; filters suppress unknown entries and name mismatches', async () => {
  await withDirectory(async () => new Response(JSON.stringify({ data: [user(1, 'Roblox'), user(2, 'Builder')] })), async () => {
    const sources = await runSearch('roblox-batch', '1', {}, tool, { count: 3, keywords: 'rob', includeUnavailable: true, showIds: false, showStatus: false });
    assert.equal(sources[0].results.length, 1);
    assert.equal(sources[0].results[0].fields.some(f=>['User ID','Status'].includes(f.label)), false);
  });
});

test('batch provider failures are unavailable; optional status failures preserve genuine profiles', async () => {
  await withDirectory(async (_url, options) => JSON.parse(options.body).excludeBannedUsers ? new Response('{}', { status: 429 }) : new Response(JSON.stringify({data:[user(1,'Roblox')]})), async () => {
    const sources = await runSearch('roblox-batch', '1', {}, tool, { ...base, count: 1 });
    assert.equal(sources[0].status, 'found');
    assert.equal(sources[0].results[0].fields.find(f=>f.label==='Status').value, 'Status lookup unavailable');
  });
  await withDirectory(async () => new Response('{}', { status: 429 }), async () => {
    const sources = await runSearch('roblox-batch', '1', {}, tool, base);
    assert.equal(sources[0].status, 'unavailable');
    assert.deepEqual(sources[0].results, []);
  });
});

test('an empty directory response produces no matched records even when unavailable slots are requested', async () => {
  await withDirectory(async () => new Response(JSON.stringify({ data: [] })), async () => {
    const sources = await runSearch('roblox-batch', '1', {}, tool, base);
    assert.equal(sources[0].status, 'no_match');
    assert.ok(sources[0].results.every(row=>row.kind==='unavailable'));
  });
});
