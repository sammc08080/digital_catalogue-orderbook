'use client';

import { useState } from 'react';
import { api } from '../lib/client';
import BrandFields, { BRAND_EMPTY } from './BrandFields';

function Logo({ url, name }) {
  if (url) return <img className="logo" src={url} alt="" />;
  return <span className="logo logo-ph">{(name || '?').charAt(0).toUpperCase()}</span>;
}

// "Register a brand" + list of brands, used by Master admin (/admin) and Admin (/company)
export default function BrandsPanel({ endpoint, businesses, admins, reload, setError }) {
  const [form, setForm] = useState(BRAND_EMPTY);
  const [logo, setLogo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  async function register(e) {
    e.preventDefault();
    setError('');
    setDone(null);
    setBusy(true);
    try {
      const d = await api(endpoint, { action: 'register', ...form, logo });
      setDone(d.business);
      setForm(BRAND_EMPTY);
      setLogo(null);
      await reload();
    } catch (e2) {
      setError(e2.message);
    }
    setBusy(false);
  }

  async function remove(b) {
    if (!window.confirm(`Delete "${b.name}" and its whole catalogue? This cannot be undone.`)) return;
    setError('');
    try {
      await api(endpoint, { action: 'delete', id: b.id });
      await reload();
    } catch (e2) {
      setError(e2.message);
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const companyOf = (b) => (admins || []).find((a) => a.id === b.admin_id);

  return (
    <>
      <form className="card" onSubmit={register}>
        <h2>Register a brand</h2>
        {done && (
          <div className="ok">
            “{done.name}” registered. Catalogue link:<br />
            <a href={`/b/${done.slug}`}>{origin}/b/{done.slug}</a>
          </div>
        )}
        <BrandFields form={form} setForm={setForm} logo={logo} setLogo={setLogo} setError={setError} admins={admins} />
        <button className="btn full" disabled={busy}>{busy ? 'Saving…' : 'Register brand'}</button>
      </form>

      <div className="card">
        <h2>Registered brands ({businesses.length})</h2>
        {businesses.length === 0 && <p className="muted">No brands yet.</p>}
        {businesses.map((b) => (
          <div className="list-item" key={b.id}>
            <Logo url={b.logo_url} name={b.name} />
            <div className="grow">
              <div style={{ fontWeight: 700 }}>{b.name}</div>
              <div className="muted" style={{ wordBreak: 'break-all' }}>/b/{b.slug}</div>
              {admins && <div className="muted">Company: {companyOf(b) ? companyOf(b).company_name : 'Master admin only'}</div>}
              <div className="row" style={{ marginTop: 6 }}>
                <a className="btn small mint" href={`/b/${b.slug}`} target="_blank" rel="noreferrer">Catalogue</a>
                <a className="btn small blue" href={`/b/${b.slug}/front`}>Brand page</a>
                <a className="btn small blue" href={`/b/${b.slug}/manage`}>Catalogue settings</a>
                <button className="btn small blush" onClick={() => remove(b)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
