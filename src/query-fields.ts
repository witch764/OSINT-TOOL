import type { Tool } from './types';
type QueryField = { label: string; type?: 'email' | 'url'; placeholder?: string };
const fields: Record<string, QueryField> = {
  username: { label: 'Username' },
  email: { label: 'Email address', type: 'email' },
  domain: { label: 'Domain name' },
  ip: { label: 'Public IPv4 address' },
  web: { label: 'Public web query' },
  certificate: { label: 'Domain name', placeholder: 'example.com' },
  wayback: { label: 'Domain to find in the archive', placeholder: 'example.com' },
  urlscan: { label: 'Domain to find in public scans', placeholder: 'example.com' },
  cve: { label: 'CVE identifier', placeholder: 'CVE-2024-3094' },
  crypto: { label: 'Bitcoin mainnet address', placeholder: 'Enter a Bitcoin address…' },
  appstore: { label: 'App or developer name', placeholder: 'Enter an app or developer…' },
  phone: { label: 'Phone number with country code' },
  address: { label: 'Place or street address' },
  court: { label: 'Case name, topic, citation, or docket' },
  shodan: { label: 'Public IPv4 address' },
  steam: { label: 'Steam vanity name or SteamID64' },
  discord: { label: 'Public Discord invite code or link' },
  link: { label: 'Public HTTP or HTTPS URL', type: 'url' },
  forums: { label: 'Discussion keyword or name' },
  ransomware: { label: 'Threat group or malware family' },
  virustotal: { label: 'Domain, public IPv4, or file hash' },
  'vt-content': { label: 'VirusTotal Intelligence query' },
};
export function queryField(mode: string, tool: Tool | null): QueryField {
  return tool?.site && mode === 'web'
    ? { label: 'Username or public name', placeholder: tool.placeholder }
    : { ...(fields[mode] || { label: 'Search query' }), ...(tool?.placeholder ? { placeholder: tool.placeholder } : {}) };
}
