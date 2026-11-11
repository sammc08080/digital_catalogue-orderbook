import {
  db, json, fail, safeEqual, isAdmin, adminToken, ADMIN_COOKIE, cookieOpts,
  hashPassword, slugify, uploadDataUrl, removeByUrl, removeFolder,
} from '../../../lib/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TEXT_FIELDS = [
  'contact_person', 'contact_number', 'address',
  'whatsapp', 'instagram', 'facebook', 'youtube',
  'about_brand', 'about_company',
];

function brandRow(body) {
  const row = { name: String(body.name || '').trim() };
  for (const f of TEXT_FIELDS) row[f] = String(body[f] || '').trim() || null;
  return row;
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
    if (action === 'login') {
      if (!process.env.ADMIN_PASSWORD) return fail('ADMIN_PASSWORD is not set in Vercel settings', 500);
      if (!safeEqual(body.password || '', process.env.ADMIN_PASSWORD)) return fail('Wrong password', 401);
      const res = json({ ok: true });
      res.cookies.set(ADMIN_COOKIE, adminToken(), cookieOpts);
      return res;
    }

    if (action === 'logout') {
      const res = json({ ok: true });
      res.cookies.set(ADMIN_COOKIE, '', { ...cookieOpts, maxAge: 0 });
      return res;
    }

    if (!isAdmin(req)) return fail('Please log in', 401);

    if (action === 'list') {
      const { data, error } = await db()
        .from('cob_businesses')
        .select('id, slug, name, logo_url, contact_person, contact_number, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return json({ businesses: data || [] });
    }

    // Register a brand (with its company admin password)
    if (action === 'register') {
      const row = brandRow(body);
      const password = String(body.password || '');
      if (!row.name) return fail('Brand title is required');
      if (password.length < 4) return fail('Company admin password must be at least 4 characters');

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
        .insert({ ...row, slug, password_hash: hashPassword(password) })
        .select('id, slug, name')
        .single();
      if (error) throw error;
      return json({ business: data });
    }

    // Brand Page: edit (master admin only)
    if (action === 'update') {
      const { data: biz } = await db()
        .from('cob_businesses')
        .select('id, logo_url')
        .eq('id', body.id)
        .maybeSingle();
      if (!biz) return fail('Brand not found', 404);
      const row = brandRow(body);
      if (!row.name) return fail('Brand title is required');
      if (typeof body.logo === 'string' && body.logo.startsWith('data:')) {
        row.logo_url = await uploadDataUrl(body.logo, 'logos');
      }
      const newPw = String(body.password || '');
      if (newPw) {
        if (newPw.length < 4) return fail('Company admin password must be at least 4 characters');
        row.password_hash = hashPassword(newPw);
      }
      const { error } = await db().from('cob_businesses').update(row).eq('id', biz.id);
      if (error) throw error;
      if (row.logo_url && biz.logo_url) await removeByUrl(biz.logo_url);
      return json({ ok: true });
    }

    if (action === 'delete') {
      const { data: biz } = await db()
        .from('cob_businesses')
        .select('id, logo_url')
        .eq('id', body.id)
        .maybeSingle();
      if (!biz) return fail('Brand not found', 404);
      const { error } = await db().from('cob_businesses').delete().eq('id', biz.id);
      if (error) throw error;
      await removeByUrl(biz.logo_url);
      await removeFolder(biz.id);
      return json({ ok: true });
    }

    return fail('Unknown action');
  } catch (e) {
    return fail(e.message || 'Server error', 500);
  }
}
