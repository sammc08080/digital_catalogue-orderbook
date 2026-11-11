'use client';

import { useState } from 'react';
import { api } from '../lib/client';
import { sortSlabs, slabText } from '../lib/gst';

// Catalogue settings > GST slabs: add as many slabs as needed, edit any time
export default function GstSlabs({ slug, slabs, onSaved }) {
  const [rows, setRows] = useState(() =>
    sortSlabs(slabs).map((s) => ({ upto: s.upto == null ? '' : String(s.upto), pct: String(s.pct) })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const set = (i, k, v) => { setSaved(false); setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r))); };
  const add = () => { setSaved(false); setRows([...rows, { upto: '', pct: '' }]); };
  const remove = (i) => { setSaved(false); setRows(rows.filter((_, j) => j !== i)); };

  async function save(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const d = await api('/api/business', { action: 'saveGst', slug, slabs: rows });
      setRows(sortSlabs(d.gst_slabs).map((s) => ({ upto: s.upto == null ? '' : String(s.upto), pct: String(s.pct) })));
      onSaved(d.gst_slabs);
      setSaved(true);
    } catch (e2) {
      setError(e2.message);
    }
    setBusy(false);
  }

  return (
    <form className="card" onSubmit={save}>
      <h3>GST slabs</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Rate per piece (WSP) up to the slab amount gets that GST %. Leave the amount empty on one slab to mean “and above”.
      </p>
      {error && <div className="error">{error}</div>}
      {saved && <div className="ok" style={{ wordBreak: 'normal' }}>Saved. Now: {slabText(sortSlabs(rows.map((r) => ({ upto: r.upto === '' ? null : Number(r.upto), pct: Number(r.pct) })))).replace(/Rs\. /g, '₹')}</div>}

      {rows.map((r, i) => (
        <div className="slab-row" key={i}>
          <span className="slab-name">Slab {i + 1}</span>
          <label className="slab-field">Up to ₹
            <input type="number" inputMode="decimal" min="0" step="0.01" value={r.upto}
              placeholder="and above" onChange={(e) => set(i, 'upto', e.target.value)} />
          </label>
          <label className="slab-field small">GST %
            <input type="number" inputMode="decimal" min="0" max="100" step="0.01" value={r.pct}
              onChange={(e) => set(i, 'pct', e.target.value)} />
          </label>
          <button type="button" className="slab-x" onClick={() => remove(i)} aria-label={`Remove slab ${i + 1}`}>×</button>
        </div>
      ))}

      <button type="button" className="btn mint full" onClick={add} style={{ margin: '4px 0 12px' }}>+ Add slab</button>
      <button className="btn full" disabled={busy}>{busy ? 'Saving…' : 'Save slabs'}</button>
    </form>
  );
}
