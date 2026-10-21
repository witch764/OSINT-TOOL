import { useEffect, useState } from 'react';
import { Coins, LoaderCircle, Search, ShieldCheck } from 'lucide-react';
import { api, errorText } from './api';

type Access = { configured: boolean; emails: string[]; providers?: { name: string; configured: boolean }[] };
export default function ExposureForm({ query, setQuery, busy, onSubmit, infostealer = false, combined = false, onBack }: {
  combined?: boolean; onBack?: () => void; infostealer?: boolean; query: string; setQuery: (value: string) => void; busy: boolean; onSubmit: (event: React.FormEvent) => void;
}) {
  const [access, setAccess] = useState<Access | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setAccess(null);
    setError('');
    api<Access>(combined ? '/exposure/access' : '/oathnet/access').then(data => {
      if (!current) return;
      setAccess(data);
      setQuery(data.emails.includes(query) ? query : data.emails[0] || '');
    }).catch(e => { if (current) setError(errorText(e)); });
    return () => { current = false; };
  }, [attempt, infostealer, combined]);
  const ready = access?.configured && access.emails.includes(query);
  return <section className="search-panel">
    <div className="search-panel-top">
      <div><span className="section-kicker"><ShieldCheck size={14} /> {combined ? 'UNIFIED EXPOSURE' : infostealer ? 'INFOSTEALER EXPOSURE' : 'ACCOUNT EXPOSURE'}</span><h2>Check your approved account.</h2></div>
      <span className="cost-chip"><Coins size={13} /> 1 credit / check</span>
    </div>
    <p className="tool-description">{combined ? 'Configured providers check' : 'OathNet checks'} for {infostealer ? 'infostealer' : 'breach'} exposure of an email approved for your WitchSearch login. {infostealer ? 'Results show exposure status, affected domains, timestamps, and remediation advice. Secrets are excluded.' : 'Results show counts and breach sources.'}</p>
    {!access && !error && <p role="status"><LoaderCircle className="spin" size={16} /> Loading approved email addresses…</p>}
    {error && <div className="error-box" role="alert">{error} <button className="secondary" onClick={() => setAttempt(value => value + 1)}>Retry</button></div>}
    {access && !access.configured && <p role="status" className="inline-note">{combined ? 'No exposure providers are configured. Ask the site owner to connect OathNet or Have I Been Pwned.' : 'OathNet is not configured. Ask the site owner to connect OathNet.'}</p>}
    {access?.providers && <ul className="inline-note">{access.providers.map(provider => <li key={provider.name}>{provider.name}: {provider.configured ? 'Configured — access checked on lookup' : 'API access required or disabled'}</li>)}</ul>}
    {access && access.emails.length === 0 && <p role="status" className="inline-note">No email addresses are approved for your account. Ask the site owner to verify that you own the email or have permission to check it, then approve it for your login.</p>}
    {access && access.emails.length > 0 && <form onSubmit={onSubmit}>
      <label className="query-label" htmlFor="exposure-email">Approved email address</label>
      <div className="search-form">
        <ShieldCheck size={21} />
        <select id="exposure-email" value={access.emails.includes(query) ? query : ''} onChange={event => setQuery(event.target.value)} disabled={busy || !access.configured} required>
          {!access.emails.includes(query) && <option value="">Choose an email</option>}
          {access.emails.map(email => <option key={email} value={email}>{email}</option>)}
        </select>
        <button className="primary" disabled={busy || !ready}>{busy ? <LoaderCircle className="spin" size={16} /> : <Search size={16} />}{busy ? 'Checking…' : 'Check exposure'}</button>
      </div>
    </form>}
    <p className="inline-note">A result with no matches does not prove an account is safe. Unavailable sources cannot confirm exposure. Provider plan quotas apply; failed checks refund the WitchSearch credit.</p>
    {onBack && <button className="secondary" onClick={onBack} disabled={busy}>Back to public search</button>}
  </section>;
}
