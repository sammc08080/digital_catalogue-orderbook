'use client';

import { compressImage } from '../lib/client';

export const BRAND_EMPTY = {
  name: '', contact_person: '', contact_number: '', address: '',
  whatsapp: '', instagram: '', facebook: '', youtube: '',
  about_brand: '', about_company: '', password: '',
};

// The Brand Page fields, used by "Register a brand" and "Brand page"
export default function BrandFields({ form, setForm, logo, setLogo, logoUrl, setError, editing }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const src = logo || logoUrl;

  async function pickLogo(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      setLogo(await compressImage(f, 500, 0.85));
    } catch (e2) {
      setError(e2.message);
    }
  }

  return (
    <>
      <label className="field">Brand title <span className="req">*</span>
        <input type="text" value={form.name} onChange={set('name')} />
      </label>
      <div className="field" style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
        Brand logo
        <div className="photo-pick">
          {src ? <img src={src} alt="" style={{ width: 70, height: 70, flexShrink: 0, objectFit: 'cover', borderRadius: 10 }} />
            : <div className="ph" style={{ width: 70, height: 70, flexShrink: 0, borderRadius: 10 }}>No logo</div>}
          <input type="file" accept="image/*" onChange={pickLogo} />
        </div>
      </div>
      <label className="field">Contact name
        <input type="text" value={form.contact_person} onChange={set('contact_person')} />
      </label>
      <label className="field">Contact number
        <input type="tel" value={form.contact_number} onChange={set('contact_number')} />
      </label>
      <label className="field">Brand address
        <textarea value={form.address} onChange={set('address')} />
      </label>

      <div className="section-title" style={{ marginTop: 6 }}>Social media (only filled ones show)</div>
      <label className="field">WhatsApp number or link
        <input type="text" value={form.whatsapp} onChange={set('whatsapp')} />
      </label>
      <label className="field">Instagram id or link
        <input type="text" value={form.instagram} onChange={set('instagram')} />
      </label>
      <label className="field">Facebook id or link
        <input type="text" value={form.facebook} onChange={set('facebook')} />
      </label>
      <label className="field">YouTube channel or link
        <input type="text" value={form.youtube} onChange={set('youtube')} />
      </label>

      <label className="field">About brand
        <textarea value={form.about_brand} onChange={set('about_brand')} />
      </label>
      <label className="field">About company
        <textarea value={form.about_company} onChange={set('about_company')} />
      </label>

      <label className="field">
        {editing ? 'New company admin password (leave blank to keep)' : <>Company admin password <span className="req">*</span></>}
        <input type="text" value={form.password} onChange={set('password')} placeholder="At least 4 characters" />
      </label>
    </>
  );
}
