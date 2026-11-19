import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { SIZES } from './sizes';

export const BUCKET = 'cob-images';

let _db;
export function db() {
  if (!_db) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in Vercel settings');
    }
    _db = createClient(url, key, { auth: { persistSession: false } });
  }
  return _db;
}

function secret() {
  return process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-secret';
}

export function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('hex');
}

export function safeEqual(a, b) {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

export function checkPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(String(password), salt, 32).toString('hex');
  return safeEqual(hash, test);
}

export const cookieOpts = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
};

export const ADMIN_COOKIE = 'cob_admin';

export function adminToken() {
  return sign('admin:' + (process.env.ADMIN_PASSWORD || ''));
}

export function isAdmin(req) {
  if (!process.env.ADMIN_PASSWORD) return false;
  const v = req.cookies.get(ADMIN_COOKIE)?.value;
  return !!v && safeEqual(v, adminToken());
}

export function ownerCookieName(slug) {
  return 'cob_o_' + slug;
}

export function ownerToken(biz) {
  return sign('owner:' + biz.id + ':' + biz.password_hash);
}

export function isOwner(req, biz) {
  const v = req.cookies.get(ownerCookieName(biz.slug))?.value;
  return !!v && safeEqual(v, ownerToken(biz));
}

export function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message, status = 400, extra = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function uploadDataUrl(dataUrl, folder) {
  const m = /^data:(image\/[a-z+.-]+);base64,(.+)$/.exec(dataUrl || '');
  if (!m) throw new Error('Invalid image');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 4 * 1024 * 1024) throw new Error('Image is too large');
  const ext = m[1] === 'image/png' ? 'png' : 'jpg';
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db().storage.from(BUCKET).upload(path, buf, {
    contentType: m[1],
    upsert: false,
  });
  if (error) throw new Error('Image upload failed: ' + error.message);
  return db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function removeByUrl(url) {
  try {
    if (!url) return;
    const marker = `/object/public/${BUCKET}/`;
    const i = url.indexOf(marker);
    if (i < 0) return;
    await db().storage.from(BUCKET).remove([decodeURIComponent(url.slice(i + marker.length))]);
  } catch (e) {
    // ignore: a leftover image file does no harm
  }
}

export async function removeFolder(folder) {
  try {
    const { data } = await db().storage.from(BUCKET).list(folder, { limit: 1000 });
    if (data && data.length) {
      await db().storage.from(BUCKET).remove(data.map((f) => `${folder}/${f.name}`));
    }
  } catch (e) {
    // ignore
  }
}

export function slugify(s) {
  return (
    String(s)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'business'
  );
}

// Keeps only allowed sizes, in the brand's order, each with its WSP and/or MRP
export function cleanSizes(sizes, useWsp, useMrp, allowed) {
  if (!Array.isArray(sizes)) return [];
  const order = Array.isArray(allowed) && allowed.length ? allowed : SIZES;
  const out = [];
  const num = (v, label, size) => {
    const n = Number(v);
    if (v === '' || v == null || !isFinite(n) || n < 0) throw new Error(`Enter a valid ${label} for size ${size}`);
    return Math.round(n * 100) / 100;
  };
  for (const s of order) {
    const row = sizes.find((x) => x && x.size === s);
    if (!row) continue;
    out.push({
      size: s,
      wsp: useWsp ? num(row.wsp, 'WSP', s) : null,
      mrp: useMrp ? num(row.mrp, 'MRP', s) : null,
    });
  }
  return out;
}

// Size lists edited in Catalogue settings > Sizes
export function cleanSizeGroups(groups) {
  if (!Array.isArray(groups) || !groups.length) throw new Error('Add at least one size');
  const seen = new Set();
  const out = [];
  const rate = (v, label, size) => {
    if (v === '' || v == null) return null;
    const n = Number(v);
    if (!isFinite(n) || n < 0) throw new Error(`Enter a valid ${label} for ${size}`);
    return Math.round(n * 100) / 100;
  };
  for (const g of groups.slice(0, 10)) {
    const name = String((g && g.name) || '').trim().slice(0, 30) || 'Sizes';
    // Custom sets keep a default WSP / MRP each
    if (name === 'Custom' && Array.isArray(g.sets)) {
      const sets = [];
      for (const x of g.sets) {
        const v = String((x && x.size) || '').trim();
        if (!v) continue;
        if (v.length > 30) throw new Error(`Size "${v}" is too long (max 30 letters)`);
        const key = v.toUpperCase();
        if (seen.has(key)) throw new Error(`Size "${v}" is listed twice`);
        seen.add(key);
        sets.push({ size: v, pcs: cleanPcs(x.pcs, v), wsp: rate(x.wsp, 'WSP', v), mrp: rate(x.mrp, 'MRP', v), ...cleanBase(x) });
      }
      out.push({ name, sizes: sets.map((x) => x.size), sets });
      continue;
    }
    const sizes = [];
    for (const raw of Array.isArray(g.sizes) ? g.sizes : []) {
      const v = String(raw || '').trim();
      if (!v) continue;
      if (v.length > 30) throw new Error(`Size "${v}" is too long (max 30 letters)`);
      const key = v.toUpperCase();
      if (seen.has(key)) throw new Error(`Size "${v}" is listed twice`);
      seen.add(key);
      sizes.push(v);
    }
    out.push({ name, sizes });
  }
  if (seen.size === 0) throw new Error('Add at least one size');
  if (!out.some((g) => g.name === 'Custom')) out.push({ name: 'Custom', sizes: [], sets: [] });
  if (seen.size > 150) throw new Error('Too many sizes (max 150)');
  return out;
}

// ---------- Admins (companies) ----------
export const COMPANY_COOKIE = 'cob_company';

export function companyToken(adm) {
  return adm.id + '.' + sign('company:' + adm.id + ':' + adm.password_hash);
}

export async function companyFromReq(req) {
  const v = req.cookies.get(COMPANY_COOKIE)?.value;
  if (!v || !v.includes('.')) return null;
  const id = v.slice(0, v.indexOf('.'));
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await db().from('cob_admins').select('id, company_name, password_hash').eq('id', id).maybeSingle();
  if (!data) return null;
  return safeEqual(v, companyToken(data)) ? data : null;
}

// ---------- Brands ----------
export const BRAND_TEXT_FIELDS = [
  'contact_person', 'contact_number', 'address', 'gst_number',
  'whatsapp', 'instagram', 'facebook', 'youtube',
  'about_brand', 'about_company',
];

export function brandRow(body) {
  const row = { name: String(body.name || '').trim() };
  for (const f of BRAND_TEXT_FIELDS) row[f] = String(body[f] || '').trim() || null;
  return row;
}

export function checkPin(pin) {
  if (!/^\d{4}$/.test(String(pin || ''))) throw new Error('Catalogue settings PIN must be exactly 4 digits');
}

// Register a brand (used by master admin and by company admins)
export async function registerBrand(body, adminId) {
  const row = brandRow(body);
  if (!row.name) throw new Error('Brand title is required');
  checkPin(body.password);
  const base = slugify(row.name);
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await db().from('cob_businesses').select('id').eq('slug', slug).maybeSingle();
    if (!data) break;
    n += 1;
    slug = `${base}-${n}`;
  }
  if (body.logo) row.logo_url = await uploadDataUrl(body.logo, 'logos');
  const { data, error } = await db()
    .from('cob_businesses')
    .insert({ ...row, slug, admin_id: adminId || null, password_hash: hashPassword(String(body.password)) })
    .select('id, slug, name')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBrand(biz) {
  const { error } = await db().from('cob_businesses').delete().eq('id', biz.id);
  if (error) throw error;
  await removeByUrl(biz.logo_url);
  await removeFolder(biz.id);
}

// ---------- Custom sets (Set 1, Set 2 ...) with default WSP / MRP ----------
function setRate(v, label, size) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  if (!isFinite(n) || n < 0) throw new Error(`Enter a valid ${label} for ${size}`);
  return Math.round(n * 100) / 100;
}

export function cleanSets(list) {
  const out = [];
  const seen = new Set();
  for (const x of Array.isArray(list) ? list.slice(0, 50) : []) {
    const v = String((x && x.size) || '').trim();
    if (!v) continue;
    if (v.length > 30) throw new Error(`"${v}" is too long (max 30 letters)`);
    if (seen.has(v.toUpperCase())) throw new Error(`"${v}" is listed twice`);
    seen.add(v.toUpperCase());
    out.push({ size: v, pcs: cleanPcs(x.pcs, v), wsp: setRate(x.wsp, 'WSP', v), mrp: setRate(x.mrp, 'MRP', v), ...cleanBase(x) });
  }
  return out;
}

// Base rate (shared) and ± ₹ for one set; WSP is already worked out as base + off
export function cleanBase(x) {
  const n = (v) => (v === '' || v == null || !isFinite(Number(v)) ? null : Math.round(Number(v) * 100) / 100);
  const base = n(x && x.base);
  const rel = !!(x && x.rel) || base != null;
  if (!rel) return { off: null, base: null, rel: false };
  return { base, off: n(x.off) || 0, rel: true };
}

export function cleanPcs(v, name) {
  if (v === '' || v == null) return 1;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 500) throw new Error(`Enter valid Pcs (1 or more) for ${name}`);
  return n;
}

// Pass set renames / new rates on to saved products (whole catalogue, or one category)
export async function applySetChanges(bizId, changes, categoryId) {
  const list = Array.isArray(changes) ? changes.slice(0, 50) : [];
  if (!list.length) return 0;
  const num = (v) => {
    if (v === undefined || v === '' || v == null) return undefined;
    const n = Number(v);
    return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : undefined;
  };
  let q = db().from('cob_products').select('id, sizes').eq('business_id', bizId);
  if (categoryId) q = q.eq('category_id', categoryId);
  const { data: prods, error } = await q;
  if (error) throw error;
  let updated = 0;
  for (const pr of prods || []) {
    let changed = false;
    const sizes = (Array.isArray(pr.sizes) ? pr.sizes : []).map((z) => ({ ...z }));
    for (const c of list) {
      const from = String(c.from || '').trim().toUpperCase();
      const to = String(c.to || '').trim().slice(0, 30);
      if (!from) continue;
      const z = sizes.find((x) => x.custom && String(x.size).toUpperCase() === from);
      if (!z) continue;
      if (to && to.toUpperCase() !== from && !sizes.some((x) => x !== z && String(x.size).toUpperCase() === to.toUpperCase())) {
        z.size = to;
        changed = true;
      }
      const w = num(c.wsp);
      const m = num(c.mrp);
      const pc = num(c.pcs);
      if (pc !== undefined && Number.isInteger(pc) && pc >= 1) { z.pcs = pc; changed = true; }
      // ± pattern: new ± always applies; a new Base only if the default has one
      if (c.off !== undefined && c.off !== null && isFinite(Number(c.off))) {
        z.off = Number(c.off);
        z.rel = true;
        if (c.base !== undefined && c.base !== null && isFinite(Number(c.base))) z.base = Number(c.base);
        if (z.base != null && z.wsp != null) z.wsp = Math.round((Number(z.base) + z.off) * 100) / 100;
        changed = true;
      }
      if (w !== undefined && z.wsp != null) { z.wsp = w; changed = true; }
      if (m !== undefined && z.mrp != null) { z.mrp = m; changed = true; }
    }
    if (changed) {
      const { error: ue } = await db().from('cob_products').update({ sizes }).eq('id', pr.id);
      if (ue) throw ue;
      updated += 1;
    }
  }
  return updated;
}
