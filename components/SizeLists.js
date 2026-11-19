'use client';

import { useState } from 'react';
import { api } from '../lib/client';
import { SIZE_GROUPS, CUSTOM } from '../lib/sizes';
import { setsFrom, setsToSave, setChanges, checkSets } from '../lib/sets';
import SetEditor from './SetEditor';

// Catalogue settings > Sizes: this brand's own size lists
export default function SizeLists({ slug, groups, customSets, products, onSaved }) {
  const [list, setList] = useState(() => groups.map((g) => ({ name: g.name, sizes: [...g.sizes] })));
  const [adding, setAdding] = useState(() => groups.map(() => ''));
  const [sv, setSv] = useState(() => setsFrom(customSets));
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

  // Save, then reset the Custom sets of ALL products (old and new) to the defaults
  async function applyAll() {
    setError('');
    const problem = checkSets(sv, false);
    if (problem) return setError(problem);
    const n = (products || []).length;
    if (!window.confirm(`Reset the Custom sets of all ${n} product(s) to these defaults (names, Pcs, rates)? Products in a category with its own Default sets get that category's sets. Normal sizes are not touched.`)) return;
    setBusy(true);
    try {
      const clean = list.map((g) => ({ ...g, sizes: g.sizes.map((z) => String(z).trim()).filter(Boolean) }));
      const custom = setsToSave(sv);
      const d1 = await api('/api/business', {
        action: 'saveSizes', slug,
        groups: [...clean, { name: CUSTOM, sizes: custom.map((x) => x.size), sets: custom }],
        changes: [],
      });
      const d2 = await api('/api/business', { action: 'applyDefaults', slug, scope: 'album' });
      const cg = d1.size_groups.find((g) => g.name === CUSTOM);
      setSv(setsFrom(cg ? (cg.sets || []) : []));
      onSaved(d1.size_groups, d2.products);
      setSaved(`Saved and applied to ${d2.updated || 0} product(s).`);
    } catch (e2) {
      setError(e2.message);
    }
    setBusy(false);
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const clean = list.map((g) => ({ ...g, sizes: g.sizes.map((z) => String(z).trim()).filter(Boolean) }));
      const problem = checkSets(sv, false);
      if (problem) { setError(problem); setBusy(false); return; }
      const custom = setsToSave(sv);
      const changes = setChanges(sv);
      const hit = (pr, name) => (pr.sizes || []).some((z) => z.custom && String(z.size).toUpperCase() === name.toUpperCase());
      const affected = (products || []).filter((pr) => changes.some((c) => hit(pr, c.from))).length;
      if (affected > 0) {
        const what = changes.map((c) => (c.from !== c.to ? `"${c.from}" → "${c.to}"` : `"${c.from}"`)).join(', ');
        if (!window.confirm(`This will also update ${what} in ${affected} product${affected === 1 ? '' : 's'} already in this catalogue. OK?`)) {
          setBusy(false);
          return;
        }
      }
      const d = await api('/api/business', {
        action: 'saveSizes', slug,
        groups: [...clean, { name: CUSTOM, sizes: custom.map((x) => x.size), sets: custom }],
        changes: affected > 0 ? changes : [],
      });
      const next = d.size_groups.filter((g) => g.name !== CUSTOM).map((g) => ({ name: g.name, sizes: [...g.sizes] }));
      const cg = d.size_groups.find((g) => g.name === CUSTOM);
      setList(next);
      setSv(setsFrom(cg ? (cg.sets || cg.sizes.map((size) => ({ size }))) : []));
      setAdding(next.map(() => ''));
      onSaved(d.size_groups, d.products);
      setSaved(affected > 0 ? `Sizes saved. ${d.updated || 0} product(s) updated.` : 'Sizes saved.');
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
      {saved && <div className="ok" style={{ wordBreak: 'normal' }}>{saved === true ? 'Sizes saved.' : saved}</div>}

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

      <div style={{ marginBottom: 16 }}>
        <div className="section-title" style={{ marginTop: 6 }}>Custom ({sv.rows.filter((x) => String(x.size).trim()).length})</div>
        <p className="muted" style={{ margin: '0 0 6px' }}>Default sets and rates for this catalogue. Every new product starts with these (you can still change them per product).</p>
        <SetEditor value={sv} onChange={(v) => { setSaved(false); setSv(v); }} />
      </div>

      <button className="btn full" disabled={busy} style={{ marginBottom: 10 }}>{busy ? 'Saving…' : 'Save sizes'}</button>
      <button type="button" className="btn full mint" disabled={busy} onClick={applyAll} style={{ marginBottom: 10 }}>Apply to all products</button>
      <button type="button" className="btn full blue" onClick={reset}>Reset to default sizes</button>
    </form>
  );
}
