'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../../lib/client';
import BrandFields, { BRAND_EMPTY } from '../../../../components/BrandFields';

// Master admin only: edit the Brand Page
export default function BrandPageEditor() {
  const { slug } = useParams();
  const [state, setState] = useState('loading'); // loading | noadmin | missing | ready
  const [biz, setBiz] = useState(null);
  const [form, setForm] = useState(BRAND_EMPTY);
  const [logo, setLogo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const d = await api('/api/business', { action: 'me', slug });
        if (!d.isAdmin) return setState('noadmin');
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
      await api('/api/admin', { action: 'update', id: biz.id, ...form, logo });
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
          <p>Only the master admin can edit the Brand Page.</p>
          <a className="btn" href="/admin">Master admin login</a>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap" style={{ maxWidth: 600 }}>
      <div className="row between" style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0 }}>Brand page</h1>
        <a className="btn small blue" href="/admin">Admin</a>
      </div>
      <form className="card" onSubmit={save}>
        {error && <div className="error">{error}</div>}
        {saved && <div className="ok">Saved. <a href={`/b/${slug}`} target="_blank" rel="noreferrer">Open catalogue ↗</a></div>}
        <BrandFields form={form} setForm={setForm} logo={logo} setLogo={setLogo} logoUrl={biz.logo_url} setError={setError} editing />
        <button className="btn full" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </form>
    </main>
  );
}
