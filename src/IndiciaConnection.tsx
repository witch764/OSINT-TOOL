import { useEffect, useState } from 'react';
import { api, errorText } from './api';

export function IndiciaConnection() {
  const [key, setKey] = useState('');
  const [connected, setConnected] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { void api<{connected: boolean}>('/owner/indicia').then(r=>setConnected(r.connected)).catch(e=>setMessage(errorText(e))); }, []);
  async function change(disconnect = false) {
    setBusy(true); setMessage('');
    try {
      await api('/owner/indicia', disconnect ? {disconnect:true} : {apiKey:key});
      setKey('');
      window.location.reload();
    } catch (e) { setMessage(errorText(e)); }
    finally { setBusy(false); }
  }
  return <section className="provider-connection">
    <h3>Indicia connection</h3>
    <p className="inline-note">{connected === null ? 'Checking connection…' : connected ? 'Connected. Supported public-data tools offer an Indicia option.' : 'Not connected.'} Only endpoints quoted as free by Indicia are used. WitchSearch searches still cost one credit.</p>
    <form onSubmit={e=>{e.preventDefault(); void change();}}>
      <label htmlFor="indicia-key">{connected ? 'Replace API key' : 'API key'}</label>
      <input id="indicia-key" type="password" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)} placeholder="Paste your Indicia key" required disabled={busy} />
      <button className="primary full" disabled={busy || !key}>{busy ? 'Saving…' : 'Connect securely'}</button>
    </form>
    {connected && <button className="secondary full" disabled={busy} onClick={()=>void change(true)}>Disconnect Indicia</button>}
    {message && <p role="alert" className="inline-note">{message}</p>}
  </section>;
}
