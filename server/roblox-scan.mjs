import { json, field, result } from './fetch.mjs';

export const ROBLOX_SCAN_LIMIT = 200;
export function validateRobloxScan(query, input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid Roblox scan options.');
  const allowed = ['count', 'keywords', 'startsWith', 'endsWith', 'exactLength', 'includeUnavailable', 'showIds', 'showStatus'];
  if (Object.keys(input).some(key => !allowed.includes(key))) throw new Error('Unknown Roblox scan option.');
  const count = input.count === undefined ? 10 : input.count;
  if (!Number.isInteger(count) || count < 1 || count > ROBLOX_SCAN_LIMIT) throw new Error(`Choose between 1 and ${ROBLOX_SCAN_LIMIT} IDs per scan.`);
  const start = Number(query);
  if (!/^\d{1,16}$/.test(String(query)) || !Number.isSafeInteger(start) || start < 1 || start > Number.MAX_SAFE_INTEGER - (count - 1)) throw new Error('Enter a positive starting user ID within the supported numeric range.');
  const options = { count };
  for (const key of ['keywords', 'startsWith', 'endsWith']) {
    const value = input[key] ?? '';
    if (typeof value !== 'string' || value.length > (key === 'keywords' ? 160 : 64) || /[\x00-\x1f]/.test(value)) throw new Error(`Enter a valid ${key} filter.`);
    options[key] = value.trim();
  }
  const length = input.exactLength ?? null;
  if (length !== null && (!Number.isInteger(length) || length < 1 || length > 64)) throw new Error('Exact username length must be between 1 and 64.');
  options.exactLength = length;
  for (const key of ['includeUnavailable', 'showIds', 'showStatus']) {
    if (input[key] !== undefined && typeof input[key] !== 'boolean') throw new Error('Display options must be true or false.');
    options[key] = input[key] ?? false;
  }
  return options;
}
export function matchesRobloxName(name, options) {
  const normalized = name.toLowerCase();
  const keywords = options.keywords.toLowerCase().split(',').map(word => word.trim()).filter(Boolean);
  return (!keywords.length || keywords.some(word => normalized.includes(word))) &&
    normalized.startsWith(options.startsWith.toLowerCase()) && normalized.endsWith(options.endsWith.toLowerCase()) &&
    (options.exactLength === null || name.length === options.exactLength);
}
export async function scanRoblox(query, input) {
  const options = validateRobloxScan(query, input);
  const ids = Array.from({ length: options.count }, (_, i) => Number(query) + i);
  async function lookup(excludeBannedUsers) {
    const data = await json('https://users.roblox.com/v1/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userIds: ids, excludeBannedUsers }),
    });
    if (!Array.isArray(data?.data) || data.data.some(user => !ids.includes(user.id) || typeof user.name !== 'string')) throw new Error('Unexpected Roblox directory response.');
    return new Map(data.data.map(user => [user.id, user]));
  }
  // Directory requests support up to 200 IDs. No profile enumeration workers or account cookies are used.
  const users = await lookup(!options.includeUnavailable);
  let active = options.includeUnavailable ? null : users;
  let statusUnavailable = false;
  if (options.showStatus && options.includeUnavailable) {
    try { active = await lookup(true); } catch { statusUnavailable = true; }
  }
  const hasNameFilters = Boolean(options.keywords || options.startsWith || options.endsWith || options.exactLength !== null);
  return ids.flatMap(id => {
    const user = users.get(id);
    if (!user) {
      if (!options.includeUnavailable || hasNameFilters) return [];
      return [{ ...result('Roblox Directory', 'Unavailable profile', `https://www.roblox.com/users/${id}/profile`, [
        ...(options.showIds ? [field('User ID', id)] : []),
        ...(options.showStatus ? [field('Status', 'No public directory record')] : []),
      ], 'Roblox did not return this ID. It may be unassigned, deleted, terminated, or otherwise unavailable; deletion is not confirmed.'), kind: 'unavailable' }];
    }
    if (!matchesRobloxName(user.name, options)) return [];
    return [result('Roblox Directory', user.displayName || user.name, `https://www.roblox.com/users/${id}/profile`, [
      field('Username', user.name),
      ...(options.showIds ? [field('User ID', id)] : []),
      ...(options.showStatus ? [field('Status', statusUnavailable ? 'Status lookup unavailable' : active.has(id) ? 'Not excluded by Roblox banned-user filter' : 'Excluded by Roblox banned-user filter')] : []),
      field('Verified badge', user.hasVerifiedBadge ? 'Yes' : 'No'),
    ], 'Public Roblox directory record. Filters match usernames, not display names. Display toggles control report fields; profile URLs still contain public user IDs.')];
  });
}
