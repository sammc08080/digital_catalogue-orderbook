// CMYK (0-100 %) <-> screen colour. Screens show RGB, so this is the closest on-screen match.
const clamp = (n) => Math.max(0, Math.min(100, Number(n) || 0));

export function cmykToHex(c, m, y, k) {
  const C = clamp(c) / 100;
  const M = clamp(m) / 100;
  const Y = clamp(y) / 100;
  const K = clamp(k) / 100;
  const to = (v) => Math.round(255 * (1 - v) * (1 - K)).toString(16).padStart(2, '0');
  return '#' + to(C) + to(M) + to(Y);
}

export function cmykLabel(c, m, y, k) {
  return `C${clamp(c)} M${clamp(m)} Y${clamp(y)} K${clamp(k)}`;
}

// screen colour -> CMYK (0-100 %), used when the colour picker is used
export function hexToCmyk(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
  if (!m) return { c: '0', m: '0', y: '0', k: '0' };
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return { c: '0', m: '0', y: '0', k: '100' };
  const f = (v) => String(Math.round(((1 - v - k) / (1 - k)) * 100));
  return { c: f(r), m: f(g), y: f(b), k: String(Math.round(k * 100)) };
}
