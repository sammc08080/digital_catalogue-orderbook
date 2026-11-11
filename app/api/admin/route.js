import {
  db, json, fail, safeEqual, isAdmin, adminToken, ADMIN_COOKIE, cookieOpts,
  hashPassword, registerBrand, deleteBrand,
} from '../../../lib/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Master admin only
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
      const [b, a] = await Promise.all([
        db().from('cob_businesses')
          .select('id, slug, name, logo_url, contact_person, contact_number, admin_id, created_at')
          .order('created_at', { ascending: false }),
        db().from('cob_admins').select('id, company_name, created_at').order('company_name', { ascending: true }),
      ]);
      if (b.error) throw b.error;
      if (a.error) throw a.error;
      return json({ businesses: b.data || [], admins: a.data || [] });
    }

    // ---- Brands ----
    if (action === 'register') {
      let adminId = body.admin_id || null;
      if (adminId) {
        const { data } = await db().from('cob_admins').select('id').eq('id', adminId).maybeSingle();
        if (!data) adminId = null;
      }
      return json({ business: await registerBrand(body, adminId) });
    }

    if (action === 'delete') {
      const { data: biz } = await db().from('cob_businesses').select('id, logo_url').eq('id', body.id).maybeSingle();
      if (!biz) return fail('Brand not found', 404);
      await deleteBrand(biz);
      return json({ ok: true });
    }

    // ---- Admins (companies) ----
    if (action === 'createAdmin') {
      const company_name = String(body.company_name || '').trim();
      const password = String(body.password || '');
      if (!company_name) return fail('Enter the company name');
      if (password.length < 4) return fail('Admin password must be at least 4 characters');
      const { data: same } = await db().from('cob_admins').select('id').ilike('company_name', company_name.replace(/[%_\\]/g, '\\$&')).maybeSingle();
      if (same) return fail('An admin with this company name already exists');
      const { error } = await db().from('cob_admins').insert({ company_name, password_hash: hashPassword(password) });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === 'resetAdminPassword') {
      const password = String(body.password || '');
      if (password.length < 4) return fail('Admin password must be at least 4 characters');
      const { error } = await db().from('cob_admins').update({ password_hash: hashPassword(password) }).eq('id', body.id);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === 'deleteAdmin') {
      // their brands stay, and go back to the master admin
      const { error } = await db().from('cob_admins').delete().eq('id', body.id);
      if (error) throw error;
      return json({ ok: true });
    }

    return fail('Unknown action');
  } catch (e) {
    return fail(e.message || 'Server error', 500);
  }
}
