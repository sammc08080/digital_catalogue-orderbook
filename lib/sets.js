// Custom sets (Set 1, Set 2 ...) editing helpers, used in the Sizes tab,
// Category default sets and the product form.
// Each set: { size, pcs, wsp, mrp, off, base }. With "Use base rate", WSP = base + off.

const str = (v) => (v == null ? '' : String(v));
const num = (v) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v));

export function setsFrom(list) {
  const arr = Array.isArray(list) ? list : [];
  const withBase = arr.find((x) => x && x.base != null);
  const useBase = !!withBase;
  const rows = arr.map((x) => {
    const r = { size: x.size || '', pcs: str(x.pcs || 1), wsp: str(x.wsp), mrp: str(x.mrp), off: str(x.off) };
    return { ...r, orig: { ...r } };
  });
  return { useBase, base: useBase ? str(withBase.base) : '', baseOrig: useBase ? str(withBase.base) : '', rows };
}

export function emptyRow() {
  return { size: '', pcs: '1', wsp: '', mrp: '', off: '' };
}

// WSP per piece for a row
export function rowWsp(v, r) {
  if (!v.useBase) return num(r.wsp);
  const b = num(v.base);
  if (b == null) return null;
  return Math.round((b + (num(r.off) || 0)) * 100) / 100;
}

// What gets saved
export function setsToSave(v) {
  return v.rows
    .map((r) => ({ ...r, size: String(r.size).trim() }))
    .filter((r) => r.size)
    .map((r) => ({
      size: r.size,
      pcs: num(r.pcs) || 1,
      wsp: rowWsp(v, r),
      mrp: num(r.mrp),
      off: v.useBase ? num(r.off) || 0 : null,
      base: v.useBase ? num(v.base) : null,
    }));
}

// Changes to sets that already existed (to pass on to saved products)
export function setChanges(v) {
  const out = [];
  for (const r of v.rows) {
    const name = String(r.size).trim();
    if (!name || !r.orig || !r.orig.size) continue;
    const o = r.orig;
    const oldWsp = num(o.wsp);
    const newWsp = rowWsp(v, r);
    const c = { from: o.size, to: name };
    let any = name !== o.size;
    if (str(r.pcs) !== str(o.pcs)) { c.pcs = r.pcs; any = true; }
    if (newWsp !== oldWsp && newWsp != null) { c.wsp = newWsp; any = true; }
    if (str(r.mrp) !== str(o.mrp)) { c.mrp = r.mrp; any = true; }
    if (v.useBase) {
      const off = num(r.off) || 0;
      const base = num(v.base);
      if (str(r.off) !== str(o.off) || str(v.base) !== str(v.baseOrig)) { c.off = off; c.base = base; any = true; }
    }
    if (any) out.push(c);
  }
  return out;
}

export function checkSets(v, needWsp) {
  if (v.useBase && needWsp && num(v.base) == null) return 'Enter the Base WSP';
  for (const r of v.rows) {
    const name = String(r.size).trim();
    if (!name) continue;
    if (r.pcs !== '' && !(Number.isInteger(Number(r.pcs)) && Number(r.pcs) >= 1)) return `Enter valid Pcs for ${name}`;
    if (v.useBase && r.off !== '' && isNaN(Number(r.off))) return `Enter a valid ± ₹ for ${name}`;
    if (v.useBase && needWsp && (rowWsp(v, r) == null || rowWsp(v, r) < 0)) return `WSP for ${name} comes out below ₹0`;
  }
  return '';
}
