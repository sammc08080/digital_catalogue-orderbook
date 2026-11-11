import {
  db, json, fail, cookieOpts, checkPassword, COMPANY_COOKIE, companyToken, companyFromReq,
  registerBrand, deleteBrand,
} from '../../../lib/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Admin (company) login and its own catalogues
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
      const name = String(body.company_name || '').trim();
      if (!name) return fail('Enter the company name');
      const { data: adm } = await db().from('cob_admins').select('id, company_name, password_hash')
        .ilike('company_name', name.replace(/[%_\\]/g, '\\$&')).maybeSingle();
      if (!adm || !checkPassword(body.password || '', adm.password_hash)) return fail('Wrong company name or password', 401);
      const res = json({ ok: true });
      res.cookies.set(COMPANY_COOKIE, companyToken(adm), cookieOpts);
      return res;
    }

    if (action === 'logout') {
      const res = json({ ok: true });
      res.cookies.set(COMPANY_COOKIE, '', { ...cookieOpts, maxAge: 0 });
      return res;
    }

    const adm = await companyFromReq(req);
    if (!adm) return fail('Please log in', 401);

    if (action === 'me') {
      const { data, error } = await db().from('cob_businesses')
        .select('id, slug, name, logo_url, contact_person, contact_number, created_at')
        .eq('admin_id', adm.id).order('created_at', { ascending: false });
      if (error) throw error;
      return json({ company_name: adm.company_name, businesses: data || [] });
    }

    if (action === 'register') {
      return json({ business: await registerBrand(body, adm.id) });
    }

    if (action === 'delete') {
      const { data: biz } = await db().from('cob_businesses').select('id, logo_url, admin_id').eq('id', body.id).maybeSingle();
      if (!biz || biz.admin_id !== adm.id) return fail('Catalogue not found', 404);
      await deleteBrand(biz);
      return json({ ok: true });
    }

    return fail('Unknown action');
  } catch (e) {
    return fail(e.message || 'Server error', 500);
  }
}
