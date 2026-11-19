'use client';

import { useState } from 'react';
import { api } from '../lib/client';
import { SIZE_GROUPS, CUSTOM } from '../lib/sizes';

// Catalogue settings > Sizes: this brand's own size lists
export default function SizeLists({ slug, groups, customSets, products, onSaved }) {
  const [list, setList] = useState(() => groups.map((g) => ({ name: g.name, sizes: [...g.sizes] })));
  const [adding, setAdding] = useState(() => groups.map(() => ''));
  // each saved row remembers how it was ("orig"), so changes can be passed on to products
  const toRow = (x) => {
    const r = { size: x.size || '', wsp: x.wsp == null ? '' : String(x.wsp), mrp: x.mrp == null ? '' : String(x.mrp) };
    return { ...r, orig: { ...r } };
  };
  const [sets, setSets] = useState(() => (customSets || []).map(toRow));
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

  // Custom sets: Set 1, Set 2 ... (default for every new product in this catalogue)
  const setSet = (j, key, v) => { setSaved(false); setSets(sets.map((x, m) => (m === j ? { ...x, [key]: v } : x))); };
  const addSet = () => { setSaved(false); setSets([...sets, { size: '', wsp: '', mrp: '' }]); };
  const removeSet = (j) => { setSaved(false); setSets(sets.filter((_, m) => m !== j)); };

  function reset() {
    if (!window.confirm('Put back the default sizes (0–38 and XS–6XL)? Sizes you added will be removed from the list.')) return;
    change(SIZE_GROUPS.map((g) => ({ name: g.name, sizes: [...g.sizes] })));
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const clean = list.map((g) => ({ ...g, sizes: g.sizes.map((z) => String(z).trim()).filter(Boolean) }));
      const custom = sets.map((x) => ({ ...x, size: String(x.size).trim() })).filter((x) => x.size);

      // what changed on sets that already existed: new name and/or new rates
      const changes = [];
      for (const x of custom) {
        if (!x.orig || !x.orig.size) continue;
        const renamed = x.size !== x.orig.size;
        const wspChanged = x.wsp !== x.orig.wsp;
        const mrpChanged = x.mrp !== x.orig.mrp;
        if (renamed || wspChanged || mrpChanged) {
          changes.push({ from: x.orig.size, to: x.size, wsp: wspChanged ? x.wsp : undefined, mrp: mrpChanged ? x.mrp : undefined });
        }
      }
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
        groups: [...clean, { name: CUSTOM, sizes: custom.map((x) => x.size), sets: custom.map(({ orig, ...x }) => x) }],
        changes: affected > 0 ? changes : [],
      });
      const next = d.size_groups.filter((g) => g.name !== CUSTOM).map((g) => ({ name: g.name, sizes: [...g.sizes] }));
      const cg = d.size_groups.find((g) => g.name === CUSTOM);
      setList(next);
      setSets(cg ? (cg.sets || cg.sizes.map((size) => ({ size }))).map(toRow) : []);
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
        <div className="section-title" style={{ marginTop: 6 }}>Custom ({sets.filter((x) => String(x.size).trim()).length})</div>
        <p className="muted" style={{ margin: '0 0 6px' }}>Default sets and rates for this catalogue. Every new product starts with these (you can still change them per product).</p>
        {sets.map((z, j) => (
          <div className="custom-row" key={j}>
            <span className="slab-name">Set {j + 1}</span>
            <input type="text" value={z.size} maxLength={30} placeholder="Custom size / set" data-noenter="1"
              onChange={(e) => setSet(j, 'size', e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }} />
            <input type="number" inputMode="decimal" min="0" step="0.01" className="price" placeholder="WSP ₹" data-noenter="1"
              value={z.wsp} onChange={(e) => setSet(j, 'wsp', e.target.value)} />
            <input type="number" inputMode="decimal" min="0" step="0.01" className="price" placeholder="MRP ₹" data-noenter="1"
              value={z.mrp} onChange={(e) => setSet(j, 'mrp', e.target.value)} />
            <button type="button" className="slab-x" onClick={() => removeSet(j)} aria-label={`Remove set ${j + 1}`}>×</button>
          </div>
        ))}
        <button type="button" className="btn mint full" onClick={addSet} style={{ marginTop: 8 }}>+ Add more</button>
      </div>

      <button className="btn full" disabled={busy} style={{ marginBottom: 10 }}>{busy ? 'Saving…' : 'Save sizes'}</button>
      <button type="button" className="btn full blue" onClick={reset}>Reset to default sizes</button>
    </form>
  );
}
