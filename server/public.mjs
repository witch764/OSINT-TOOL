import { load } from 'cheerio';
import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import { json, text, field, result, strip } from './fetch.mjs';
import { resolveLink } from './resolve.mjs';

const array = value => Array.isArray(value) ? value : [];
const hostsMatch = (url, site) => {
  try { const host = new URL(url).hostname; return !site || host === site || host.endsWith('.' + site); } catch { return false; }
};
const normalized = value => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
export async function webResults(query, env, { site, identifier } = {}) {
  let records;
  let provider;
  if (env.BRAVE_SEARCH_API_KEY) {
    try {
      const data = await json(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=15`, { headers: { 'X-Subscription-Token': env.BRAVE_SEARCH_API_KEY } });
      if (!data?.web || !Array.isArray(data.web.results)) throw new Error('Unexpected web response');
      records = data.web.results.map(r => ({ title: strip(r.title), url: r.url, description: strip(r.description) }));
      provider = 'Brave Search';
    } catch { /* A failed optional provider falls back to the public index. */ }
  }
  if (!records) {
    const html = await text(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, { headers: { Accept: 'text/html' } });
    const $ = load(html || '');
    if (!$('.result__a').length && !$('.no-results, .no-results__message').length) throw new Error('Search index unavailable or challenge required');
    records = $('.result').toArray().flatMap(node => {
      const anchor = $(node).find('.result__a').first();
      const href = anchor.attr('href');
      if (!href) return [];
      let url;
      try {
        const parsed = new URL(href, 'https://duckduckgo.com');
        url = parsed.hostname.endsWith('duckduckgo.com') && parsed.pathname === '/l/' ? parsed.searchParams.get('uddg') : parsed.href;
      } catch { return []; }
      return [{ title: anchor.text(), url, description: $(node).find('.result__snippet').text() }];
    });
    provider = 'DuckDuckGo public index';
  }
  const seen = new Set();
  return records.filter(r => {
    if (!r.url || !/^https?:\/\//i.test(r.url) || !hostsMatch(r.url, site) || seen.has(r.url)) return false;
    // Search engines may ignore exact-match and site operators. Don't present unrelated hits as matches.
    if (identifier && !normalized(`${r.title} ${r.description} ${r.url}`).includes(normalized(identifier))) return false;
    seen.add(r.url);
    return true;
  }).slice(0, 15).map(r => result('Public Web', r.title, r.url, [field('Index', provider), field('Match type', 'Indexed public page; verify the original source')], r.description));
}

let kevCache;
let groupCache;
let familyCache;
const addressCache = new Map();
export function extraSearch(add, mode, query, env, tool) {
  if (mode === 'username') {
    if (tool?.id === 'telegram') add('Telegram', async () => {
      const html = await text(`https://t.me/${encodeURIComponent(query)}`, { headers: { Accept: 'text/html' } });
      if (html === null) return [];
      const $ = load(html);
      const title = $('.tgme_page_title').text().trim();
      if (!title) return [];
      return [result('Telegram', title, `https://t.me/${encodeURIComponent(query)}`, [field('Handle', '@' + query), field('Public audience', $('.tgme_page_extra').text().trim() || 'Not published')], $('.tgme_page_description').text().trim() || 'Public Telegram preview.')];
    });
    add('Chess.com', async () => {
      const d = await json(`https://api.chess.com/pub/player/${encodeURIComponent(query.toLowerCase())}`);
      return d?.username ? [result('Chess.com', d.name || d.username, `https://www.chess.com/member/${encodeURIComponent(d.username)}`, [field('Username', d.username), field('Country', d.country?.split('/').at(-1)), field('Player ID', d.player_id), field('Followers', d.followers), field('Status', d.status)], 'Public Chess.com profile. A matching handle does not establish identity.')] : [];
    });
    add('Lichess', async () => {
      const d = await json(`https://lichess.org/api/user/${encodeURIComponent(query)}`);
      return d?.id ? [result('Lichess', d.username, `https://lichess.org/@/${encodeURIComponent(d.id)}`, [field('Username', d.username), field('Games', d.count?.all), field('Title', d.title), field('Joined', d.createdAt ? new Date(d.createdAt).toISOString() : undefined)], d.profile?.bio || 'Public Lichess profile.')] : [];
    });
    add('DEV Community', async () => {
      const d = await json(`https://dev.to/api/users/by_username?url=${encodeURIComponent(query)}`);
      return d?.username ? [result('DEV Community', d.name || d.username, `https://dev.to/${encodeURIComponent(d.username)}`, [field('Username', d.username), field('Joined', d.joined_at), field('Location', d.location), field('Website', d.website_url)], d.summary || 'Public DEV Community profile.')] : [];
    });
  }
  if (mode === 'certificate') add('Cert Spotter', async () => {
    const data = await json(`https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(query)}&include_subdomains=true&expand=dns_names&expand=issuer`);
    if (!Array.isArray(data)) throw new Error('Unexpected certificate response');
    return data.slice(0, 30).map(d => result('Cert Spotter', d.dns_names?.[0] || query, `https://crt.sh/?sha256=${encodeURIComponent(d.cert_sha256)}`, [field('Names', d.dns_names?.join(', ')), field('Issuer', d.issuer?.name), field('Valid from', d.not_before), field('Valid until', d.not_after), field('SHA-256', d.cert_sha256)], 'Public certificate transparency record from SSLMate Cert Spotter.'));
  });
  if (mode === 'shodan' || mode === 'ip') add('Shodan InternetDB', async () => {
    const d = await json(`https://internetdb.shodan.io/${encodeURIComponent(query)}`);
    return d ? [result('Shodan InternetDB', d.ip, `https://www.shodan.io/host/${encodeURIComponent(query)}`, [field('Observed ports', array(d.ports).join(', ') || 'None listed'), field('Hostnames', array(d.hostnames).join(', ') || 'None listed'), field('CPEs', array(d.cpes).join(', ') || 'None listed'), field('Reported CVEs', array(d.vulns).join(', ') || 'None listed'), field('Tags', array(d.tags).join(', ') || 'None listed')], 'Existing public Shodan observations. Records may be stale; open ports and CVEs are not verified by WitchSearch.')] : [];
  });
  if (mode === 'ip') add('IPinfo', async () => {
    const d = await json(`https://ipinfo.io/${encodeURIComponent(query)}/json`);
    if (!d || d.error || !d.ip) throw new Error('IPinfo unavailable');
    return [result('IPinfo', d.ip, `https://ipinfo.io/${encodeURIComponent(query)}`, [field('Organization', d.org), field('Country', d.country), field('Region', d.region), field('City', d.city), field('Approximate coordinates', d.loc), field('Timezone', d.timezone)], 'Approximate network location from IPinfo. It may reflect a VPN, hosting provider, or ISP location and cannot locate a person.')];
  });
  if (mode === 'phone') add('Phone numbering plan', async () => {
    const phone = parsePhoneNumberFromString(query);
    return [result('Phone numbering plan', phone.formatInternational(), `https://www.itu.int/oth/T0202.aspx?parent=T0202`, [field('E.164', phone.number), field('Country', phone.country || 'Shared or non-geographic calling code'), field('Calling code', '+' + phone.countryCallingCode), field('Number type', phone.getType()), field('National format', phone.formatNational())], 'Number format and country from the numbering plan. Does not verify that a number is active or identify its subscriber. Public mentions are searched separately.')];
  });
  if (mode === 'address') add('OpenStreetMap', async () => {
    let data = addressCache.get(query.toLowerCase());
    if (!data) {
      data = await json(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&addressdetails=1&limit=5`, { headers: { 'User-Agent': 'WitchSearch/1.0 (https://witchsearch.netlify.app)', 'Accept-Language': 'en' } });
      if (!Array.isArray(data)) throw new Error('Unexpected map response');
      if (addressCache.size >= 200) addressCache.clear();
      addressCache.set(query.toLowerCase(), data);
    }
    return data.map(d => result('OpenStreetMap', d.display_name, `https://www.openstreetmap.org/?mlat=${encodeURIComponent(d.lat)}&mlon=${encodeURIComponent(d.lon)}#map=17/${encodeURIComponent(d.lat)}/${encodeURIComponent(d.lon)}`, [field('Latitude', d.lat), field('Longitude', d.lon), field('Category', d.type), field('Country', d.address?.country), field('Postcode', d.address?.postcode)], 'Map location, not resident identity. © OpenStreetMap contributors, ODbL.'));
  });
  if (mode === 'court') add('CourtListener', async () => {
    const data = await json(`https://www.courtlistener.com/api/rest/v4/search/?q=${encodeURIComponent(query)}&type=o&order_by=score%20desc`);
    if (!Array.isArray(data?.results)) throw new Error('Unexpected court response');
    return data.results.slice(0, 15).map(d => result('CourtListener', d.caseName, new URL(d.absolute_url, 'https://www.courtlistener.com').href, [field('Court', d.court), field('Filed', d.dateFiled), field('Docket', d.docketNumber), field('Citations', array(d.citation).join('; '))], strip(d.opinions?.[0]?.snippet || d.snippet || 'Public court opinion. Name matches do not establish identity or the outcome of a case.')));
  });
  if (mode === 'forums') add('Hacker News Search', async () => {
    const data = await json(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=15`);
    if (!Array.isArray(data?.hits)) throw new Error('Unexpected forum response');
    return data.hits.map(d => result('Hacker News Search', d.title || d.story_title || `Comment by ${d.author}`, `https://news.ycombinator.com/item?id=${encodeURIComponent(d.objectID)}`, [field('Author', d.author), field('Posted', d.created_at), field('Points', d.points), field('Comments', d.num_comments)], strip(d.comment_text || d.story_text || d.url || 'Public Hacker News discussion.')));
  });
  if (mode === 'steam') add('Steam Community', async () => {
    const id = /^\d{17}$/.test(query) ? 'profiles' : 'id';
    const html = await text(`https://steamcommunity.com/${id}/${encodeURIComponent(query)}?xml=1`, { headers: { Accept: 'application/xml' } });
    if (html === null) return [];
    const $ = load(html, { xml: true });
    if (!$('profile steamID64').length) {
      if ($('response error').length) return [];
      throw new Error('Steam returned an unexpected response');
    }
    return [result('Steam Community', $('profile > steamID').text(), `https://steamcommunity.com/profiles/${$('profile > steamID64').text()}`, ['steamID64', 'privacyState', 'onlineState', 'memberSince', 'location', 'vacBanned', 'tradeBanState'].map(k => field(k, $('profile > ' + k).text() || undefined)), strip($('profile > summary').text()))];
  });
  if (mode === 'discord') add('Discord public invite', async () => {
    const data = await json(`https://discord.com/api/v10/invites/${encodeURIComponent(query)}?with_counts=true`);
    if (!data) return [];
    if (!data.guild?.id) throw new Error('Invite has no public server information');
    return [result('Discord public invite', data.guild.name, `https://discord.gg/${encodeURIComponent(data.code)}`, [field('Server ID', data.guild.id), field('Approximate members', data.approximate_member_count), field('Approximate online', data.approximate_presence_count), field('Channel', data.channel?.name), field('Expires', data.expires_at || 'Not specified')], data.guild.description || 'Public invite preview. Does not reveal private users, messages, or server membership.')];
  });
  if (mode === 'link') add('Link Resolver', async () => {
    const data = await resolveLink(query);
    return [result('Link Resolver', new URL(data.url).hostname, data.url, data.hops.map((hop, i) => field(`Step ${i + 1} · HTTP ${hop.status}`, hop.url)), 'Resolved HTTP redirects without running scripts or downloading the page. JavaScript and login redirects are not followed.')];
  });
  if (mode === 'cve') add('CISA KEV', async () => {
    if (!kevCache || kevCache.expires < Date.now()) {
      const data = await json('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', {}, 4_000_000);
      if (!Array.isArray(data?.vulnerabilities)) throw new Error('Unexpected KEV response');
      kevCache = { data, expires: Date.now() + 3600000 };
    }
    const d = kevCache.data.vulnerabilities.find(v => v.cveID === query);
    return [result('CISA KEV', d?.vulnerabilityName || `${query}: not listed in KEV`, 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog', [field('Listed as exploited', d ? 'Yes' : 'No entry in this catalog version'), field('Catalog version', kevCache.data.catalogVersion), ...(d ? [field('Vendor / product', `${d.vendorProject} / ${d.product}`), field('Date added', d.dateAdded), field('Remediation due', d.dueDate), field('Ransomware use', d.knownRansomwareCampaignUse), field('Required action', d.requiredAction)] : [])], d?.shortDescription || 'Absence from KEV does not mean a vulnerability is safe or unexploited.')];
  });
  if (mode === 'ransomware') add('Malpedia', async () => {
    if (!familyCache || familyCache.expires < Date.now()) {
      const data = await json('https://malpedia.caad.fkie.fraunhofer.de/api/list/families');
      if (!Array.isArray(data) || !data.every(id => typeof id === 'string')) throw new Error('Unexpected malware catalog response');
      familyCache = { data, expires: Date.now() + 3600000 };
    }
    return familyCache.data.filter(id => normalized(id).includes(normalized(query))).slice(0, 15).map(id => result('Malpedia', id, `https://malpedia.caad.fkie.fraunhofer.de/details/${encodeURIComponent(id)}`, [field('Record type', 'Malware family'), field('Catalog identifier', id), field('Platform', id.split('.')[0])], 'Public malware-family catalog match. A family name is not proof of threat-group attribution. Open the source for research and references; no malware samples are downloaded.'));
  });
  if (mode === 'ransomware') add('Ransomware.live', async () => {
    if (!groupCache || groupCache.expires < Date.now()) {
      const data = await json('https://api.ransomware.live/v2/groups', {}, 4_000_000);
      if (!Array.isArray(data)) throw new Error('Unexpected threat intelligence response');
      groupCache = { data, expires: Date.now() + 3600000 };
    }
    return groupCache.data.filter(g => normalized(`${g.name} ${g.altname || ''}`).includes(normalized(query))).slice(0, 15).map(g => result('Ransomware.live', g.name, `https://www.ransomware.live/group/${encodeURIComponent(g.name)}`, [field('Also known as', g.altname), field('First observed', g.first_seen || g.added_date), field('Last observed', g.last_seen), field('Description updated', g.last_update)], strip(g.description || 'Public threat group summary; no leaked files are retrieved.')));
  });
  if (mode === 'virustotal' || mode === 'vt-content') add('VirusTotal', async () => {
    if (!env.VIRUSTOTAL_API_KEY) throw new Error('VirusTotal key required');
    const base = 'https://www.virustotal.com/api/v3/';
    const options = { headers: { 'x-apikey': env.VIRUSTOTAL_API_KEY } };
    let data;
    if (mode === 'vt-content') data = array((await json(`${base}intelligence/search?query=${encodeURIComponent(query)}&limit=10`, options))?.data);
    else {
      const type = /^[a-f0-9]{32}$|^[a-f0-9]{40}$|^[a-f0-9]{64}$/i.test(query) ? 'files' : /^\d+\.\d+\.\d+\.\d+$/.test(query) ? 'ip_addresses' : 'domains';
      const d = await json(`${base}${type}/${encodeURIComponent(query)}`, options);
      data = d?.data ? [d.data] : [];
    }
    return data.map(d => {
      const a = d.attributes || {};
      const type = { file: 'file', domain: 'domain', ip_address: 'ip-address' }[d.type];
      if (!type) throw new Error('Unexpected VirusTotal object');
      return result('VirusTotal', a.meaningful_name || d.id, `https://www.virustotal.com/gui/${type}/${encodeURIComponent(d.id)}`, [field('Type', d.type), field('Malicious detections', a.last_analysis_stats?.malicious), field('Suspicious detections', a.last_analysis_stats?.suspicious), field('Reputation', a.reputation), field('Last analyzed', a.last_analysis_date ? new Date(a.last_analysis_date * 1000).toISOString() : undefined)], 'Existing VirusTotal report. No file is uploaded, scanned, or downloaded.');
    });
  });
}
