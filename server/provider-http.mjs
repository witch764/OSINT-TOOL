// Only trusted adapters supply URLs/headers. Do not expose this as a proxy route.
export async function providerJson(name, url, headers, { notFoundIsEmpty = false } = {}) {
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'WitchSearch/1.0', ...headers }, redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    await response.body?.cancel();
    if (response.status === 404 && notFoundIsEmpty) return [];
    const reason = response.status === 401 ? 'API key rejected; the site owner must check the provider key.'
      : response.status === 403 ? 'access denied; check API permissions, subscription, and quota.'
      : response.status === 429 ? 'rate limit reached; wait before trying again.' : 'provider unavailable; try again later.';
    throw Object.assign(new Error(`${name}: ${reason}`), { publicMessage: true });
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Missing response');
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 1_000_000) throw new Error('Response exceeds limit');
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel(); }
  return JSON.parse(Buffer.concat(chunks).toString());
}
export async function providerSource(name, operation) {
  const start = Date.now();
  try {
    const { results, found = results.length > 0 } = await operation();
    return { name, status: found ? 'found' : 'no_match', results, duration: Date.now() - start };
  } catch (error) {
    return { name, status: 'unavailable', results: [], duration: Date.now() - start, message: error.publicMessage ? error.message : `${name}: request failed or the provider returned an unexpected response. No conclusion can be drawn.` };
  }
}
