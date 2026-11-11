'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/client';
import BrandsPanel from '../../components/BrandsPanel';
import AdminsPanel from '../../components/AdminsPanel';

export default function AdminPage() {
  const [authed, setAuthed] = useState(null); // null = checking
  const [password, setPassword] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function loadList() {
    try {
      const d = await api('/api/admin', { action: 'list' });
      setBusinesses(d.businesses);
      setAdmins(d.admins || []);
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

      <AdminsPanel admins={admins} businesses={businesses} reload={loadList} setError={setError} />
      <BrandsPanel endpoint="/api/admin" businesses={businesses} admins={admins} reload={loadList} setError={setError} />
    </main>
  );
}
