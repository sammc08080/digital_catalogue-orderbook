import { whatsappLink, instagramLink, facebookLink, youtubeLink } from '../lib/social';

const ICONS = {
  whatsapp: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff" aria-hidden="true">
      <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3zm0 16.4a7.4 7.4 0 0 1-3.8-1l-.3-.2-2.7.7.7-2.6-.2-.3A7.4 7.4 0 1 1 12 19.4zm4.1-5.5c-.2-.1-1.3-.7-1.5-.7-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6 6 0 0 1-3-2.6c-.2-.4.2-.4.6-1.2.1-.1 0-.3 0-.4l-.7-1.6c-.2-.4-.4-.4-.5-.4h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4c.1.1 1.6 2.5 4 3.5 1.5.6 2 .7 2.8.6.4-.1 1.3-.5 1.5-1.1.2-.5.2-1 .1-1.1l-.4-.2z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="16.8" cy="7.2" r="1" fill="#fff" stroke="none" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff" aria-hidden="true">
      <path d="M13.5 21v-7.5H16l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4a20 20 0 0 0-2.3-.1c-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21h3z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff" aria-hidden="true">
      <path d="M9.5 8.3v7.4l6.3-3.7z" />
    </svg>
  ),
};

const COLORS = { whatsapp: '#25d366', instagram: '#d62976', facebook: '#1877f2', youtube: '#ff0000' };

export function socialLinks(b) {
  return [
    ['whatsapp', whatsappLink(b.whatsapp)],
    ['instagram', instagramLink(b.instagram)],
    ['facebook', facebookLink(b.facebook)],
    ['youtube', youtubeLink(b.youtube)],
  ].filter(([, url]) => url);
}

// The Brand Page shown at the top of the main catalogue
export default function BrandHeader({ b }) {
  const links = socialLinks(b);
  return (
    <div className="card">
      <div className="row" style={{ gap: 14, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
        {b.logo_url ? <img className="logo big" src={b.logo_url} alt="" />
          : <span className="logo big logo-ph">{(b.name || '?').charAt(0).toUpperCase()}</span>}
        <div style={{ minWidth: 0 }}>
          <h1 style={{ marginBottom: 6 }}>{b.name}</h1>
          {(b.contact_person || b.contact_number) && (
            <div className="muted">
              {b.contact_person}{b.contact_person && b.contact_number ? ' · ' : ''}
              {b.contact_number && <a href={`tel:${b.contact_number}`}>{b.contact_number}</a>}
            </div>
          )}
          {b.address && <div className="muted" style={{ marginTop: 4, whiteSpace: 'pre-line' }}>{b.address}</div>}
        </div>
      </div>
      {b.gst_number && <div className="muted" style={{ marginTop: 10 }}><b>GST:</b> {b.gst_number}</div>}
      {links.length > 0 && (
        <div className="social-row">
          {links.map(([k, url]) => (
            <a key={k} className="social" href={url} target="_blank" rel="noreferrer" style={{ background: COLORS[k] }} aria-label={k}>
              {ICONS[k]}
            </a>
          ))}
        </div>
      )}
      {b.about_brand && (
        <div className="about"><div className="about-h">About brand</div>{b.about_brand}</div>
      )}
      {b.about_company && (
        <div className="about"><div className="about-h">About company</div>{b.about_company}</div>
      )}
    </div>
  );
}
