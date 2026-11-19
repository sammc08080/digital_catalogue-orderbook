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

  // Save, then reset the Custom sets of ALL products in this category to these defaults
  async function applyAll() {
    setError('');
    setMsg('');
    const problem = checkSets(sv, false);
    if (problem) return setError(problem);
    const n = products.filter((p) => p.category_id === category.id).length;
    if (!window.confirm(`Reset the Custom sets of all ${n} product(s) in "${category.name}" to these defaults (names, Pcs, rates)? Normal sizes are not touched.`)) return;
    setBusy(true);
    try {
      await api('/api/business', { action: 'saveCategorySets', slug, id: category.id, sets: setsToSave(sv), changes: [] });
      const d = await api('/api/business', { action: 'applyDefaults', slug, scope: 'category', id: category.id });
      const saved = (d.categories || []).find((c) => c.id === category.id);
      setSv(setsFrom(saved ? saved.default_sets : []));
      onSaved(d);
      setMsg(`Saved and applied to ${d.updated || 0} product(s).`);
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

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
      <button type="button" className="btn mint full" onClick={applyAll} disabled={busy} style={{ marginTop: 8 }}>Apply to all products in this category</button>
    </div>
  );
}
