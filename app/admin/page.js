'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/client';
import BrandFields, { BRAND_EMPTY } from '../../components/BrandFields';


function Logo({ url, name, big }) {
  if (url) return <img className={'logo' + (big ? ' big' : '')} src={url} alt="" />;
  return <span className={'logo logo-ph' + (big ? ' big' : '')}>{(name || '?').charAt(0).toUpperCase()}</span>;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(null); // null = checking
  const [password, setPassword] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [form, setForm] = useState(BRAND_EMPTY);
  const [logo, setLogo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  async function loadList() {
    try {
      const d = await api('/api/admin', { action: 'list' });
      setBusinesses(d.businesses);
      setAuthed(true);
    } catch (e) {
      if (e.status === 401) setAuthed(false);
      else { setAuthed(true); setError(e.message); }
    }
  }

  useEffect(() => { loadList(); }, []);

  async function login(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/api/admin', { action: 'login', password });
      setPassword('');
      await loadList();
    } catch (e2) {
      setError(e2.message);
    }
    setBusy(false);
  }

  async function logout() {
    await api('/api/admin', { action: 'logout' }).catch(() => {});
    setAuthed(false);
  }

  async function register(e) {
    e.preventDefault();
    setError('');
    setDone(null);
    setBusy(true);
    try {
      const d = await api('/api/admin', { action: 'register', ...form, logo });
      setDone(d.business);
      setForm(BRAND_EMPTY);
      setLogo(null);
      await loadList();
    } catch (e2) {
      setError(e2.message);
    }
    setBusy(false);
  }

  async function remove(b) {
    if (!window.confirm(`Delete "${b.name}" and its whole catalogue? This cannot be undone.`)) return;
    setError('');
    try {
      await api('/api/admin', { action: 'delete', id: b.id });
      await loadList();
    } catch (e2) {
      setError(e2.message);
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  if (authed === null) return <main className="wrap"><p className="muted center">Loading…</p></main>;

  if (!authed) {
    return (
      <main className="wrap" style={{ maxWidth: 420, paddingTop: 60 }}>
        <form className="card" onSubmit={login}>
          <h1>MASTER ADMIN</h1>
          {error && <div className="error">{error}</div>}
          <label className="field">Admin password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </label>
          <button className="btn full" disabled={busy}>{busy ? 'Please wait…' : 'Log in'}</button>
        </form>
      </main>
    );
  }

  return (
    <main className="wrap">
      <div className="row between" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>MASTER ADMIN</h1>
        <button className="btn small blue" onClick={logout}>Log out</button>
      </div>

      {error && <div className="error">{error}</div>}

      <form className="card" onSubmit={register}>
        <h2>Register a brand</h2>
        {done && (
          <div className="ok">
            “{done.name}” registered. Catalogue link:<br />
            <a href={`/b/${done.slug}`}>{origin}/b/{done.slug}</a>
          </div>
        )}
        <BrandFields form={form} setForm={setForm} logo={logo} setLogo={setLogo} setError={setError} />
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
    </main>
  );
}
