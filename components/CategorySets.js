'use client';

import { useState } from 'react';
import { api } from '../lib/client';

const toRow = (x) => {
  const r = { size: x.size || '', wsp: x.wsp == null ? '' : String(x.wsp), mrp: x.mrp == null ? '' : String(x.mrp) };
  return { ...r, orig: { ...r } };
};

// Categories tab > Default sets: Set 1, Set 2 ... with WSP / MRP for one category
export default function CategorySets({ slug, category, products, onSaved, onClose }) {
  const [sets, setSets] = useState(() => (Array.isArray(category.default_sets) ? category.default_sets : []).map(toRow));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const setSet = (j, key, v) => { setMsg(''); setSets(sets.map((x, m) => (m === j ? { ...x, [key]: v } : x))); };
  const addSet = () => { setMsg(''); setSets([...sets, { size: '', wsp: '', mrp: '' }]); };
  const removeSet = (j) => { setMsg(''); setSets(sets.filter((_, m) => m !== j)); };

  async function save() {
    setError('');
    setMsg('');
    const list = sets.map((x) => ({ ...x, size: String(x.size).trim() })).filter((x) => x.size);
    const changes = [];
    for (const x of list) {
      if (!x.orig || !x.orig.size) continue;
      const renamed = x.size !== x.orig.size;
      const wspChanged = x.wsp !== x.orig.wsp;
      const mrpChanged = x.mrp !== x.orig.mrp;
      if (renamed || wspChanged || mrpChanged) {
        changes.push({ from: x.orig.size, to: x.size, wsp: wspChanged ? x.wsp : undefined, mrp: mrpChanged ? x.mrp : undefined });
      }
    }
    const inCat = products.filter((p) => p.category_id === category.id);
    const hit = (pr, name) => (pr.sizes || []).some((z) => z.custom && String(z.size).toUpperCase() === name.toUpperCase());
    const affected = inCat.filter((pr) => changes.some((c) => hit(pr, c.from))).length;
    if (affected > 0) {
      const what = changes.map((c) => (c.from !== c.to ? `"${c.from}" → "${c.to}"` : `"${c.from}"`)).join(', ');
      if (!window.confirm(`This will also update ${what} in ${affected} product${affected === 1 ? '' : 's'} in "${category.name}". OK?`)) return;
    }
    setBusy(true);
    try {
      const d = await api('/api/business', {
        action: 'saveCategorySets', slug, id: category.id,
        sets: list.map(({ orig, ...x }) => x), changes: affected > 0 ? changes : [],
      });
      const saved = (d.categories || []).find((c) => c.id === category.id);
      setSets((saved && Array.isArray(saved.default_sets) ? saved.default_sets : []).map(toRow));
      onSaved(d);
      setMsg(affected > 0 ? `Saved. ${d.updated || 0} product(s) updated.` : 'Saved.');
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  return (
    <div className="cat-sets">
      <div style={{ fontWeight: 800, fontSize: 14 }}>Default sets for “{category.name}”</div>
      <p className="muted" style={{ margin: '2px 0 6px', fontSize: 13 }}>
        New products in this category start with these. If empty, the album sets from the Sizes tab are used.
      </p>
      {error && <div className="error">{error}</div>}
      {msg && <div className="ok" style={{ wordBreak: 'normal' }}>{msg}</div>}
      {sets.map((z, j) => (
        <div className="custom-row" key={j}>
          <span className="slab-name">Set {j + 1}</span>
          <input type="text" value={z.size} maxLength={30} placeholder="Custom size / set" data-noenter="1"
            onChange={(e) => setSet(j, 'size', e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />
          <input type="number" inputMode="decimal" min="0" step="0.01" className="price" placeholder="WSP ₹" data-noenter="1"
            value={z.wsp} onChange={(e) => setSet(j, 'wsp', e.target.value)} />
          <input type="number" inputMode="decimal" min="0" step="0.01" className="price" placeholder="MRP ₹" data-noenter="1"
            value={z.mrp} onChange={(e) => setSet(j, 'mrp', e.target.value)} />
          <button type="button" className="slab-x" onClick={() => removeSet(j)} aria-label={`Remove set ${j + 1}`}>×</button>
        </div>
      ))}
      <button type="button" className="btn mint full" onClick={addSet} style={{ margin: '8px 0' }}>+ Add more</button>
      <div className="row">
        <button type="button" className="btn" style={{ flex: 1 }} onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn blue" style={{ flex: 1 }} onClick={onClose} disabled={busy}>Close</button>
      </div>
    </div>
  );
}
