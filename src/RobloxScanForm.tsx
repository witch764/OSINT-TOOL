import type { FormEvent } from 'react';
import { Coins, LoaderCircle, Search } from 'lucide-react';
import type { RobloxScanOptions } from './types';

export const defaultRobloxOptions: RobloxScanOptions = {
  count: 10, keywords: '', startsWith: '', endsWith: '', exactLength: null,
  includeUnavailable: false, showIds: false, showStatus: false,
};
export function RobloxScanForm({ query, setQuery, options, setOptions, busy, onSubmit }: {
  query: string;
  setQuery: (query: string) => void;
  options: RobloxScanOptions;
  setOptions: (options: RobloxScanOptions) => void;
  busy: boolean;
  onSubmit: (event: FormEvent) => void;
}) {
  function set<K extends keyof RobloxScanOptions>(key: K, value: RobloxScanOptions[K]) { setOptions({ ...options, [key]: value }); }
  return <section className="search-panel roblox-scan">
    <div className="search-panel-top"><div><span className="section-kicker">ROBLOX PROFILE SCRAPER</span><h2>Collect public profiles with filters.</h2></div><span className="cost-chip"><Coins size={13} />1 credit / scan</span></div>
    <p className="tool-description">Start at a user ID and scan up to 200 consecutive IDs. Filters apply to usernames and ignore capitalization. Save matching results to Cases or export the report.</p>
    <form onSubmit={onSubmit}>
      <fieldset disabled={busy}>
        <div className="scan-inputs">
          <label>Starting user ID<input aria-label="Starting user ID" inputMode="numeric" autoComplete="off" placeholder="Enter a User ID to start from…" value={query} onChange={e => setQuery(e.target.value)} pattern="[0-9]{1,16}" required /></label>
          <label>Amount (max 200)<input aria-label="Amount" type="number" min="1" max="200" step="1" required value={Number.isNaN(options.count) ? '' : options.count} onChange={e => set('count', e.target.valueAsNumber)} /></label>
        </div>
        <label>Keywords (comma-separated, match any)<input aria-label="Keywords" placeholder="For example: builder, roblox" maxLength={160} value={options.keywords} onChange={e => set('keywords', e.target.value)} /></label>
        <div className="scan-filters">
          <label>Starts with<input aria-label="Starts with" maxLength={64} placeholder="Username prefix" value={options.startsWith} onChange={e => set('startsWith', e.target.value)} /></label>
          <label>Ends with<input aria-label="Ends with" maxLength={64} placeholder="Username suffix" value={options.endsWith} onChange={e => set('endsWith', e.target.value)} /></label>
          <label>Exact length<input aria-label="Exact length" type="number" min="1" max="64" step="1" placeholder="Any length" value={options.exactLength ?? ''} onChange={e => set('exactLength', e.target.value === '' ? null : e.target.valueAsNumber)} /></label>
        </div>
        <div className="scan-toggles">
          {([
            ['includeUnavailable', 'Include unavailable / terminated IDs'],
            ['showIds', 'Show user IDs'],
            ['showStatus', 'Show status'],
          ] as const).map(([key, label]) => <label key={key}><span>{label}</span><input type="checkbox" role="switch" checked={options[key]} onChange={e => set(key, e.target.checked)} /></label>)}
        </div>
        <p className="inline-note">Roblox does not identify why an ID is missing. Unavailable rows do not confirm deletion and cannot match name filters. Keywords are literal text, not regular expressions.</p>
        <button className="primary full" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin" /> : <Search size={17} />}{busy ? 'Scanning public profiles…' : 'Start scan'}</button>
      </fieldset>
    </form>
  </section>;
}
