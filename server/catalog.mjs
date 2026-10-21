import { OATHNET_TOOLS } from './oathnet.mjs';

// Only concrete implementations are marked available. Indexed web searches state their coverage.
export const TOOL_GROUPS = [
  {
    "label": "INTELLIGENCE",
    "tools": [
      {
        "id": "web",
        "name": "Web Databases",
        "icon": "database",
        "mode": "web",
        "provider": "DuckDuckGo / optional Brave",
        "description": "Search indexed public web pages. No API key needed; Brave is used when configured."
      },
      {
        "id": "face",
        "name": "Reverse Face Search",
        "icon": "scan",
        "provider": "Licensed face-search provider",
        "description": "Requires a licensed image-search integration and its consent requirements."
      },
      {
        "id": "image-geo",
        "name": "Image Geolocation",
        "icon": "locate",
        "provider": "Image geolocation provider",
        "mode": "local-image",
        "description": "Read GPS coordinates, camera, and date metadata from an original photo on your device. The image is not uploaded. Photos without GPS cannot be geolocated."
      },
      {
        "id": "gmail",
        "name": "Gmail Lookup",
        "icon": "mail",
        "mode": "email",
        "description": "Inspect the email domain’s live mail and DNS infrastructure. Does not identify a mailbox owner."
      },
      {
        "id": "hudson",
        "name": "Hudson Rock",
        "icon": "shield",
        "provider": "Hudson Rock"
      },
      {
        "id": "horus",
        "name": "Horus Stealer Logs",
        "icon": "shield",
        "provider": "Horus"
      }
    ]
  },
  {
    "label": "US SEARCH",
    "tools": [
      {
        "id": "phone",
        "name": "Phone Search",
        "icon": "phone",
        "provider": "Licensed people-search provider",
        "mode": "phone",
        "description": "Inspect an international phone number’s country and numbering plan, then search indexed public mentions. Does not reveal a subscriber identity or live location.",
        "example": "+1 202 555 0123",
        "placeholder": "Phone number with country code…"
      },
      {
        "id": "address",
        "name": "Address Search",
        "icon": "home",
        "provider": "Licensed people-search provider",
        "mode": "address",
        "description": "Find a place or address on OpenStreetMap with coordinates and a map link. Does not identify residents.",
        "example": "Empire State Building, New York",
        "placeholder": "Enter a place or street address…"
      },
      {
        "id": "email",
        "name": "Email Search",
        "icon": "mail",
        "mode": "email",
        "description": "Inspect public email-domain infrastructure and, when connected, public web mentions. Does not confirm mailbox existence."
      },
      {
        "id": "person",
        "name": "Person Search",
        "icon": "user",
        "provider": "Licensed people-search provider",
        "mode": "web",
        "description": "Find indexed public pages mentioning a name. A name match does not establish identity; this is not a private background report.",
        "example": "Ada Lovelace",
        "placeholder": "Enter a name and optional context…"
      },
      {
        "id": "court",
        "name": "Court Records",
        "icon": "scale",
        "provider": "Court records provider",
        "mode": "court",
        "description": "Search public US court opinions through CourtListener. Coverage is limited to its opinion collection.",
        "example": "copyright",
        "placeholder": "Case name, topic, citation, or docket…"
      }
    ]
  },
  {
    "label": "INFRASTRUCTURE",
    "tools": [
      {
        "id": "cell",
        "name": "Cell Tower",
        "icon": "radio",
        "provider": "Cell tower data provider"
      },
      {
        "id": "ip",
        "name": "IP Info",
        "icon": "server",
        "mode": "ip",
        "description": "Public IPv4 allocation, reverse DNS, approximate IPinfo location, and Shodan observations. IP location is approximate and does not locate a person."
      },
      {
        "id": "whois",
        "name": "Whois",
        "icon": "building",
        "mode": "domain",
        "description": "Domain registration and public DNS records from RDAP and Google DNS."
      },
      {
        "id": "dns",
        "name": "DNS Recon",
        "icon": "server",
        "mode": "domain",
        "sources": [
          "Google DNS"
        ],
        "description": "Live A, AAAA, MX, NS, and TXT records."
      },
      {
        "id": "shodan",
        "name": "Shodan",
        "icon": "radar",
        "provider": "Shodan",
        "mode": "shodan",
        "description": "Retrieve existing Shodan InternetDB observations for a public IPv4 address, including ports, hostnames, and reported CVEs. No active scan.",
        "example": "8.8.8.8",
        "placeholder": "Enter a public IPv4 address…"
      },
      {
        "id": "ai-infra",
        "name": "AI Infra",
        "icon": "sparkles",
        "provider": "AI inference provider"
      },
      {
        "id": "certificate",
        "name": "Certificate Lookup",
        "icon": "file",
        "mode": "certificate",
        "description": "Find certificate transparency records and hostnames using Cert Spotter and crt.sh."
      },
      {
        "id": "wayback",
        "name": "Wayback Machine",
        "icon": "history",
        "mode": "wayback",
        "description": "Find the nearest archived snapshot of a domain."
      },
      {
        "id": "wifi",
        "name": "Wi-Fi Network Map",
        "icon": "wifi",
        "provider": "WiGLE"
      },
      {
        "id": "bssid",
        "name": "Location to BSSID",
        "icon": "locate",
        "provider": "WiGLE"
      },
      {
        "id": "virustotal",
        "name": "VirusTotal",
        "icon": "shield",
        "provider": "VirusTotal",
        "mode": "virustotal",
        "requiredEnv": "VIRUSTOTAL_API_KEY",
        "description": "Read an existing VirusTotal domain, IPv4, or file-hash reputation report. Requires VIRUSTOTAL_API_KEY in Netlify.",
        "example": "example.com",
        "placeholder": "Domain, public IPv4, or file hash…",
        "setupUrl": "https://www.virustotal.com/gui/my-apikey"
      },
      {
        "id": "urlscan",
        "name": "URLScan",
        "icon": "globe",
        "mode": "urlscan",
        "description": "Search existing public URLScan observations for a domain. No new scans are submitted."
      },
      {
        "id": "cve",
        "name": "CVE / KEV",
        "icon": "bug",
        "mode": "cve",
        "description": "Read a published CVE and check CISA’s Known Exploited Vulnerabilities catalog."
      },
      {
        "id": "ransomware",
        "name": "Ransomware Groups",
        "icon": "shield",
        "provider": "Threat intelligence provider",
        "mode": "ransomware",
        "description": "Search public threat group summaries from Ransomware.live and related malware-family records from Malpedia. Does not retrieve stolen files or malware samples.",
        "example": "lockbit",
        "placeholder": "Enter a threat group name…"
      },
      {
        "id": "vt-content",
        "name": "VirusTotal Content Search",
        "icon": "file",
        "provider": "VirusTotal Intelligence",
        "mode": "vt-content",
        "requiredEnv": "VIRUSTOTAL_INTELLIGENCE_ENABLED",
        "description": "Search VirusTotal Intelligence reports. Requires VIRUSTOTAL_API_KEY and an Intelligence subscription; set VIRUSTOTAL_INTELLIGENCE_ENABLED=true after confirming access.",
        "example": "type:peexe positives:10+",
        "placeholder": "Enter a VirusTotal Intelligence query…",
        "setupUrl": "https://www.virustotal.com/gui/my-apikey"
      },
      {
        "id": "vt-download",
        "name": "VirusTotal Downloader",
        "icon": "download",
        "provider": "VirusTotal Intelligence"
      },
      {
        "id": "crypto",
        "name": "Crypto Address Analyzer",
        "icon": "bitcoin",
        "mode": "crypto",
        "description": "Analyze confirmed on-chain activity for a Bitcoin mainnet address through Blockstream."
      },
      {
        "id": "appstore",
        "name": "App Store Search",
        "icon": "grid",
        "mode": "appstore",
        "description": "Find published iOS apps, developers, and store listings."
      }
    ]
  },
  {
    "label": "SOCIAL",
    "tools": [
      {
        "id": "live",
        "name": "Live Intelligence",
        "icon": "radar",
        "mode": "web",
        "provider": "DuckDuckGo / optional Brave",
        "description": "Search public web mentions. Results reflect the search index, not a real-time feed."
      },
      {
        "id": "telegram",
        "name": "Telegram",
        "icon": "send",
        "provider": "Telegram public preview and web index",
        "mode": "username",
        "sources": ["Telegram", "Public Web"],
        "site": "t.me",
        "description": "Read a public Telegram profile or channel preview by exact handle and search indexed mentions. Does not access private messages or members.",
        "example": "telegram",
        "placeholder": "Enter a username or public name…"
      },
      {
        "id": "forums",
        "name": "Forums Search",
        "icon": "messages",
        "mode": "forums",
        "sources": [
          "Hacker News Search"
        ],
        "description": "Search public Hacker News stories and comments by keyword or name.",
        "example": "open source",
        "placeholder": "Search discussion topics or names…"
      },
      {
        "id": "link",
        "name": "Link Resolver",
        "icon": "link",
        "provider": "URL reputation and resolution provider",
        "mode": "link",
        "description": "Follow HTTP redirects and show the final destination. Does not execute scripts or log into sites.",
        "example": "https://github.com",
        "placeholder": "Paste a full public HTTPS URL…"
      },
      {
        "id": "github",
        "name": "GitHub",
        "icon": "github",
        "mode": "username",
        "sources": [
          "GitHub"
        ],
        "description": "Look up a public GitHub account."
      },
      {
        "id": "linkedin",
        "name": "LinkedIn",
        "icon": "user",
        "provider": "Public web index",
        "mode": "web",
        "site": "linkedin.com",
        "description": "Search indexed public linkedin pages mentioning a username or name. This searches the web index, not private platform data; unindexed accounts will not appear.",
        "example": "Epic Games",
        "placeholder": "Enter a username or public name…"
      },
      {
        "id": "roblox",
        "name": "Roblox",
        "icon": "game",
        "mode": "username",
        "sources": [
          "Roblox"
        ],
        "description": "Resolve an exact Roblox username to its public profile and user ID."
      },
      {
        "id": "discord",
        "name": "Discord",
        "icon": "messages",
        "provider": "Authorized Discord application",
        "mode": "discord",
        "description": "Read a public server invite preview and approximate member counts. Requires an invite code; usernames and private messages cannot be looked up.",
        "example": "discord-developers",
        "placeholder": "Public invite code or discord.gg link…"
      },
      {
        "id": "reddit",
        "name": "Reddit",
        "icon": "messages",
        "mode": "username",
        "sources": [
          "Reddit",
          "Public Web"
        ],
        "description": "Read a public Reddit profile and indexed Reddit mentions. The direct API may block cloud requests.",
        "site": "reddit.com"
      },
      {
        "id": "tiktok",
        "name": "TikTok",
        "icon": "video",
        "provider": "Public web index",
        "mode": "web",
        "site": "tiktok.com",
        "description": "Search indexed public tiktok pages mentioning a username or name. This searches the web index, not private platform data; unindexed accounts will not appear.",
        "example": "nasa",
        "placeholder": "Enter a username or public name…"
      },
      {
        "id": "instagram",
        "name": "Instagram",
        "icon": "camera",
        "provider": "Public web index",
        "mode": "web",
        "site": "instagram.com",
        "description": "Search indexed public instagram pages mentioning a username or name. This searches the web index, not private platform data; unindexed accounts will not appear.",
        "example": "nasa",
        "placeholder": "Enter a username or public name…"
      },
      {
        "id": "xbox",
        "name": "Xbox",
        "icon": "game",
        "provider": "Public web index",
        "mode": "web",
        "site": "xbox.com",
        "description": "Search indexed public xbox pages mentioning a username or name. This searches the web index, not private platform data; unindexed accounts will not appear.",
        "example": "Epic Games",
        "placeholder": "Enter a username or public name…"
      },
      {
        "id": "playstation",
        "name": "PlayStation",
        "icon": "game",
        "provider": "Public web index",
        "mode": "web",
        "site": "playstation.com",
        "description": "Search indexed public playstation pages mentioning a username or name. This searches the web index, not private platform data; unindexed accounts will not appear.",
        "example": "Epic Games",
        "placeholder": "Enter a username or public name…"
      },
      {
        "id": "epic",
        "name": "Epic Games",
        "icon": "game",
        "provider": "Public web index",
        "mode": "web",
        "site": "epicgames.com",
        "description": "Search indexed public Epic Games pages mentioning a username or name. This searches the web index, not private platform data; unindexed accounts will not appear.",
        "example": "Epic Games",
        "placeholder": "Enter a username or public name…"
      },
      {
        "id": "steam",
        "name": "Steam",
        "icon": "game",
        "provider": "Steam Web API",
        "mode": "steam",
        "description": "Read a Steam Community profile by vanity name or 17-digit Steam ID. Private fields remain private.",
        "example": "robinwalker",
        "placeholder": "Steam vanity name or 17-digit ID…"
      }
    ]
  },
  {
    "label": "TOOLS",
    "tools": [
      {
        "id": "double-counter",
        "name": "Double Counter Bypass",
        "icon": "bot",
        "provider": "No supported integration",
        "description": "Not implemented. This application does not bypass third-party verification."
      },
      {
        "id": "roblox-scraper",
        "name": "Roblox Profile Scraper",
        "icon": "folders",
        "mode": "roblox-batch",
        "sources": [
          "Roblox Directory"
        ],
        "description": "Scan up to 200 consecutive Roblox IDs with username filters and optional ID/status fields. Include unavailable directory slots without assuming they are deleted. Save and export results."
      },
      {
        "id": "intelx",
        "name": "IntelX Downloader",
        "icon": "download",
        "provider": "Intelligence X"
      }
    ]
  }
];

TOOL_GROUPS.push({ label: 'EXPOSURE & REPUTATION', tools: [
  { id: 'account-exposure', name: 'Unified Account Exposure', mode: 'account-exposure', icon: 'shield', provider: 'OathNet / Have I Been Pwned', description: 'Check an approved account email across configured exposure providers. Each source reports its own status and evidence.' },
  { id: 'abuseipdb', name: 'AbuseIPDB Reputation', mode: 'abuseipdb', icon: 'shield', provider: 'AbuseIPDB', requiredEnv: 'ABUSEIPDB_API_KEY', setupUrl: 'https://www.abuseipdb.com/account/api', description: 'Review community-reported reputation for a public IPv4 address. Does not submit abuse reports.', placeholder: 'Public IPv4 address…', example: '8.8.8.8' },
] });
TOOL_GROUPS.push({ label: 'OATHNET', tools: OATHNET_TOOLS });

export const TOOLS = TOOL_GROUPS.flatMap(g => g.tools);
export function toolAvailable(tool, env) {
  if (!tool.mode) return false;
  if (tool.mode === 'account-exposure') return Boolean(env.OATHNET_API_KEY?.trim() || env.HIBP_API_KEY?.trim());
  if (tool.mode === 'oathnet-infostealer') return Boolean(env.OATHNET_API_KEY?.trim() && env.OATHNET_INFOSTEALER_ENABLED === 'true');
  if (tool.mode.startsWith('oathnet-')) return Boolean(env.OATHNET_API_KEY?.trim());
  if (tool.mode === 'vt-content') return Boolean(env.VIRUSTOTAL_API_KEY && env.VIRUSTOTAL_INTELLIGENCE_ENABLED === 'true');
  return !tool.requiredEnv || Boolean(env[tool.requiredEnv]);
}
