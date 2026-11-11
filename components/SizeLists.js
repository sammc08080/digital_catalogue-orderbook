'use client';

import { useState } from 'react';
import { api } from '../lib/client';
import { SIZE_GROUPS } from '../lib/sizes';

// Catalogue settings > Sizes: this brand's own size lists
export default function SizeLists({ slug, groups, onSaved }) {
  const [list, setList] = useState(() => groups.map((g) => ({ name: g.name, sizes: [...g.sizes] })));
  const [adding, setAdding] = useState(() => groups.map(() => ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const change = (next) => { setSaved(false); setError(''); setList(next); };

  function add(i) {
    const parts = adding[i].split(/[,\n]+/).map((x) => x.trim()).filter(Boolean);
    if (!parts.length) return;
    const all = new Set(list.flatMap((g) => g.sizes.map((z) => z.toUpperCase())));
    const dup = parts.find((x) => all.has(x.toUpperCase()));
    if (dup) return setError(`Size "${dup}" is already in the list`);
    change(list.map((g, j) => (j === i ? { ...g, sizes: [...g.sizes, ...parts] } : g)));
    setAdding(adding.map((v, j) => (j === i ? '' : v)));
  }

  function remove(i, z) {
    change(list.map((g, j) => (j === i ? { ...g, sizes: g.sizes.filter((x) => x !== z) } : g)));
  }

  function reset() {
    if (!window.confirm('Put back the default sizes (0–38 and XS–6XL)? Sizes you added will be removed from the list.')) return;
    change(SIZE_GROUPS.map((g) => ({ name: g.name, sizes: [...g.sizes] })));
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const d = await api('/api/business', { action: 'saveSizes', slug, groups: list });
      setList(d.size_groups.map((g) => ({ name: g.name, sizes: [...g.sizes] })));
      onSaved(d.size_groups);
      setSaved(true);
    } catch (e2) {
      setError(e2.message);
    }
    setBusy(false);
  }

  return (
    <form className="card" onSubmit={save}>
      <h3>Sizes</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        These sizes show when adding a product. Add more sizes (several at once with commas, e.g. 7XL, 8XL) or tap × to remove one.
        Products keep sizes already saved on them.
      </p>
      {error && <div className="error">{error}</div>}
      {saved && <div className="ok" style={{ wordBreak: 'normal' }}>Sizes saved.</div>}

      {list.map((g, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginTop: 6 }}>{g.name} ({g.sizes.length})</div>
          <div className="size-chips">
            {g.sizes.length === 0 && <span className="muted">No sizes</span>}
            {g.sizes.map((z) => (
              <span className="size-chip" key={z}>
                {z}
                <button type="button" onClick={() => remove(i, z)} aria-label={`Remove size ${z}`}>×</button>
              </span>
            ))}
          </div>
          <div className="row" style={{ flexWrap: 'nowrap', marginTop: 8 }}>
            <input type="text" placeholder={i === 0 ? 'e.g. 40, 42, 44' : 'e.g. 7XL, 8XL, Free Size'} value={adding[i]}
              onChange={(e) => setAdding(adding.map((v, j) => (j === i ? e.target.value : v)))}
              data-noenter="1"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); add(i); } }}
              style={{ marginTop: 0 }} />
            <button type="button" className="btn mint" onClick={() => add(i)}>Add</button>
          </div>
        </div>
      ))}

      <button className="btn full" disabled={busy} style={{ marginBottom: 10 }}>{busy ? 'Saving…' : 'Save sizes'}</button>
      <button type="button" className="btn full blue" onClick={reset}>Reset to default sizes</button>
    </form>
  );
}
