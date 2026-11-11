'use client';

import { ColourBox, SizeBox, productTitle } from './ProductCard';
import { lineQty } from '../lib/order';

// Product in the main catalogue: tick the image box first, then colours, sizes and sets
export default function OrderCard({ p, categories, sel, onChange }) {
  const s = sel || { on: false, colours: [], sizes: [], sets: '1' };
  const on = s.on && p.in_stock;
  const colours = p.colours || [];
  const q = lineQty(p, s);

  const toggle = (key, val) => {
    const list = s[key].includes(val) ? s[key].filter((x) => x !== val) : [...s[key], val];
    onChange({ ...s, [key]: list });
  };

  return (
    <div className={'product' + (p.in_stock ? '' : ' out') + (on ? ' picked' : '')}>
      <div className="photo-wrap" onClick={() => p.in_stock && onChange({ ...s, on: !s.on })}>
        {p.photo_url ? <img className="photo" src={p.photo_url} alt={p.art_no} loading="lazy" />
          : <div className="photo-ph">No image</div>}
        <span className={'pick-box' + (on ? ' on' : '')}>{on ? '✓' : ''}</span>
      </div>
      <div className="body">
        <div className="art">{productTitle(p, categories)}</div>
        {!p.in_stock && <div><span className="badge-out">Out of stock</span></div>}

        <div className={'options' + (on ? '' : ' locked')}>
          {colours.length > 0 && (
            <>
              <div className="opt-label">Colour</div>
              <div className="box-row">
                {colours.map((c, i) => (
                  <ColourBox key={i} c={c} disabled={!on} selected={on && s.colours.includes(i)} onClick={() => toggle('colours', i)} />
                ))}
              </div>
            </>
          )}
          <div className="opt-label">Size</div>
          <div className="box-row">
            {(p.sizes || []).map((z) => (
              <SizeBox key={z.size} s={z} p={p} disabled={!on} selected={on && s.sizes.includes(z.size)} onClick={() => toggle('sizes', z.size)} />
            ))}
          </div>
          <label className="opt-label" style={{ display: 'block' }}>No. of sets
            <input type="number" inputMode="numeric" min="1" disabled={!on} value={on ? s.sets : ''}
              onChange={(e) => onChange({ ...s, sets: e.target.value })} style={{ marginTop: 4, padding: '7px 10px' }} />
          </label>
          {on && q.pcs > 0 && (
            <div className="calc">{q.formula}</div>
          )}
        </div>
      </div>
    </div>
  );
}
