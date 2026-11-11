import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { lineQty, orderRows } from './order';
import { slabText } from './gst';
import { sizeWsp } from './sizes';
import { productTitle } from '../components/ProductCard';

const BROWN = rgb(0.357, 0.275, 0.212);
const SOFT = rgb(0.54, 0.45, 0.38);
const LINE = rgb(0.92, 0.87, 0.81);

// PDF standard fonts can't print every symbol, so swap the few we use
function clean(t) {
  return String(t == null ? '' : t)
    .replace(/₹/g, 'Rs.')
    .replace(/×/g, 'x')
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '?');
}

function money(n) {
  return 'Rs. ' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image'));
    img.src = src;
  });
}

// Any image (link or data) -> JPEG bytes, shrunk for a small PDF
async function jpegBytes(src, max = 400) {
  try {
    let url = src;
    let revoke = null;
    if (!src.startsWith('data:')) {
      const r = await fetch(src);
      const blob = await r.blob();
      url = URL.createObjectURL(blob);
      revoke = url;
    }
    const img = await loadImg(url);
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * scale));
    c.height = Math.max(1, Math.round(img.height * scale));
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    if (revoke) URL.revokeObjectURL(revoke);
    const b64 = c.toDataURL('image/jpeg', 0.8).split(',')[1];
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch (e) {
    return null;
  }
}

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function wrap(text, font, size, width) {
  const out = [];
  for (const para of clean(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const t = line ? line + ' ' + word : word;
      if (font.widthOfTextAtSize(t, size) > width && line) {
        out.push(line);
        line = word;
      } else line = t;
    }
    out.push(line);
  }
  return out;
}

// mode 'full' = product pictures + summary table, 'report' = summary table only
export async function buildOrderPdf({ brand, customer, products, categories, sel, mode = 'full' }) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28;
  const H = 841.89;
  const M = 36;
  let page = doc.addPage([W, H]);
  let y = H - M;

  const text = (t, x, size = 10, f = font, color = BROWN) => page.drawText(clean(t), { x, y, size, font: f, color });
  const newPage = () => { page = doc.addPage([W, H]); y = H - M; };
  const need = (h) => { if (y - h < M) newPage(); };

  // ---- Brand ----
  let tx = M;
  if (brand.logo_url) {
    const b = await jpegBytes(brand.logo_url, 200);
    if (b) {
      const img = await doc.embedJpg(b);
      page.drawImage(img, { x: M, y: y - 50, width: 50, height: 50 });
      tx = M + 62;
    }
  }
  y -= 16; text(brand.name, tx, 16, bold);
  const contact = [brand.contact_person, brand.contact_number].filter(Boolean).join(' · ');
  if (contact) { y -= 14; text(contact, tx, 10, font, SOFT); }
  for (const l of wrap(brand.address || '', font, 9, W - tx - M).filter(Boolean).slice(0, 3)) { y -= 12; text(l, tx, 9, font, SOFT); }
  y = Math.min(y, H - M - 54) - 12;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: LINE });

  // ---- Order + customer ----
  y -= 20; text('ORDER', M, 14, bold);
  const d = new Date();
  const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  page.drawText(clean(dateStr), { x: W - M - font.widthOfTextAtSize(clean(dateStr), 10), y, size: 10, font, color: SOFT });
  y -= 18; text('Customer: ' + customer.name, M, 11, bold);
  y -= 14; text('Contact: ' + customer.phone, M, 10);
  if (String(customer.address || '').trim()) {
    for (const [i, l] of wrap('Address: ' + customer.address, font, 10, W - 2 * M).entries()) { y -= 13; text(l, i ? M + 44 : M, 10); }
  }
  if (String(customer.note || '').trim()) {
    for (const [i, l] of wrap('Note: ' + customer.note.trim(), font, 10, W - 2 * M).entries()) { y -= 13; text(l, i ? M + 30 : M, 10); }
  }
  y -= 10;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: LINE });

  // ---- Products ----
  const IMG_W = 72;
  const IMG_H = 96;
  const TX = M + IMG_W + 14;
  const TW = W - TX - M;

  let n = 0;
  for (const p of (mode === 'report' ? [] : products)) {
    const s = sel[p.id];
    const q = lineQty(p, s);
    n += 1;

    const sizeText = q.sizes.map((z) => {
      const w = sizeWsp(z, p);
      return w != null ? `${z.size} (${money(w)})` : z.size;
    }).join(', ');
    const sizeLines = wrap(`Sizes (${q.sizes.length}): ${sizeText}`, font, 10, TW);
    const blockH = Math.max(IMG_H, 20 + 18 + sizeLines.length * 13 + 30 + 14) + 16;
    need(blockH);

    const top = y - 12;
    if (p.photo_url) {
      const b = await jpegBytes(p.photo_url);
      if (b) {
        const img = await doc.embedJpg(b);
        const sc = Math.min(IMG_W / img.width, IMG_H / img.height);
        const iw = img.width * sc;
        const ih = img.height * sc;
        page.drawImage(img, { x: M + (IMG_W - iw) / 2, y: top - IMG_H + (IMG_H - ih), width: iw, height: ih });
      }
    } else {
      page.drawRectangle({ x: M, y: top - IMG_H, width: IMG_W, height: IMG_H, color: rgb(0.87, 0.91, 0.95) });
    }

    y = top - 12;
    text(`${n}. ${productTitle(p, categories)}`, TX, 12, bold);

    // colours
    y -= 20;
    const chosen = (p.colours || []).filter((_, i) => s.colours.includes(i));
    if (chosen.length) {
      text(`Colours (${chosen.length}):`, TX, 10);
      let cx = TX + font.widthOfTextAtSize(`Colours (${chosen.length}):`, 10) + 6;
      for (const c of chosen) {
        if (cx > W - M - 16) break;
        if (c.type === 'swatch') {
          page.drawRectangle({ x: cx, y: y - 3, width: 14, height: 14, color: hexRgb(c.value), borderColor: LINE, borderWidth: 0.8 });
        } else {
          const b = await jpegBytes(c.value, 60);
          if (b) {
            const img = await doc.embedJpg(b);
            page.drawImage(img, { x: cx, y: y - 3, width: 14, height: 14 });
          }
        }
        cx += 18;
      }
    } else {
      text('Colours: -', TX, 10);
    }

    for (const l of sizeLines) { y -= 14; text(l, TX, 10); }
    y -= 16; text(clean(q.formula), TX, 10, bold);
    y -= 14;
    text(q.amount != null ? `Amount (WSP, before GST): ${money(q.amount)}` : 'Amount (WSP): -', TX, 10);

    y = Math.min(y, top - IMG_H) - 12;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: LINE });
  }

  // ---- Order summary table (sizes clubbed, with GST) ----
  const rep = orderRows(products, sel, categories, brand.gst_slabs);
  const m2 = (n) => 'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const TW_ALL = W - 2 * M;
  const widths = [24, 92, 40, 117, 34, 56, 70, TW_ALL - (24 + 92 + 40 + 117 + 34 + 56 + 70)];
  const heads = ['Sr.', 'Art no.', 'Colour', 'Size', 'Qty', 'Rate', 'GST', 'Total'];
  const rightCols = [4, 5, 6, 7];
  const cols = [];
  let cxp = M;
  widths.forEach((w, i) => { cols.push({ x: cxp, w, right: rightCols.includes(i) }); cxp += w; });
  const PAD = 5;
  const put = (t, col, yy, f = font, size = 8.5, color = BROWN) => {
    const str = clean(t);
    const x = col.right ? col.x + col.w - PAD - f.widthOfTextAtSize(str, size) : col.x + PAD;
    page.drawText(str, { x, y: yy, size, font: f, color });
  };
  const HEAD_H = 18;
  const header = () => {
    page.drawRectangle({ x: M, y: y - HEAD_H, width: TW_ALL, height: HEAD_H, color: rgb(0.875, 0.91, 0.945) });
    heads.forEach((h, i) => put(h, cols[i], y - HEAD_H + 6, bold, 8.5));
    y -= HEAD_H;
  };

  need(70);
  y -= 26; text('ORDER SUMMARY', M, 12, bold);
  y -= 8; header();

  for (const r of rep.rows) {
    const sizeLines = wrap(r.size, font, 8.5, cols[3].w - 2 * PAD);
    const lines = Math.max(2, sizeLines.length);
    const RH = 8 + lines * 11;
    if (y - RH < M + 24) { newPage(); header(); }
    const top = y;
    const base = top - 13;
    put(String(r.sr), cols[0], base);
    wrap(r.art, font, 8.5, cols[1].w - 2 * PAD).slice(0, 2).forEach((l, i) => put(l, cols[1], base - i * 11));
    if (r.colour) {
      if (r.colour.type === 'swatch') {
        page.drawRectangle({ x: cols[2].x + PAD, y: base - 2, width: 11, height: 11, color: hexRgb(r.colour.value), borderColor: LINE, borderWidth: 0.6 });
      } else {
        const bts = await jpegBytes(r.colour.value, 40);
        if (bts) page.drawImage(await doc.embedJpg(bts), { x: cols[2].x + PAD, y: base - 2, width: 11, height: 11 });
      }
    } else put('-', cols[2], base);
    sizeLines.forEach((l, i) => put(l, cols[3], base - i * 11));
    put(String(r.qty), cols[4], base);
    put(r.rate != null ? m2(r.rate) : '-', cols[5], base);
    if (r.gst != null) {
      put(`${r.gstPct}%`, cols[6], base);
      put(m2(r.gst), cols[6], base - 11, font, 7.5, SOFT);
      put(m2(r.total), cols[7], base, bold);
      put(`${m2(r.amount)} + GST`, cols[7], base - 11, font, 7, SOFT);
    } else {
      put('-', cols[6], base);
      put('-', cols[7], base);
    }
    y = top - RH;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: LINE });
  }

  // total row
  if (y - 20 < M + 24) newPage();
  page.drawRectangle({ x: M, y: y - 20, width: TW_ALL, height: 20, color: rgb(0.75, 0.89, 0.82) });
  put('Total', cols[1], y - 14, bold, 9.5);
  put(String(rep.totalQty), cols[4], y - 14, bold, 9.5);
  put(m2(rep.totalGst), cols[6], y - 14, bold, 9);
  put(m2(rep.grandTotal), cols[7], y - 14, bold, 9);
  y -= 20;

  // totals block
  need(80);
  const tl = [
    ['Total qty', `${rep.totalQty} pcs`],
    ['Taxable value', m2(rep.taxable)],
    ['GST', m2(rep.totalGst)],
    ['Grand total', m2(rep.grandTotal) + (rep.allPriced ? '' : ' *')],
  ];
  y -= 6;
  tl.forEach(([k, v], i) => {
    const last = i === tl.length - 1;
    y -= last ? 17 : 14;
    const f = last ? bold : font;
    const size = last ? 12 : 10;
    page.drawText(clean(k), { x: W - M - 230, y, size, font: f, color: BROWN });
    page.drawText(clean(v), { x: W - M - f.widthOfTextAtSize(clean(v), size), y, size, font: f, color: BROWN });
  });
  y -= 16;
  text(`Rate = WSP per piece, before GST. GST per piece: ${slabText(brand.gst_slabs)}.` +
    (rep.allPriced ? '' : ' * Items without WSP are not included.'), M, 7.5, font, SOFT);

  // footer on every page
  const pages = doc.getPages();
  pages.forEach((pg, i) => {
    const f = clean(`Powered by TechIngen Solutions   ·   Page ${i + 1} of ${pages.length}`);
    pg.drawText(f, { x: (W - font.widthOfTextAtSize(f, 8)) / 2, y: 18, size: 8, font, color: SOFT });
  });

  return doc.save();
}
