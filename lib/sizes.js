// Default size lists for every brand. Each brand can add/remove sizes in Catalogue settings > Sizes.
export const SIZE_GROUPS = [
  {
    name: 'Numbers',
    sizes: ['0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '14', '16', '18', '20', '22', '24', '26', '28', '30', '32', '34', '36', '38'],
  },
  {
    name: 'Standard',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'],
  },
];

export const SIZES = SIZE_GROUPS.flatMap((g) => g.sizes);

export const CUSTOM = 'Custom';

// Default Custom sets for this catalogue (Sizes tab) with default WSP / MRP;
// each new product starts with these: [{ size, wsp, mrp }]
export function brandCustomSets(biz) {
  const g = biz && Array.isArray(biz.size_groups) ? biz.size_groups.find((x) => x.name === CUSTOM) : null;
  if (!g) return [];
  if (Array.isArray(g.sets)) return g.sets.map((x) => ({ size: x.size, pcs: x.pcs || 1, wsp: x.wsp ?? null, mrp: x.mrp ?? null, off: x.off ?? null, base: x.base ?? null }));
  return (Array.isArray(g.sizes) ? g.sizes : []).map((size) => ({ size, pcs: 1, wsp: null, mrp: null }));
}

// The brand's own size lists (or the defaults), without the Custom sets
export function brandSizeGroups(biz) {
  const g = biz && Array.isArray(biz.size_groups) && biz.size_groups.length ? biz.size_groups : SIZE_GROUPS;
  return g.filter((x) => x.name !== 'Custom').map((x) => ({ name: x.name, sizes: Array.isArray(x.sizes) ? x.sizes : [] }));
}

export function brandSizes(biz) {
  return brandSizeGroups(biz).flatMap((g) => g.sizes);
}

// Pieces in one size box: normal sizes = 1, a Custom set can hold several (e.g. 18-20-22 = 3)
export function sizePcs(s) {
  const n = parseInt(s && s.pcs, 10);
  return n >= 1 ? n : 1;
}

// Prices per size: { size, wsp, mrp }. Older saved products used "price" + price_type.
export function sizeWsp(s, p) {
  if (s.wsp != null) return s.wsp;
  if (s.price != null && !(p && p.price_type === 'MRP')) return s.price;
  return null;
}

export function sizeMrp(s, p) {
  if (s.mrp != null) return s.mrp;
  if (s.price != null && p && p.price_type === 'MRP') return s.price;
  return null;
}
