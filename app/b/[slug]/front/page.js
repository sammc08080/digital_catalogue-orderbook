'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../../lib/client';
import BrandFields, { BRAND_EMPTY } from '../../../../components/BrandFields';

// Master admin or the brand's Admin: edit the Brand Page
export default function BrandPageEditor() {
  const { slug } = useParams();
  const [state, setState] = useState('loading'); // loading | noadmin | missing | ready
  const [biz, setBiz] = useState(null);
  const [form, setForm] = useState(BRAND_EMPTY);
  const [logo, setLogo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [role, setRole] = useState(null);
  const [admins, setAdmins] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await api('/api/business', { action: 'me', slug });
        if (!d.isAdmin) return setState('noadmin');
        setRole(d.role);
        if (d.role === 'master') setAdmins(d.admins || []);
        const b = d.business;
        setBiz(b);
        const f = { ...BRAND_EMPTY };
        for (const k of Object.keys(f)) if (k !== 'password') f[k] = b[k] || '';
        setForm(f);
        setState('ready');
      } catch (e) {
        if (e.status === 404) setState('missing');
        else setState('noadmin');
      }
    })();
  }, [slug]);

  async function save(e) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setBusy(true);
    try {
      const body = { action: 'updateBrand', slug, ...form, logo };
      if (role !== 'master') delete body.admin_id;
      await api('/api/business', body);
      setForm({ ...form, password: '' });
      setSaved(true);
    } catch (e2) {
      setError(e2.message);
    }
    setBusy(false);
  }

  if (state === 'loading') return <main className="wrap"><p className="muted center">Loading…</p></main>;
  if (state === 'missing') return <main className="wrap"><div className="error">Brand not found.</div></main>;
  if (state === 'noadmin') {
    return (
      <main className="wrap" style={{ maxWidth: 420, paddingTop: 60 }}>
        <div className="card center">
          <p>Only the Master admin or this brand's Admin can edit the Brand Page.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <a className="btn" href="/admin">Master admin login</a>
            <a className="btn blue" href="/company">Admin login</a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap" style={{ maxWidth: 600 }}>
      <div className="row between" style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0 }}>Brand page</h1>
        <a className="btn small blue" href={role === 'master' ? '/admin' : '/company'}>{role === 'master' ? 'Master admin' : 'Admin'}</a>
      </div>
      <form className="card" onSubmit={save}>
        {error && <div className="error">{error}</div>}
        {saved && <div className="ok">Saved. <a href={`/b/${slug}`} target="_blank" rel="noreferrer">Open catalogue ↗</a></div>}
        <BrandFields form={form} setForm={setForm} logo={logo} setLogo={setLogo} logoUrl={biz.logo_url} setError={setError} editing admins={admins} />
        <button className="btn full" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </form>
    </main>
  );
}
