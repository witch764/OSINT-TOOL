import { isIP } from "node:net";
import { domainToASCII } from "node:url";

export const MODES = [
  "username",
  "email",
  "domain",
  "ip",
  "web",
  "certificate",
  "wayback",
  "urlscan",
  "cve",
  "appstore",
  "crypto",
];
export function validateSearch(mode, value) {
  if (!MODES.includes(mode) || typeof value !== "string")
    throw new Error("Choose a valid search type.");
  const query = value.trim();
  if (query.length < 2 || query.length > 160 || /[\x00-\x1f]/.test(query))
    throw new Error("Enter a search between 2 and 160 characters.");
  if (mode === "username" && !/^[a-zA-Z0-9_.-]{2,39}$/.test(query))
    throw new Error(
      "Use a username with 2–39 letters, numbers, dots, dashes, or underscores.",
    );
  if (mode === "ip" && isIP(query) !== 4)
    throw new Error("Enter an IPv4 address, for example 8.8.8.8.");
  if (mode === "ip") {
    const [a, b, c] = query.split(".").map(Number);
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    )
      throw new Error("Enter a public IPv4 address.");
  }
  if (mode === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query))
    throw new Error("Enter a valid email address.");
  if (["domain", "email", "certificate", "wayback", "urlscan"].includes(mode)) {
    const rawDomain = mode === "email" ? query.split("@")[1] : query;
    if (/[\/\\:@?#%\s]/.test(rawDomain))
      throw new Error("Enter a domain without a URL, port, or path.");
    const domain = domainToASCII(rawDomain).toLowerCase();
    if (
      domain.length > 253 ||
      !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)
    )
      throw new Error(
        "Enter a domain such as example.com, without a URL or path.",
      );
    return mode === "email" ? `${query.split("@")[0]}@${domain}` : domain;
  }
  if (mode === "cve" && !/^CVE-\d{4}-\d{4,19}$/i.test(query))
    throw new Error("Enter a CVE ID, for example CVE-2024-3094.");
  if (
    mode === "crypto" &&
    !/^(?:[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[ac-hj-np-z02-9]{11,87})$/.test(
      query,
    )
  )
    throw new Error("Enter a Bitcoin mainnet address.");
  return mode === "cve" ? query.toUpperCase() : query;
}

async function json(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    redirect: "error",
    signal: AbortSignal.timeout(6500),
    headers: {
      Accept: "application/json",
      "User-Agent": "WitchSearch/1.0 (public-source-research)",
      ...options.headers,
    },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
  const reader = response.body.getReader();
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 1_000_000) throw new Error("Source response exceeded limit");
      chunks.push(Buffer.from(value));
    }
  } finally {
    await reader.cancel();
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}
const short = (value) =>
  value == null ? "Not published" : String(value).slice(0, 1500);
const field = (label, value) => ({ label, value: short(value) });
const result = (source, title, url, fields, description = "") => ({
  source,
  title: short(title),
  url,
  fields,
  description: short(description),
});
async function source(name, operation) {
  const start = Date.now();
  try {
    const results = await operation();
    return {
      name,
      status: results.length ? "found" : "no_match",
      duration: Date.now() - start,
      results,
    };
  } catch (error) {
    return {
      name,
      status: "unavailable",
      duration: Date.now() - start,
      results: [],
      message:
        error.name === "TimeoutError"
          ? "Source timed out"
          : "Source unavailable or rate limited",
    };
  }
}
function rdapFields(data) {
  return [
    field("Handle", data.handle),
    field("Name", data.name || data.ldhName),
    field("Status", data.status?.join(", ")),
    ...(data.events || [])
      .slice(0, 5)
      .map((e) => field(e.eventAction, e.eventDate)),
    field("Nameservers", data.nameservers?.map((n) => n.ldhName).join(", ")),
  ];
}
const bootstrapCache = new Map();
const ipv4Number = (ip) =>
  ip.split(".").reduce((value, octet) => value * 256 + Number(octet), 0) >>> 0;
async function rdapLookup(query, kind) {
  // IANA publishes the authoritative registry endpoints. Calling them directly avoids
  // relying on an intermediary redirect service and handles new TLDs automatically.
  const bootstrapType = kind === "ip" ? "ipv4" : "dns";
  let cached = bootstrapCache.get(bootstrapType);
  if (!cached || cached.expires < Date.now()) {
    const data = await json(`https://data.iana.org/rdap/${bootstrapType}.json`);
    if (!Array.isArray(data?.services))
      throw new Error("Registry directory unavailable");
    cached = { data, expires: Date.now() + 86400000 };
    bootstrapCache.set(bootstrapType, cached);
  }
  const services = cached.data.services;
  const matches = services.filter(([identifiers]) =>
    identifiers.some((identifier) => {
      if (kind === "domain") return identifier === query.split(".").at(-1);
      const [network, prefix] = identifier.split("/");
      const bits = Number(prefix);
      const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
      return (
        (ipv4Number(query) & mask) >>> 0 === (ipv4Number(network) & mask) >>> 0
      );
    }),
  );
  const endpoint = matches
    .flatMap((service) => service[1])
    .find((value) => value.startsWith("https://"));
  if (!endpoint) return [];
  const allowedHosts = new Set(
    services
      .flatMap((service) => service[1])
      .filter((value) => value.startsWith("https://"))
      .map((value) => new URL(value).hostname),
  );
  const controller = AbortSignal.timeout(6500);
  let url = `${endpoint.replace(/\/$/, "")}/${kind}/${encodeURIComponent(query)}`;
  for (let i = 0; i < 4; i++) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: controller,
      headers: { Accept: "application/rdap+json" },
    });
    if (response.status >= 300 && response.status < 400) {
      const next = new URL(response.headers.get("location"), url);
      if (
        next.protocol !== "https:" ||
        next.port ||
        next.username ||
        next.password ||
        !allowedHosts.has(next.hostname)
      )
        throw new Error("Unsupported registry redirect");
      url = next.href;
      continue;
    }
    if (response.status === 404) return [];
    if (!response.ok) throw new Error("Registry unavailable");
    const data = await readRdap(response);
    return [
      result(
        "RDAP",
        data.ldhName || data.name || query,
        url,
        kind === "ip"
          ? [
              ...rdapFields(data).slice(0, 3),
              field("Range", `${data.startAddress} – ${data.endAddress}`),
              field("Country", data.country),
              field("IP version", data.ipVersion),
            ]
          : rdapFields(data),
        "Registration data published by the authoritative registry.",
      ),
    ];
  }
  throw new Error("Too many registry redirects");
}
async function readRdap(response) {
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 1_000_000) throw new Error("Response too large");
      chunks.push(Buffer.from(part.value));
    }
  } finally {
    await reader.cancel();
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}
export async function runSearch(mode, query, env = process.env, tool = null) {
  const tasks = [];
  const add = (name, op) => {
    if (!tool?.sources || tool.sources.includes(name))
      tasks.push(source(name, op));
  };
  if (mode === "username") {
    const escaped = encodeURIComponent(query);
    add("GitHub", async () => {
      const d = await json(`https://api.github.com/users/${escaped}`);
      return d
        ? [
            result(
              "GitHub",
              d.name || d.login,
              `https://github.com/${encodeURIComponent(d.login)}`,
              [
                field("Username", d.login),
                field("Public repositories", d.public_repos),
                field("Followers", d.followers),
                field("Location", d.location),
                field("Joined", d.created_at),
              ],
              d.bio || "Public GitHub profile.",
            ),
          ]
        : [];
    });
    add("GitLab", async () => {
      const data = await json(
        `https://gitlab.com/api/v4/users?username=${escaped}`,
      );
      return (data || [])
        .filter((d) => d.username.toLowerCase() === query.toLowerCase())
        .map((d) =>
          result(
            "GitLab",
            d.name || d.username,
            `https://gitlab.com/${encodeURIComponent(d.username)}`,
            [field("Username", d.username), field("Account state", d.state)],
            "Public GitLab profile.",
          ),
        );
    });
    add("Hacker News", async () => {
      const d = await json(
        `https://hacker-news.firebaseio.com/v0/user/${escaped}.json`,
      );
      return d
        ? [
            result(
              "Hacker News",
              d.id,
              `https://news.ycombinator.com/user?id=${escaped}`,
              [
                field("Karma", d.karma),
                field("Joined", new Date(d.created * 1000).toISOString()),
                field("Submissions", d.submitted?.length || 0),
              ],
              "Public Hacker News account.",
            ),
          ]
        : [];
    });
    add("Roblox", async () => {
      const d = await json("https://users.roblox.com/v1/usernames/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: [query], excludeBannedUsers: true }),
      });
      return (d?.data || []).map((u) =>
        result(
          "Roblox",
          u.displayName || u.name,
          `https://www.roblox.com/users/${u.id}/profile`,
          [field("Username", u.name), field("User ID", u.id)],
          "Public Roblox profile.",
        ),
      );
    });

    add("Reddit", async () => {
      const d = await json(`https://www.reddit.com/user/${escaped}/about.json`);
      const u = d?.data;
      return u?.name
        ? [
            result(
              "Reddit",
              u.name,
              `https://www.reddit.com/user/${encodeURIComponent(u.name)}/`,
              [
                field("Post karma", u.link_karma),
                field("Comment karma", u.comment_karma),
                field("Joined", new Date(u.created_utc * 1000).toISOString()),
              ],
              "Public Reddit profile.",
            ),
          ]
        : [];
    });
  }
  if (mode === "domain" || mode === "email") {
    const domain = mode === "email" ? query.split("@")[1] : query;
    add("Google DNS", async () => {
      const records = await Promise.all(
        ["A", "AAAA", "MX", "NS", "TXT"].map(async (type) => {
          const data = await json(
            `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`,
          );
          if (!data || ![0, 3].includes(data.Status))
            throw new Error("DNS lookup failed");
          return { type, answers: data.Answer || [] };
        }),
      );
      const fields = records.flatMap((r) =>
        r.answers.slice(0, 12).map((a) => field(r.type, a.data)),
      );
      return fields.length
        ? [
            result(
              "Google DNS",
              domain,
              `https://dns.google/query?name=${encodeURIComponent(domain)}`,
              fields,
              mode === "email"
                ? "Mail domain infrastructure. DNS records do not confirm that this mailbox exists or identify its owner."
                : "Live public DNS records.",
            ),
          ]
        : [];
    });
    add("RDAP", () => rdapLookup(domain, "domain"));
  }
  if (mode === "ip") {
    add("RDAP", () => rdapLookup(query, "ip"));
    add("Google DNS", async () => {
      const reverse = query.split(".").reverse().join(".") + ".in-addr.arpa";
      const d = await json(
        `https://dns.google/resolve?name=${reverse}&type=PTR`,
      );
      if (!d || ![0, 3].includes(d.Status))
        throw new Error("DNS lookup failed");
      return d.Answer?.length
        ? [
            result(
              "Google DNS",
              query,
              `https://dns.google/query?name=${reverse}&type=PTR`,
              d.Answer.map((a) => field("PTR", a.data)),
              "Public reverse DNS records.",
            ),
          ]
        : [];
    });
  }

  if (mode === "certificate")
    add("crt.sh", async () => {
      const data = await json(
        `https://crt.sh/?q=${encodeURIComponent("%." + query)}&output=json`,
      );
      const unique = [
        ...new Map((data || []).map((d) => [d.id, d])).values(),
      ].slice(0, 30);
      return unique.map((d) =>
        result(
          "crt.sh",
          d.common_name,
          `https://crt.sh/?id=${d.id}`,
          [
            field("Names", d.name_value),
            field("Issuer", d.issuer_name),
            field("Valid from", d.not_before),
            field("Valid until", d.not_after),
          ],
          "Public certificate transparency record.",
        ),
      );
    });
  if (mode === "wayback")
    add("Internet Archive", async () => {
      const data = await json(
        `https://archive.org/wayback/available?url=${encodeURIComponent(query)}`,
      );
      const d = data?.archived_snapshots?.closest;
      return d?.available
        ? [
            result(
              "Internet Archive",
              query,
              d.url.replace(/^http:/, "https:"),
              [
                field("Snapshot timestamp", d.timestamp),
                field("HTTP status", d.status),
              ],
              "Nearest available public archived snapshot.",
            ),
          ]
        : [];
    });
  if (mode === "urlscan")
    add("URLScan", async () => {
      const data = await json(
        `https://urlscan.io/api/v1/search/?q=${encodeURIComponent("domain:" + query)}&size=15`,
      );
      return (data?.results || []).map((d) =>
        result(
          "URLScan",
          d.page?.title || d.page?.domain || query,
          `https://urlscan.io/result/${encodeURIComponent(d._id)}/`,
          [
            field("Domain", d.page?.domain),
            field("IP", d.page?.ip),
            field("Country", d.page?.country),
            field("Observed", d.task?.time),
          ],
          "Existing public scan observation.",
        ),
      );
    });
  if (mode === "cve")
    add("CVE Program", async () => {
      const d = await json(`https://cveawg.mitre.org/api/cve/${query}`);
      if (!d) return [];
      const cna = d.containers?.cna;
      return [
        result(
          "CVE Program",
          d.cveMetadata?.cveId || query,
          `https://www.cve.org/CVERecord?id=${query}`,
          [
            field("State", d.cveMetadata?.state),
            field("Published", d.cveMetadata?.datePublished),
            field(
              "Affected products",
              cna?.affected?.map((a) => `${a.vendor}: ${a.product}`).join(", "),
            ),
          ],
          cna?.descriptions?.find((d) => d.lang === "en")?.value ||
            "Published CVE record.",
        ),
      ];
    });
  if (mode === "appstore")
    add("Apple App Store", async () => {
      const d = await json(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=software&limit=12`,
      );
      return (d?.results || []).map((a) =>
        result(
          "Apple App Store",
          a.trackName,
          a.trackViewUrl,
          [
            field("Developer", a.artistName),
            field("Bundle ID", a.bundleId),
            field("Version", a.version),
            field("Released", a.releaseDate),
          ],
          a.description?.slice(0, 250),
        ),
      );
    });
  if (mode === "crypto")
    add("Blockstream", async () => {
      const d = await json(
        `https://blockstream.info/api/address/${encodeURIComponent(query)}`,
      );
      return d
        ? [
            result(
              "Blockstream",
              query,
              `https://blockstream.info/address/${encodeURIComponent(query)}`,
              [
                field(
                  "Confirmed balance (BTC)",
                  (
                    (d.chain_stats.funded_txo_sum -
                      d.chain_stats.spent_txo_sum) /
                    1e8
                  ).toFixed(8),
                ),
                field("Confirmed transactions", d.chain_stats.tx_count),
                field("Unconfirmed transactions", d.mempool_stats.tx_count),
              ],
              "Public Bitcoin ledger data. Does not identify the address owner.",
            ),
          ]
        : [];
    });
  if (
    env.BRAVE_SEARCH_API_KEY &&
    (!tool?.sources || tool.sources.includes("Brave Web"))
  ) {
    add("Brave Web", async () => {
      const d = await json(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(mode === "web" ? query : `"${query}"`)}&count=10`,
        { headers: { "X-Subscription-Token": env.BRAVE_SEARCH_API_KEY } },
      );
      return (d?.web?.results || []).map((r) =>
        result(
          "Brave Web",
          r.title,
          r.url,
          [],
          r.description?.replace(/<[^>]*>/g, "") || "",
        ),
      );
    });
  }
  return Promise.all(tasks);
}
