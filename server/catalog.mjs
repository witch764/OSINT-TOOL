// A tool is only marked available when a concrete implementation is wired to the API.
export const TOOL_GROUPS = [
  {
    label: "INTELLIGENCE",
    tools: [
      {
        id: "web",
        name: "Web Databases",
        icon: "database",
        mode: "web",
        provider: "Brave Search",
        description:
          "Search the public web with an exact identifier or a research query.",
      },
      {
        id: "face",
        name: "Reverse Face Search",
        icon: "scan",
        provider: "Licensed face-search provider",
        description:
          "Requires a licensed image-search integration and its consent requirements.",
      },
      {
        id: "image-geo",
        name: "Image Geolocation",
        icon: "locate",
        provider: "Image geolocation provider",
      },
      {
        id: "gmail",
        name: "Gmail Lookup",
        icon: "mail",
        mode: "email",
        description:
          "Inspect the email domain’s live mail and DNS infrastructure. Does not identify a mailbox owner.",
      },
      {
        id: "hudson",
        name: "Hudson Rock",
        icon: "shield",
        provider: "Hudson Rock",
      },
      {
        id: "horus",
        name: "Horus Stealer Logs",
        icon: "shield",
        provider: "Horus",
      },
    ],
  },
  {
    label: "US SEARCH",
    tools: [
      {
        id: "phone",
        name: "Phone Search",
        icon: "phone",
        provider: "Licensed people-search provider",
      },
      {
        id: "address",
        name: "Address Search",
        icon: "home",
        provider: "Licensed people-search provider",
      },
      {
        id: "email",
        name: "Email Search",
        icon: "mail",
        mode: "email",
        description:
          "Inspect public email-domain infrastructure and, when connected, public web mentions. Does not confirm mailbox existence.",
      },
      {
        id: "person",
        name: "Person Search",
        icon: "user",
        provider: "Licensed people-search provider",
      },
      {
        id: "court",
        name: "Court Records",
        icon: "scale",
        provider: "Court records provider",
      },
    ],
  },
  {
    label: "INFRASTRUCTURE",
    tools: [
      {
        id: "cell",
        name: "Cell Tower",
        icon: "radio",
        provider: "Cell tower data provider",
      },
      {
        id: "ip",
        name: "IP Info",
        icon: "server",
        mode: "ip",
        description: "Public IPv4 allocation data and reverse DNS records.",
      },
      {
        id: "whois",
        name: "Whois",
        icon: "building",
        mode: "domain",
        description:
          "Domain registration and public DNS records from RDAP and Google DNS.",
      },
      {
        id: "dns",
        name: "DNS Recon",
        icon: "server",
        mode: "domain",
        sources: ["Google DNS"],
        description: "Live A, AAAA, MX, NS, and TXT records.",
      },
      { id: "shodan", name: "Shodan", icon: "radar", provider: "Shodan" },
      {
        id: "ai-infra",
        name: "AI Infra",
        icon: "sparkles",
        provider: "AI inference provider",
      },
      {
        id: "certificate",
        name: "Certificate Lookup",
        icon: "file",
        mode: "certificate",
        description:
          "Find publicly logged certificates and associated hostnames through crt.sh.",
      },
      {
        id: "wayback",
        name: "Wayback Machine",
        icon: "history",
        mode: "wayback",
        description: "Find the nearest archived snapshot of a domain.",
      },
      {
        id: "wifi",
        name: "Wi-Fi Network Map",
        icon: "wifi",
        provider: "WiGLE",
      },
      {
        id: "bssid",
        name: "Location to BSSID",
        icon: "locate",
        provider: "WiGLE",
      },
      {
        id: "virustotal",
        name: "VirusTotal",
        icon: "shield",
        provider: "VirusTotal",
      },
      {
        id: "urlscan",
        name: "URLScan",
        icon: "globe",
        mode: "urlscan",
        description:
          "Search existing public URLScan observations for a domain. No new scans are submitted.",
      },
      {
        id: "cve",
        name: "CVE / KEV",
        icon: "bug",
        mode: "cve",
        description:
          "Look up a published CVE record from the CVE Program. KEV enrichment is not connected.",
      },
      {
        id: "ransomware",
        name: "Ransomware Groups",
        icon: "shield",
        provider: "Threat intelligence provider",
      },
      {
        id: "vt-content",
        name: "VirusTotal Content Search",
        icon: "file",
        provider: "VirusTotal Intelligence",
      },
      {
        id: "vt-download",
        name: "VirusTotal Downloader",
        icon: "download",
        provider: "VirusTotal Intelligence",
      },
      {
        id: "crypto",
        name: "Crypto Address Analyzer",
        icon: "bitcoin",
        mode: "crypto",
        description:
          "Analyze confirmed on-chain activity for a Bitcoin mainnet address through Blockstream.",
      },
      {
        id: "appstore",
        name: "App Store Search",
        icon: "grid",
        mode: "appstore",
        description: "Find published iOS apps, developers, and store listings.",
      },
    ],
  },
  {
    label: "SOCIAL",
    tools: [
      {
        id: "live",
        name: "Live Intelligence",
        icon: "radar",
        mode: "web",
        provider: "Brave Search",
        description: "Search public web mentions through Brave Search.",
      },
      {
        id: "telegram",
        name: "Telegram",
        icon: "send",
        provider: "Telegram data provider",
      },
      {
        id: "forums",
        name: "Forums Search",
        icon: "messages",
        mode: "username",
        sources: ["Hacker News"],
        description: "Find a public Hacker News account by exact username.",
      },
      {
        id: "link",
        name: "Link Resolver",
        icon: "link",
        provider: "URL reputation and resolution provider",
      },
      {
        id: "github",
        name: "GitHub",
        icon: "github",
        mode: "username",
        sources: ["GitHub"],
        description: "Look up a public GitHub account.",
      },
      {
        id: "linkedin",
        name: "LinkedIn",
        icon: "user",
        provider: "Licensed LinkedIn data provider",
      },
      {
        id: "roblox",
        name: "Roblox",
        icon: "game",
        mode: "username",
        sources: ["Roblox"],
        description:
          "Resolve an exact Roblox username to its public profile and user ID.",
      },
      {
        id: "discord",
        name: "Discord",
        icon: "messages",
        provider: "Authorized Discord application",
      },
      {
        id: "reddit",
        name: "Reddit",
        icon: "messages",
        mode: "username",
        sources: ["Reddit"],
        description:
          "Look up a public Reddit profile. Reddit may block requests from cloud hosts.",
      },
      {
        id: "tiktok",
        name: "TikTok",
        icon: "video",
        provider: "TikTok data provider",
      },
      {
        id: "instagram",
        name: "Instagram",
        icon: "camera",
        provider: "Authorized Instagram application",
      },
      {
        id: "xbox",
        name: "Xbox",
        icon: "game",
        provider: "Xbox data provider",
      },
      {
        id: "playstation",
        name: "PlayStation",
        icon: "game",
        provider: "PlayStation data provider",
      },
      {
        id: "epic",
        name: "Epic Games",
        icon: "game",
        provider: "Epic Games data provider",
      },
      { id: "steam", name: "Steam", icon: "game", provider: "Steam Web API" },
    ],
  },
  {
    label: "TOOLS",
    tools: [
      {
        id: "double-counter",
        name: "Double Counter Bypass",
        icon: "bot",
        provider: "No supported integration",
        description:
          "Not implemented. This application does not bypass third-party verification.",
      },
      {
        id: "roblox-scraper",
        name: "Roblox Profile Scraper",
        icon: "folders",
        mode: "username",
        sources: ["Roblox"],
        description: "Look up and export public Roblox profile identifiers.",
      },
      {
        id: "intelx",
        name: "IntelX Downloader",
        icon: "download",
        provider: "Intelligence X",
      },
    ],
  },
];
export const TOOLS = TOOL_GROUPS.flatMap((g) => g.tools);
export function toolAvailable(tool, env) {
  return Boolean(
    tool.mode && (tool.mode !== "web" || env.BRAVE_SEARCH_API_KEY),
  );
}
