// GST slabs per brand: [{ upto: 2500, pct: 5 }, { upto: null, pct: 18 }]
// A piece uses the first slab whose "up to" amount is >= its rate.
// A slab with no amount means "and above". Edited in Catalogue settings > GST slabs.
export const DEFAULT_SLABS = [
  { upto: 2500, pct: 5 },
  { upto: null, pct: 18 },
];

export function sortSlabs(slabs) {
  const list = Array.isArray(slabs) && slabs.length ? slabs : DEFAULT_SLABS;
  return [...list].sort((a, b) => (a.upto == null ? Infinity : a.upto) - (b.upto == null ? Infinity : b.upto));
}

export function gstPercent(rate, slabs) {
  if (rate == null) return null;
  const list = sortSlabs(slabs);
  const r = Number(rate);
  for (const s of list) {
    if (s.upto == null || r <= Number(s.upto)) return Number(s.pct);
  }
  return Number(list[list.length - 1].pct);
}

export function slabText(slabs) {
  const list = sortSlabs(slabs);
  let prev = null;
  return list.map((s) => {
    const part = s.upto == null
      ? (prev == null ? `${s.pct}% on all rates` : `${s.pct}% above Rs. ${Number(prev).toLocaleString('en-IN')}`)
      : `${s.pct}% up to Rs. ${Number(s.upto).toLocaleString('en-IN')}`;
    prev = s.upto;
    return part;
  }).join(', ');
}

export const round2 = (n) => Math.round(Number(n) * 100) / 100;

// "Slab 1  From ₹1  Up to ₹2,500  GST 5%" lines for the catalogue note
export function slabLines(slabs) {
  const list = sortSlabs(slabs);
  const f = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  let from = 1;
  return list.map((s, i) => {
    const line = `Slab ${i + 1}  From ${f(from)}  ${s.upto == null ? 'and above' : 'Up to ' + f(s.upto)}  GST ${s.pct}%`;
    if (s.upto != null) from = Number(s.upto) + 1;
    return line;
  });
}
