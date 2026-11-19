import { rupees } from '../lib/client';
import { sizeWsp, sizeMrp, sizePcs } from '../lib/sizes';

// colour box with its name underneath (when it has one)
export function NamedColour({ c, selected, onClick, disabled }) {
  return (
    <span className="colour-item">
      <ColourBox c={c} selected={selected} onClick={onClick} disabled={disabled} />
      {c.name && <span className="colour-label">{c.name}</span>}
    </span>
  );
}

export function ColourBox({ c, selected, onClick, disabled }) {
  const style = c.type === 'photo'
    ? { backgroundImage: `url("${c.value}")` }
    : { backgroundColor: c.value };
  return (
    <button type="button" className={'colour-box' + (selected ? ' sel' : '')} style={style} title={c.name || undefined}
      onClick={onClick} disabled={disabled} aria-pressed={!!selected}>
      {selected && <span className="tick">✓</span>}
    </button>
  );
}

export function SizeBox({ s, p, selected, onClick, disabled }) {
  const w = sizeWsp(s, p);
  const m = sizeMrp(s, p);
  return (
    <button type="button" className={'size-box' + (selected ? ' sel' : '')} onClick={onClick}
      disabled={disabled} aria-pressed={!!selected}>
      {selected && <span className="tick">✓</span>}
      <span className="sz">{s.size}</span>
      {sizePcs(s) > 1 && <span className="pr">{sizePcs(s)} pcs</span>}
      {w != null && <span className="pr">WSP {rupees(w)}</span>}
      {m != null && <span className="pr">MRP {rupees(m)}</span>}
    </button>
  );
}

export function productTitle(p, categories) {
  const c = (categories || []).find((x) => x.id === p.category_id);
  return c ? `${c.name} / ${p.art_no}` : p.art_no;
}

// Product as shown in Catalogue settings (view only)
export default function ProductCard({ p, categories, children }) {
  return (
    <div className={'product' + (p.in_stock ? '' : ' out')}>
      {p.photo_url ? <img className="photo" src={p.photo_url} alt={p.art_no} loading="lazy" />
        : <div className="photo-ph">No image</div>}
      <div className="body">
        <div className="art">{productTitle(p, categories)}</div>
        {(p.colours || []).length > 0 && (
          <div className="box-row">{p.colours.map((c, i) => <NamedColour key={i} c={c} disabled />)}</div>
        )}
        <div className="box-row">{(p.sizes || []).map((s) => <SizeBox key={s.size} s={s} p={p} disabled />)}</div>
        {!p.in_stock && <div><span className="badge-out">Out of stock</span></div>}
        {children}
      </div>
    </div>
  );
}
