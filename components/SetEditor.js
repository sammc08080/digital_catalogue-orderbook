'use client';

import { emptyRow, rowWsp } from '../lib/sets';

// Custom sets editor: optional Base WSP with ± ₹ per set, Pcs, WSP, MRP, × and + Add more
export default function SetEditor({ value, onChange, showWsp = true, showMrp = true, baseHint = false }) {
  const v = value;
  const setRow = (j, key, val) => onChange({ ...v, rows: v.rows.map((r, m) => (m === j ? { ...r, [key]: val } : r)) });
  const add = () => onChange({ ...v, rows: [...v.rows, emptyRow()] });
  const remove = (j) => onChange({ ...v, rows: v.rows.filter((_, m) => m !== j) });
  const stop = (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } };

  return (
    <div>
      {showWsp && (
        <div className="base-row">
          <label className="check">
            <input type="checkbox" checked={v.useBase} onChange={(e) => onChange({ ...v, useBase: e.target.checked })} />
            Use base rate
          </label>
          {v.useBase && (
            <label className="base-field">Base WSP ₹
              <input type="number" inputMode="decimal" min="0" step="0.01" value={v.base} data-noenter="1" onKeyDown={stop}
                placeholder={baseHint ? 'per product' : ''} onChange={(e) => onChange({ ...v, base: e.target.value })} />
            </label>
          )}
        </div>
      )}

      {baseHint && v.useBase && (
        <p className="muted" style={{ margin: '0 0 6px', fontSize: 12 }}>
          Leave Base empty to type it on each product; the ± pattern will still apply.
        </p>
      )}
      {v.rows.map((r, j) => {
        const w = rowWsp(v, r);
        return (
          <div className="custom-row" key={j}>
            <span className="slab-name">Set {j + 1}</span>
            <input type="text" value={r.size} maxLength={30} placeholder="Custom size / set" data-noenter="1" onKeyDown={stop}
              onChange={(e) => setRow(j, 'size', e.target.value)} />
            <input type="number" inputMode="numeric" min="1" step="1" className="pcs" placeholder="Pcs" title="Pieces in this set"
              data-noenter="1" onKeyDown={stop} value={r.pcs} onChange={(e) => setRow(j, 'pcs', e.target.value)} />
            {showWsp && (v.useBase ? (
              <>
                <input type="number" inputMode="decimal" step="0.01" className="price" placeholder="± ₹" title="Plus / minus from base (e.g. -30 or 60)"
                  data-noenter="1" onKeyDown={stop} value={r.off} onChange={(e) => setRow(j, 'off', e.target.value)} />
                <span className="calc-wsp">= {w == null
                  ? `Base ${Number(r.off) < 0 ? '−' : '+'} ${Math.abs(Number(r.off) || 0)}`
                  : '₹' + w.toLocaleString('en-IN')}</span>
              </>
            ) : (
              <input type="number" inputMode="decimal" min="0" step="0.01" className="price" placeholder="WSP ₹"
                data-noenter="1" onKeyDown={stop} value={r.wsp} onChange={(e) => setRow(j, 'wsp', e.target.value)} />
            ))}
            {showMrp && (
              <input type="number" inputMode="decimal" min="0" step="0.01" className="price" placeholder="MRP ₹"
                data-noenter="1" onKeyDown={stop} value={r.mrp} onChange={(e) => setRow(j, 'mrp', e.target.value)} />
            )}
            <button type="button" className="slab-x" onClick={() => remove(j)} aria-label={`Remove set ${j + 1}`}>×</button>
          </div>
        );
      })}
      <button type="button" className="btn mint full" onClick={add} style={{ margin: '8px 0' }}>+ Add more</button>
    </div>
  );
}
