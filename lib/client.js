// Helpers used in the browser

export async function api(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let d = {};
  try {
    d = await r.json();
  } catch (e) {}
  if (!r.ok) {
    const err = new Error(d.error || 'Something went wrong. Please try again.');
    err.status = r.status;
    err.data = d;
    throw err;
  }
  return d;
}

// Shrinks a photo (from camera or gallery) before upload
export function compressImage(file, max = 1000, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      const scale = Math.min(1, max / Math.max(w, h));
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read this image. Please choose a JPG or PNG photo.'));
    };
    img.src = url;
  });
}

export function rupees(n) {
  const v = Number(n);
  if (!isFinite(v)) return '';
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}
