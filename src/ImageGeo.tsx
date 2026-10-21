import { useRef, useState } from 'react';
import { ArrowDownToLine, MapPin, Image, LoaderCircle } from 'lucide-react';
import { exportSearch } from './api';
import type { Result } from './types';

export function ImageGeo() {
  const [records, setRecords] = useState<Result[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const sequence = useRef(0);
  async function inspect(file?: File) {
    const current = ++sequence.current;
    setRecords([]);
    setMessage('');
    if (!file) { setBusy(false); return; }
    if (!file.type.startsWith('image/') || file.size > 20 * 1024 * 1024) {
      setMessage('Choose an image smaller than 20 MB.');
      setBusy(false);
      return;
    }
    setBusy(true);
    try {
      const { parse } = await import('exifr');
      const data = await parse(file);
      if (current !== sequence.current) return;
      const hasGps = Number.isFinite(data?.latitude) && Number.isFinite(data?.longitude) && Math.abs(data.latitude) <= 90 && Math.abs(data.longitude) <= 180;
      const fields = ['Make', 'Model', 'LensModel', 'DateTimeOriginal', 'Software', 'ImageWidth', 'ImageHeight'].flatMap(key => {
        const value = data?.[key];
        return value == null ? [] : [{ label: key, value: value instanceof Date ? value.toISOString() : String(value).slice(0, 1000) }];
      });
      if (hasGps) fields.unshift({ label: 'Latitude', value: String(data.latitude) }, { label: 'Longitude', value: String(data.longitude) });
      setRecords([{ source: 'Local image metadata', title: file.name, url: hasGps ? `https://www.openstreetmap.org/?mlat=${data.latitude}&mlon=${data.longitude}#map=16/${data.latitude}/${data.longitude}` : '', description: hasGps ? 'GPS coordinates embedded in the file. Metadata can be edited and is not proof of where an image was taken.' : 'No GPS coordinates found. Screenshots and images downloaded from social platforms often have location metadata removed.', fields }]);
    } catch {
      if (current === sequence.current) setMessage('This file has no readable EXIF metadata or uses an unsupported image format. Try the original JPEG or HEIC photo.');
    } finally { if (current === sequence.current) setBusy(false); }
  }
  return <section className="search-panel">
    <div className="search-panel-top"><h2><Image size={20} /> Image metadata & location</h2><span className="cost-chip">Free · on your device</span></div>
    <p className="tool-description">Choose an original photo to read embedded GPS and camera details. The image stays on your device. This does not estimate a location from scenery.</p>
    <label className="secondary image-picker">Choose photo<input aria-label="Choose photo" type="file" accept="image/*" onChange={e => void inspect(e.target.files?.[0])} /></label>
    {busy && <p><LoaderCircle size={16} className="spin" /> Reading metadata…</p>}
    {message && <p role="status" className="inline-note">{message}</p>}
    {records.map(record => <article className="result-card" key={record.title}>
      <span className="pill">LOCAL EXIF</span><h3>{record.title}</h3><p>{record.description}</p>
      <dl>{record.fields.map(f => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>
      <div className="button-row">{record.url && <a className="secondary" href={record.url} target="_blank" rel="noopener noreferrer"><MapPin size={15} />Open map</a>}
      <button className="secondary" onClick={() => exportSearch({ type: 'image-metadata', ...record })}><ArrowDownToLine size={15} />Export metadata</button></div>
    </article>)}
  </section>;
}
