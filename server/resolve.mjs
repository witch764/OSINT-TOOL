import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import ipaddr from 'ipaddr.js';

export function isPublicAddress(address) {
  try {
    const ip = ipaddr.process(address);
    return ip.range() === 'unicast' && (ip.kind() === 'ipv4' || ip.match(ipaddr.parse('2000::'), 3));
  } catch { return false; }
}
export function publicUrl(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port || !url.hostname.includes('.'))
    throw new Error('Enter a public HTTP or HTTPS URL without credentials or a custom port.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (ipaddr.isValid(host) && !isPublicAddress(host)) throw new Error('Private and reserved addresses cannot be resolved.');
  return url;
}
export async function resolveLink(value, { lookupHost = lookup, requestHttp = httpRequest, requestHttps = httpsRequest } = {}) {
  let url = publicUrl(value);
  const visited = new Set();
  const hops = [];
  const signal = AbortSignal.timeout(10000);
  for (let i = 0; i < 6; i++) {
    signal.throwIfAborted();
    if (visited.has(url.href)) throw new Error('Redirect loop detected.');
    visited.add(url.href);
    // Check every answer and pin the connection to a checked IP to prevent DNS rebinding.
    const answers = await new Promise((resolve, reject) => {
      const abort = () => reject(new Error('DNS lookup timed out'));
      signal.addEventListener('abort', abort, { once: true });
      lookupHost(url.hostname, { all: true, verbatim: true }).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
    });
    signal.throwIfAborted();
    if (!answers.length || answers.some(a => !isPublicAddress(a.address))) throw new Error('Destination resolves to a private or reserved address.');
    const chosen = answers[0];
    const response = await new Promise((resolve, reject) => {
      const request = (url.protocol === 'https:' ? requestHttps : requestHttp)(url, {
        method: 'GET', signal,
        agent: false,
        headers: { 'User-Agent': 'WitchSearch/1.0', Accept: 'text/html' },
        lookup: (_host, options, callback) => callback(null, options.all ? [chosen] : chosen.address, chosen.family),
      }, res => {
        resolve({ status: res.statusCode, location: res.headers.location });
        res.destroy();
      });
      request.on('error', reject);
      request.end();
    });
    hops.push({ url: url.href, status: response.status });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (!response.location) throw new Error('Redirect has no destination.');
      url = publicUrl(new URL(response.location, url).href);
    } else {
      if (response.status >= 400) throw new Error(`Destination returned HTTP ${response.status}`);
      return { url: url.href, hops };
    }
  }
  throw new Error('Too many redirects.');
}
