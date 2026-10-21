import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { runSearch, validateSearch } from '../server/search.mjs';
import { webResults } from '../server/public.mjs';
import { isPublicAddress, publicUrl, resolveLink } from '../server/resolve.mjs';
import { TOOLS, toolAvailable } from '../server/catalog.mjs';
const withFetch = async (fetcher, operation) => {
  const original = globalThis.fetch;
  globalThis.fetch = fetcher;
  try { return await operation(); } finally { globalThis.fetch = original; }
};

test('public web parses real index markup, unwraps links and rejects irrelevant/site-mismatched hits', async () => {
  const html = `<div class="result"><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.instagram.com%2Fnasa%2F">NASA &amp; Space</a><div class="result__snippet">Official public page</div></div>
  <div class="result"><a class="result__a" href="https://example.com/nasa">wrong host</a></div>
  <div class="result"><a class="result__a" href="https://instagram.com/other">unrelated</a></div>`;
  await withFetch(async () => new Response(html), async () => {
    const records = await webResults('site:instagram.com "nasa"', {}, { site: 'instagram.com', identifier: 'nasa' });
    assert.equal(records.length, 1);
    assert.equal(records[0].title, 'NASA & Space');
    assert.equal(records[0].url, 'https://www.instagram.com/nasa/');
  });
});

test('web search falls back from failed Brave; challenges are not reported as healthy no matches', async () => {
  const calls = [];
  await withFetch(async url => {
    calls.push(String(url));
    if (String(url).includes('brave.com')) return new Response('{}', { status: 401 });
    return new Response('<div class="no-results"></div>');
  }, async () => {
    assert.deepEqual(await webResults('example', { BRAVE_SEARCH_API_KEY: 'synthetic-test-key' }), []);
    assert.equal(calls.length, 2);
  });
  await withFetch(async () => new Response('<form id="challenge-form">captcha</form>'), async () => {
    const sources = await runSearch('web', 'example', {});
    assert.equal(sources[0].status, 'unavailable');
  });
});

test('new inputs validate before searching; provider credentials gate only their own adapters', () => {
  assert.equal(validateSearch('phone', '+1 (202) 555-0123'), '+12025550123');
  assert.throws(() => validateSearch('phone', '123456'));
  assert.equal(validateSearch('discord', 'https://discord.gg/public-server'), 'public-server');
  assert.throws(() => validateSearch('discord', 'https://evil.example/invite/test'));
  assert.throws(() => validateSearch('steam', '../secrets'));
  assert.throws(() => validateSearch('shodan', '127.0.0.1'));
  assert.equal(validateSearch('virustotal', 'EXAMPLE.COM'), 'example.com');
  assert.throws(() => validateSearch('virustotal', 'http://localhost'));
  assert.ok(toolAvailable(TOOLS.find(t => t.id === 'web'), {}));
  assert.ok(!toolAvailable(TOOLS.find(t => t.id === 'virustotal'), {}));
  assert.ok(toolAvailable(TOOLS.find(t => t.id === 'virustotal'), { VIRUSTOTAL_API_KEY: 'test' }));
  assert.ok(!toolAvailable(TOOLS.find(t => t.id === 'vt-content'), { VIRUSTOTAL_API_KEY: 'test' }));
});

test('fixed-endpoint adapters parse certificate, court, Steam, Discord, Shodan, forum and VT data', async () => {
  const fixtures = [
    ['certificate', 'example.com', 'Cert Spotter', [{ dns_names: ['example.com'], cert_sha256: 'a'.repeat(64), issuer: { name: 'Example issuer' } }]],
    ['shodan', '8.8.8.8', 'Shodan InternetDB', { ip: '8.8.8.8', ports: [443], hostnames: ['dns.google'], vulns: ['CVE-2020-0001'] }],
    ['court', 'copyright', 'CourtListener', { results: [{ caseName: 'Public opinion', absolute_url: '/opinion/123/example/', court: 'Example Court', dateFiled: '2024-01-01', opinions: [{ snippet: '<b>Opinion</b> text' }] }] }],
    ['forums', 'open source', 'Hacker News Search', { hits: [{ objectID: '123', author: 'example', title: 'A public discussion' }] }],
    ['discord', 'public', 'Discord public invite', { code: 'public', guild: { id: '123', name: 'Public Server' }, approximate_member_count: 50 }],
    ['virustotal', 'example.com', 'VirusTotal', { data: { id: 'example.com', type: 'domain', attributes: { last_analysis_stats: { malicious: 2 } } } }],
  ];
  for (const [mode, query, name, data] of fixtures) await withFetch(async () => new Response(JSON.stringify(data)), async () => {
    const sources = await runSearch(mode, query, { VIRUSTOTAL_API_KEY: 'test' }, { sources: [name] });
    assert.equal(sources.length, 1);
    assert.equal(sources[0].status, 'found', name);
    assert.ok(sources[0].results[0].url.startsWith('https://'));
  });
  await withFetch(async () => new Response('<profile><steamID64>76561197960435530</steamID64><steamID><![CDATA[Test & Name]]></steamID><summary><![CDATA[<b>Hello</b>]]></summary></profile>'), async () => {
    const data = await runSearch('steam', 'example', {}, { sources: ['Steam Community'] });
    assert.equal(data[0].results[0].title, 'Test & Name');
    assert.equal(data[0].results[0].description, 'Hello');
  });
});

test('provider failures stay unavailable rather than returning made-up records', async () => {
  await withFetch(async () => new Response('{}', { status: 429 }), async () => {
    const data = await runSearch('shodan', '8.8.8.8');
    assert.equal(data[0].status, 'unavailable');
    assert.match(data[0].message, /rate limit/);
    assert.deepEqual(data[0].results, []);
  });
});

test('link resolution rejects private, reserved, mapped and non-HTTP destinations', () => {
  for (const ip of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '100.64.0.1', '192.0.2.1', '198.51.100.1', '203.0.113.1', '::1', '::ffff:127.0.0.1', '2001:db8::1', 'fc00::1', 'fe80::1']) assert.equal(isPublicAddress(ip), false, ip);
  for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) assert.equal(isPublicAddress(ip), true, ip);
  for (const url of ['file:///etc/passwd', 'http://127.1', 'http://2130706433', 'http://169.254.169.254', 'http://example.com:8080', 'http://user:pass@example.com', 'http://localhost']) assert.throws(() => publicUrl(url), url);
});

test('resolver pins a checked DNS answer and rechecks every redirect, blocking rebinding and mixed DNS', async () => {
  let requests = 0;
  const requestHttps = (_url, options, callback) => {
    requests++;
    options.lookup('public.example', { all: true }, (_error, addresses) => assert.deepEqual(addresses, [{ address: '8.8.8.8', family: 4 }]));
    const emitter = new EventEmitter();
    emitter.end = () => callback({ statusCode: 302, headers: { location: 'https://private.example/metadata' }, destroy() {} });
    return emitter;
  };
  await assert.rejects(resolveLink('https://public.example', { requestHttps, lookupHost: async host => [{ address: host === 'public.example' ? '8.8.8.8' : '10.0.0.1', family: 4 }] }), /private or reserved/);
  assert.equal(requests, 1);
  await assert.rejects(resolveLink('https://public.example', { requestHttps, lookupHost: async () => [{ address: '8.8.8.8', family: 4 }, { address: '127.0.0.1', family: 4 }] }), /private or reserved/);
  assert.equal(requests, 1);
});

test('the bundled photo parser reads coordinates from a synthetic GPS fixture', async () => {
  const { default: { parse } } = await import('exifr');
  const { readFile } = await import('node:fs/promises');
  const data = await parse(await readFile(new URL('./fixtures/gps.jpg', import.meta.url)));
  assert.ok(Math.abs(data.latitude - 40.748333333333335) < 1e-8);
  assert.ok(Math.abs(data.longitude - -73.98555555555555) < 1e-8);
});

test('Roblox enrichment returns actual records even if optional count endpoints fail', async () => {
  await withFetch(async (url) => {
    if (String(url).includes('/usernames/users')) return new Response(JSON.stringify({ data: [{ id: 123, name: 'example', displayName: 'Example' }] }));
    if (String(url).includes('/v1/users/123') && !String(url).includes('friends.roblox.com')) return new Response(JSON.stringify({ created: '2020-01-01', description: 'Public bio' }));
    return new Response('{}', { status: 429 });
  }, async () => {
    const data = await runSearch('username', 'example', {}, { sources: ['Roblox'] });
    assert.equal(data[0].status, 'found');
    assert.equal(data[0].results[0].title, 'Example');
    assert.equal(data[0].results[0].description, 'Public bio');
    assert.equal(data[0].results[0].fields.find(f=>f.label==='Joined').value, '2020-01-01');
  });
});

test('threat research retains independent public family records when the group API fails', async () => {
  await withFetch(async url => String(url).includes('malpedia') ? new Response(JSON.stringify(['win.lockbit', 'elf.lockbit', 'win.other'])) : new Response('{}', { status: 503 }), async () => {
    const sources = await runSearch('ransomware', 'lockbit', {});
    assert.equal(sources.find(s=>s.name==='Ransomware.live').status, 'unavailable');
    const fallback = sources.find(s=>s.name==='Malpedia');
    assert.equal(fallback.status, 'found');
    assert.equal(fallback.results.length, 2);
    assert.equal(fallback.results[0].fields[0].value, 'Malware family');
    assert.equal(fallback.results[0].url, 'https://malpedia.caad.fkie.fraunhofer.de/details/win.lockbit');
  });
});
