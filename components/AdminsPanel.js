'use client';

import { useState } from 'react';
import { api } from '../lib/client';

// Master admin: create Admins (company name + password), reset password, remove
export default function AdminsPanel({ admins, businesses, reload, setError }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [resetId, setResetId] = useState(null);
  const [newPw, setNewPw] = useState('');

  async function create(e) {
    e.preventDefault();
    setError('');
    setMsg('');
    setBusy(true);
    try {
      await api('/api/admin', { action: 'createAdmin', company_name: name, password });
      setMsg(`Admin "${name}" created. They log in at ${window.location.origin}/company`);
      setName('');
      setPassword('');
      await reload();
    } catch (e2) {
      setError(e2.message);
    }
    setBusy(false);
  }

  async function reset(a) {
    setError('');
    setMsg('');
    try {
      await api('/api/admin', { action: 'resetAdminPassword', id: a.id, password: newPw });
      setMsg(`Password changed for "${a.company_name}".`);
      setResetId(null);
      setNewPw('');
    } catch (e2) {
      setError(e2.message);
    }
  }

  async function remove(a) {
    const count = businesses.filter((b) => b.admin_id === a.id).length;
    const extra = count ? ` Its ${count} catalogue(s) will stay and go back to Master admin only.` : '';
    if (!window.confirm(`Remove admin "${a.company_name}"?${extra}`)) return;
    setError('');
    try {
      await api('/api/admin', { action: 'deleteAdmin', id: a.id });
      await reload();
    } catch (e2) {
      setError(e2.message);
    }
  }

  return (
    <div className="card">
      <h2>Admins ({admins.length})</h2>
      <p className="muted" style={{ marginTop: 0 }}>Each Admin logs in at <b>/company</b> with company name + password and manages only its own catalogues.</p>
      {msg && <div className="ok" style={{ wordBreak: 'normal' }}>{msg}</div>}
      <form onSubmit={create}>
        <label className="field">Company name
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">Admin password
          <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 4 characters" />
        </label>
        <button className="btn full" disabled={busy}>{busy ? 'Saving…' : 'Create admin'}</button>
      </form>
      {admins.map((a) => (
        <div className="list-item" key={a.id}>
          <div className="grow">
            <div style={{ fontWeight: 700 }}>{a.company_name}</div>
            <div className="muted">{businesses.filter((b) => b.admin_id === a.id).length} catalogue(s)</div>
            {resetId === a.id && (
              <div className="row" style={{ marginTop: 6, flexWrap: 'nowrap' }}>
                <input type="text" placeholder="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)} style={{ marginTop: 0 }} />
                <button type="button" className="btn small mint" onClick={() => reset(a)}>Save</button>
              </div>
            )}
          </div>
          <button type="button" className="btn small blue" onClick={() => { setResetId(resetId === a.id ? null : a.id); setNewPw(''); }}>Password</button>
          <button type="button" className="btn small blush" onClick={() => remove(a)}>Remove</button>
        </div>
      ))}
    </div>
  );
}
