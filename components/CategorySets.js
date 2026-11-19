'use client';

import { useState } from 'react';
import { api } from '../lib/client';
import { setsFrom, setsToSave, setChanges, checkSets } from '../lib/sets';
import SetEditor from './SetEditor';

// Categories tab > Default sets for one category (Pcs, base rate with ± ₹, WSP, MRP)
export default function CategorySets({ slug, category, products, onSaved, onClose }) {
  const [sv, setSv] = useState(() => setsFrom(category.default_sets));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function save() {
    setError('');
    setMsg('');
    const problem = checkSets(sv, false);
    if (problem) return setError(problem);
    const list = setsToSave(sv);
    const changes = setChanges(sv);
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
        action: 'saveCategorySets', slug, id: category.id, sets: list, changes: affected > 0 ? changes : [],
      });
      const saved = (d.categories || []).find((c) => c.id === category.id);
      setSv(setsFrom(saved ? saved.default_sets : []));
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
      <SetEditor value={sv} onChange={(v) => { setMsg(''); setSv(v); }} />
      <div className="row">
        <button type="button" className="btn" style={{ flex: 1 }} onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn blue" style={{ flex: 1 }} onClick={onClose} disabled={busy}>Close</button>
      </div>
    </div>
  );
}
