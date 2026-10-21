import { field, result } from './fetch.mjs';
import { providerJson } from './provider-http.mjs';

export async function abuseipdbRecords(query, apiKey) {
  if (!apiKey?.trim()) throw new Error('AbuseIPDB API access is required.');
  const response = await providerJson('AbuseIPDB', `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(query)}&maxAgeInDays=90`, { Key: apiKey });
  const data = response?.data;
  if (!data || data.ipAddress !== query || !Number.isInteger(data.abuseConfidenceScore) || data.abuseConfidenceScore < 0 || data.abuseConfidenceScore > 100 || !Number.isInteger(data.totalReports) || data.totalReports < 0) throw new Error('Unexpected reputation response');
  const row = result('AbuseIPDB', query, `https://www.abuseipdb.com/check/${encodeURIComponent(query)}`, [
    field('Abuse confidence score', data.abuseConfidenceScore), field('Reports in last 90 days', data.totalReports),
    field('Distinct reporting users', data.numDistinctUsers), field('Last reported', data.lastReportedAt),
    field('Country', data.countryCode), field('ISP', data.isp), field('Usage type', data.usageType),
  ], 'Community-reported IP reputation from AbuseIPDB. Reports and scores are indicators, not proof of abuse or the identity of a person. Raw reports are excluded.');
  if (JSON.stringify(row).includes(apiKey)) throw new Error('Provider echoed key');
  return [row];
}
