// Turns what was typed in the Brand Page into a working link (or null)

export function whatsappLink(v) {
  const s = String(v || '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  let digits = s.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) digits = '91' + digits;
  return 'https://wa.me/' + digits;
}

function handleLink(v, base) {
  const s = String(v || '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (/^(www\.)?[a-z]+\.(com|be)\//i.test(s)) return 'https://' + s;
  return base + s.replace(/^@/, '');
}

export const instagramLink = (v) => handleLink(v, 'https://instagram.com/');
export const facebookLink = (v) => handleLink(v, 'https://facebook.com/');
export function youtubeLink(v) {
  const s = String(v || '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s) || /^(www\.)?youtu/i.test(s)) return /^https?:/i.test(s) ? s : 'https://' + s;
  return 'https://youtube.com/@' + s.replace(/^@/, '');
}
