'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/client';
import BrandsPanel from '../../components/BrandsPanel';

// Admin (company) area: log in with company name + password, manage own catalogues
export default function CompanyPage() {
  const [authed, setAuthed] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      const d = await api('/api/company', { action: 'me' });
      setCompanyName(d.company_name);
      setBusinesses(d.businesses);
      setAuthed(true);
    } catch (e) {
      if (e.status === 401) setAuthed(false);
      else { setAuthed(true); setError(e.message); }
    }
  }

  useEffect(() => { load(); }, []);

  async function login(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/api/company', { action: 'login', company_name: name, password });
      setPassword('');
      await load();
    } catch (e2) {
      setError(e2.message);
    }
    setBusy(false);
  }

  async function logout() {
    await api('/api/company', { action: 'logout' }).catch(() => {});
    setAuthed(false);
  }

  if (authed === null) return <main className="wrap"><p className="muted center">Loading…</p></main>;

  if (!authed) {
    return (
      <main className="wrap" style={{ maxWidth: 420, paddingTop: 60 }}>
        <form className="card" onSubmit={login}>
          <h1>ADMIN</h1>
          {error && <div className="error">{error}</div>}
          <label className="field">Company name
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <label className="field">Admin password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button className="btn full" disabled={busy}>{busy ? 'Please wait…' : 'Log in'}</button>
        </form>
      </main>
    );
  }

  return (
    <main className="wrap">
      <div className="row between" style={{ marginBottom: 16, flexWrap: 'nowrap' }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0 }}>ADMIN</h1>
          <div className="muted" style={{ fontWeight: 700 }}>{companyName}</div>
        </div>
        <button className="btn small blue" onClick={logout}>Log out</button>
      </div>
      {error && <div className="error">{error}</div>}
      <BrandsPanel endpoint="/api/company" businesses={businesses} reload={load} setError={setError} />
    </main>
  );
}
