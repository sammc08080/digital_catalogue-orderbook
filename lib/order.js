import { sizeWsp } from './sizes';
import { gstPercent, round2 } from './gst';

// Quantity for one product: 1 article x colours x sizes, then x sets
export function lineQty(p, s) {
  if (!s || !s.on) return { pcs: 0, amount: null, formula: '' };
  const colourCount = (p.colours || []).length ? s.colours.length : 1;
  const sizes = (p.sizes || []).filter((z) => s.sizes.includes(z.size));
  const sets = Math.max(0, parseInt(s.sets, 10) || 0);
  const perSet = colourCount * sizes.length;
  const pcs = perSet * sets;
  let amount = null;
  const prices = sizes.map((z) => sizeWsp(z, p));
  if (sizes.length && prices.every((v) => v != null)) {
    amount = prices.reduce((a, b) => a + Number(b), 0) * colourCount * sets;
  }
  const formula = (p.colours || []).length
    ? `1 × ${colourCount} = ${colourCount}, ${colourCount} × ${sizes.length} = ${perSet} pcs × ${sets} set${sets === 1 ? '' : 's'} = ${pcs} pcs`
    : `1 × ${sizes.length} = ${perSet} pcs × ${sets} set${sets === 1 ? '' : 's'} = ${pcs} pcs`;
  return { pcs, amount, formula, colourCount, sizes, sets, perSet };
}

// Checks every ticked product before the PDF is made
export function checkOrder(products, sel) {
  const lines = products.filter((p) => sel[p.id] && sel[p.id].on && p.in_stock);
  if (!lines.length) return { error: 'Tick at least one product image to order.' };
  for (const p of lines) {
    const s = sel[p.id];
    if ((p.colours || []).length && !s.colours.length) return { error: `Select a colour for ${p.art_no}` };
    if (!s.sizes.length) return { error: `Select a size for ${p.art_no}` };
    if (!(parseInt(s.sets, 10) >= 1)) return { error: `Enter the number of sets for ${p.art_no}` };
  }
  return { lines };
}

// Short order summary for the brand's WhatsApp chat (the PDF is shared separately)
export function orderText(brand, customer, lines, categories, sel) {
  const rs = (n) => 'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const out = [`*New order - ${brand.name}*`, `Customer: ${customer.name}`, `Contact: ${customer.phone}`];
  if (String(customer.address || '').trim()) out.push(`Address: ${customer.address.trim()}`);
  if (String(customer.note || '').trim()) out.push(`Note: ${customer.note.trim()}`);
  out.push('');
  const rep = orderRows(lines, sel, categories, brand.gst_slabs);
  const colourNo = {};
  for (const r of rep.rows) {
    let colour = '';
    if (r.colour) {
      const key = r.art + '|' + r.colour.value;
      if (!colourNo[key]) colourNo[key] = Object.keys(colourNo).filter((k) => k.startsWith(r.art + '|')).length + 1;
      colour = ` | Colour ${colourNo[key]}`;
    }
    out.push(`${r.sr}. ${r.art}${colour} | ${r.size}`);
    out.push(r.rate != null
      ? `   Qty ${r.qty} x ${rs(r.rate)} = ${rs(r.amount)} + GST ${r.gstPct}% ${rs(r.gst)} = ${rs(r.total)}`
      : `   Qty ${r.qty} (no WSP)`);
  }
  out.push('');
  out.push(`Total qty: ${rep.totalQty}`);
  out.push(`Taxable value: ${rs(rep.taxable)}`);
  out.push(`GST: ${rs(rep.totalGst)}`);
  out.push(`*Grand total: ${rs(rep.grandTotal)}*`);
  out.push('(Order PDF shared separately)');
  return out.join('\n');
}

// Consolidated report: sizes of the same article + colour + rate clubbed into one row, with GST
export function orderRows(lines, sel, categories, slabs) {
  const rows = [];
  let totalQty = 0;
  let taxable = 0;
  let totalGst = 0;
  let allPriced = true;
  for (const p of lines) {
    const s = sel[p.id];
    const q = lineQty(p, s);
    const colours = (p.colours || []).length
      ? p.colours.map((c, i) => ({ c, i })).filter((x) => s.colours.includes(x.i)).map((x) => x.c)
      : [null];
    const c = (categories || []).find((x) => x.id === p.category_id);
    for (const col of colours) {
      // group this colour's sizes by rate, keeping size order
      const groups = [];
      for (const z of q.sizes) {
        const rate = sizeWsp(z, p);
        let g = groups.find((x) => x.rate === (rate == null ? null : Number(rate)));
        if (!g) { g = { rate: rate == null ? null : Number(rate), sizes: [] }; groups.push(g); }
        g.sizes.push(z.size);
      }
      for (const g of groups) {
        const qty = g.sizes.length * q.sets;
        const amount = g.rate == null ? null : round2(g.rate * qty);
        const gstPct = gstPercent(g.rate, slabs);
        const gst = amount == null ? null : round2((amount * gstPct) / 100);
        const total = amount == null ? null : round2(amount + gst);
        totalQty += qty;
        if (amount == null) allPriced = false;
        else { taxable += amount; totalGst += gst; }
        rows.push({
          sr: rows.length + 1, art: p.art_no, category: c ? c.name : '', colour: col,
          sizes: g.sizes, size: g.sizes.join(', '), qty, rate: g.rate, amount, gstPct, gst, total,
        });
      }
    }
  }
  taxable = round2(taxable);
  totalGst = round2(totalGst);
  return { rows, totalQty, taxable, totalGst, grandTotal: round2(taxable + totalGst), totalAmt: taxable, allPriced };
}
