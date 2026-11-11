import {
  db, json, fail, isAdmin, isOwner, ownerToken, ownerCookieName, cookieOpts,
  checkPassword, uploadDataUrl, removeByUrl, cleanSizes, cleanSizeGroups,
} from '../../../lib/server';
import { brandSizes } from '../../../lib/sizes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PUBLIC_FIELDS = 'id, slug, name, logo_url, contact_person, contact_number, address, whatsapp, instagram, facebook, youtube, about_brand, about_company, gst_slabs, size_groups';

async function loadBusiness(slug) {
  if (!slug) return null;
  const { data, error } = await db()
    .from('cob_businesses')
    .select(PUBLIC_FIELDS + ', password_hash')
    .eq('slug', String(slug))
    .maybeSingle();
  if (error) throw error;
  return data;
}

function publicBiz(biz) {
  const { password_hash, ...rest } = biz;
  return rest;
}

async function loadCatalogue(bizId) {
  const [cats, prods] = await Promise.all([
    db().from('cob_categories').select('id, name, sort').eq('business_id', bizId)
      .order('sort', { ascending: true }).order('created_at', { ascending: true }),
    db().from('cob_products').select('id, category_id, art_no, photo_url, colours, price_type, use_wsp, use_mrp, sizes, in_stock, created_at')
      .eq('business_id', bizId).order('created_at', { ascending: false }),
  ]);
  if (cats.error) throw cats.error;
  if (prods.error) throw prods.error;
  return { categories: cats.data || [], products: prods.data || [] };
}

// Public catalogue (the business's shareable link)
export async function GET(req) {
  try {
    const slug = new URL(req.url).searchParams.get('slug');
    const biz = await loadBusiness(slug);
    if (!biz) return fail('Business not found', 404);
    const cat = await loadCatalogue(biz.id);
    return json({ business: publicBiz(biz), ...cat });
  } catch (e) {
    return fail(e.message || 'Server error', 500);
  }
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return fail('Bad request');
  }
  const action = body.action;

  try {
    const biz = await loadBusiness(body.slug);
    if (!biz) return fail('Business not found', 404);

    if (action === 'login') {
      if (!checkPassword(body.password || '', biz.password_hash)) return fail('Wrong password', 401);
      const res = json({ ok: true });
      res.cookies.set(ownerCookieName(biz.slug), ownerToken(biz), cookieOpts);
      return res;
    }

    if (action === 'logout') {
      const res = json({ ok: true });
      res.cookies.set(ownerCookieName(biz.slug), '', { ...cookieOpts, maxAge: 0 });
      return res;
    }

    const admin = isAdmin(req);
    if (!admin && !isOwner(req, biz)) {
      return fail('Please log in', 401, { business: { name: biz.name, logo_url: biz.logo_url } });
    }

    if (action === 'me') {
      const cat = await loadCatalogue(biz.id);
      return json({ business: publicBiz(biz), isAdmin: admin, ...cat });
    }

    // ---------- Categories ----------
    if (action === 'addCategory') {
      const name = String(body.name || '').trim();
      if (!name) return fail('Enter a category name');
      const { data: last } = await db().from('cob_categories').select('sort')
        .eq('business_id', biz.id).order('sort', { ascending: false }).limit(1);
      const sort = last && last.length ? (last[0].sort || 0) + 1 : 0;
      const { error } = await db().from('cob_categories').insert({ business_id: biz.id, name, sort });
      if (error) throw error;
      return json(await loadCatalogue(biz.id));
    }

    if (action === 'renameCategory') {
      const name = String(body.name || '').trim();
      if (!name) return fail('Enter a category name');
      const { error } = await db().from('cob_categories').update({ name })
        .eq('id', body.id).eq('business_id', biz.id);
      if (error) throw error;
      return json(await loadCatalogue(biz.id));
    }

    if (action === 'deleteCategory') {
      const { error } = await db().from('cob_categories').delete()
        .eq('id', body.id).eq('business_id', biz.id);
      if (error) throw error;
      return json(await loadCatalogue(biz.id));
    }

    // ---------- Products ----------
    if (action === 'saveProduct') {
      const p = body.product || {};
      const art_no = String(p.art_no || '').trim();
      if (!art_no) return fail('Enter the Name / Art Number');
      const use_wsp = !!p.use_wsp;
      const use_mrp = !!p.use_mrp;

      let category_id = p.category_id || null;
      if (category_id) {
        const { data: c } = await db().from('cob_categories').select('id')
          .eq('id', category_id).eq('business_id', biz.id).maybeSingle();
        if (!c) category_id = null;
      }

      let existing = null;
      if (p.id) {
        const { data } = await db().from('cob_products').select('id, photo_url, colours, sizes')
          .eq('id', p.id).eq('business_id', biz.id).maybeSingle();
        if (!data) return fail('Product not found', 404);
        existing = data;
      }

      // sizes: the brand's list, plus any older size already saved on this product
      const allowed = [...brandSizes(biz)];
      for (const z of (existing && Array.isArray(existing.sizes) ? existing.sizes : [])) {
        if (z && z.size && !allowed.includes(z.size)) allowed.push(z.size);
      }
      const sizes = cleanSizes(p.sizes, use_wsp, use_mrp, allowed);
      if (!sizes.length) return fail('Tick at least one size');

      // main photo
      let photo_url = existing ? existing.photo_url : null;
      if (typeof p.photo === 'string' && p.photo.startsWith('data:')) {
        photo_url = await uploadDataUrl(p.photo, biz.id);
        if (existing && existing.photo_url) await removeByUrl(existing.photo_url);
      } else if (p.photo === null && existing && existing.photo_url) {
        await removeByUrl(existing.photo_url);
        photo_url = null;
      }

      // colour boxes: { type: 'photo', value: url }  or  { type: 'swatch', value: '#rrggbb' }
      const colours = [];
      for (const c of Array.isArray(p.colours) ? p.colours.slice(0, 30) : []) {
        if (!c || !c.value) continue;
        if (c.type === 'swatch') {
          if (/^#[0-9a-fA-F]{6}$/.test(c.value)) colours.push({ type: 'swatch', value: c.value.toLowerCase() });
        } else if (c.type === 'photo') {
          if (String(c.value).startsWith('data:')) colours.push({ type: 'photo', value: await uploadDataUrl(c.value, biz.id) });
          else if (/^https?:\/\//.test(c.value)) colours.push({ type: 'photo', value: c.value });
        }
      }
      if (existing && Array.isArray(existing.colours)) {
        const keep = new Set(colours.map((c) => c.value));
        for (const old of existing.colours) {
          if (old && old.type === 'photo' && !keep.has(old.value)) await removeByUrl(old.value);
        }
      }

      const row = {
        business_id: biz.id,
        category_id,
        art_no,
        photo_url,
        colours,
        use_wsp,
        use_mrp,
        sizes,
        in_stock: p.in_stock !== false,
      };

      if (existing) {
        const { error } = await db().from('cob_products').update(row).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await db().from('cob_products').insert(row);
        if (error) throw error;
      }
      return json(await loadCatalogue(biz.id));
    }

    // ---------- GST slabs ----------
    if (action === 'saveGst') {
      const list = Array.isArray(body.slabs) ? body.slabs : [];
      if (!list.length) return fail('Add at least one slab');
      if (list.length > 20) return fail('Too many slabs');
      const clean = [];
      let blanks = 0;
      for (const [i, s] of list.entries()) {
        const n = i + 1;
        const pct = Number(s.pct);
        if (s.pct === '' || s.pct == null || !isFinite(pct) || pct < 0 || pct > 100) return fail(`Enter a valid GST % for slab ${n}`);
        let upto = null;
        if (s.upto !== '' && s.upto != null) {
          upto = Number(s.upto);
          if (!isFinite(upto) || upto <= 0) return fail(`Enter a valid amount for slab ${n}`);
        } else blanks += 1;
        clean.push({ upto, pct });
      }
      if (blanks > 1) return fail('Only one slab can have an empty amount ("and above")');
      const { error } = await db().from('cob_businesses').update({ gst_slabs: clean }).eq('id', biz.id);
      if (error) throw error;
      return json({ gst_slabs: clean });
    }

    // ---------- Size lists ----------
    if (action === 'saveSizes') {
      const size_groups = cleanSizeGroups(body.groups);
      const { error } = await db().from('cob_businesses').update({ size_groups }).eq('id', biz.id);
      if (error) throw error;
      return json({ size_groups });
    }

    if (action === 'toggleStock') {
      const { error } = await db().from('cob_products').update({ in_stock: !!body.in_stock })
        .eq('id', body.id).eq('business_id', biz.id);
      if (error) throw error;
      return json(await loadCatalogue(biz.id));
    }

    if (action === 'deleteProduct') {
      const { data: prod } = await db().from('cob_products').select('id, photo_url, colours')
        .eq('id', body.id).eq('business_id', biz.id).maybeSingle();
      if (!prod) return fail('Product not found', 404);
      const { error } = await db().from('cob_products').delete().eq('id', prod.id);
      if (error) throw error;
      await removeByUrl(prod.photo_url);
      for (const c of Array.isArray(prod.colours) ? prod.colours : []) {
        if (c && c.type === 'photo') await removeByUrl(c.value);
      }
      return json(await loadCatalogue(biz.id));
    }

    return fail('Unknown action');
  } catch (e) {
    return fail(e.message || 'Server error', 500);
  }
}
