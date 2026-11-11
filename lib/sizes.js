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

// The brand's own size lists (or the defaults)
export function brandSizeGroups(biz) {
  const g = biz && Array.isArray(biz.size_groups) && biz.size_groups.length ? biz.size_groups : SIZE_GROUPS;
  return g.map((x) => ({ name: x.name, sizes: Array.isArray(x.sizes) ? x.sizes : [] }));
}

export function brandSizes(biz) {
  return brandSizeGroups(biz).flatMap((g) => g.sizes);
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
