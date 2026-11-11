'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, compressImage } from '../../../../lib/client';
import { brandSizeGroups, sizeWsp, sizeMrp } from '../../../../lib/sizes';
import SizeLists from '../../../../components/SizeLists';
import ProductCard, { ColourBox } from '../../../../components/ProductCard';
import SearchBar, { matchArt } from '../../../../components/SearchBar';
import GstSlabs from '../../../../components/GstSlabs';

function blankProduct() {
  return { id: null, art_no: '', category_id: '', photo: undefined, photo_url: null, colours: [], use_wsp: true, use_mrp: false, sizes: {}, in_stock: true };
}

// ---------------- Product form ----------------
function ProductForm({ initial, categories, sizeGroups, onCancel, onSave }) {
  // the brand's size lists, plus any older size already on this product
  const groups = (() => {
    const known = new Set(sizeGroups.flatMap((g) => g.sizes));
    const extra = Object.keys(initial.sizes || {}).filter((z) => !known.has(z));
    return extra.length ? [...sizeGroups, { name: 'Other (no longer in size list)', sizes: extra }] : sizeGroups;
  })();
  const SIZES = groups.flatMap((g) => g.sizes);
  const [p, setP] = useState(initial);
  const [swatch, setSwatch] = useState('#5b4636');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const preview = typeof p.photo === 'string' ? p.photo : p.photo === null ? null : p.photo_url;

  async function pickPhoto(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const data = await compressImage(f);
      setP((cur) => ({ ...cur, photo: data }));
    } catch (e2) {
      setError(e2.message);
    }
  }

  async function addColourPhoto(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const data = await compressImage(f, 200, 0.85);
      setP((cur) => ({ ...cur, colours: [...cur.colours, { type: 'photo', value: data }] }));
    } catch (e2) {
      setError(e2.message);
    }
  }

  function addSwatch() {
    setP({ ...p, colours: [...p.colours, { type: 'swatch', value: swatch }] });
  }

  function removeColour(i) {
    setP({ ...p, colours: p.colours.filter((_, j) => j !== i) });
  }

  function toggleSize(s) {
    const sizes = { ...p.sizes };
    if (sizes[s] !== undefined) delete sizes[s];
    else sizes[s] = { wsp: '', mrp: '' };
    setP({ ...p, sizes });
  }

  function setPrice(s, key, v) {
    setP({ ...p, sizes: { ...p.sizes, [s]: { ...p.sizes[s], [key]: v } } });
  }

  const bad = (v) => v === '' || v == null || isNaN(Number(v));

  async function save(e) {
    e.preventDefault();
    setError('');
    if (!p.art_no.trim()) return setError('Enter the Name / Art Number');
    const ticked = SIZES.filter((s) => p.sizes[s] !== undefined);
    if (!ticked.length) return setError('Tick at least one size');
    for (const s of ticked) {
      if (p.use_wsp && bad(p.sizes[s].wsp)) return setError(`Enter the WSP for size ${s}`);
      if (p.use_mrp && bad(p.sizes[s].mrp)) return setError(`Enter the MRP for size ${s}`);
    }
    setBusy(true);
    try {
      await onSave({
        id: p.id,
        art_no: p.art_no,
        category_id: p.category_id || null,
        photo: p.photo,
        colours: p.colours,
        use_wsp: p.use_wsp,
        use_mrp: p.use_mrp,
        sizes: ticked.map((s) => ({
          size: s,
          wsp: p.use_wsp ? Number(p.sizes[s].wsp) : null,
          mrp: p.use_mrp ? Number(p.sizes[s].mrp) : null,
        })),
        in_stock: p.in_stock,
      });
    } catch (e2) {
      setError(e2.message);
      setBusy(false);
    }
  }

  return (
    <div className="overlay">
      <form className="card" onSubmit={save}>
        <h2>{p.id ? 'Edit product' : 'Add product'}</h2>
        {error && <div className="error">{error}</div>}

        <div style={{ fontSize: 14, fontWeight: 600 }}>Main product image</div>
        <div className="photo-pick">
          {preview ? <img src={preview} alt="" /> : <div className="ph">No image</div>}
          <div>
            <input type="file" accept="image/*" onChange={pickPhoto} />
            <div className="muted" style={{ marginTop: 6 }}>Take a photo or choose from gallery</div>
          </div>
        </div>

        <label className="field">Name / Art Number <span className="req">*</span>
          <input type="text" value={p.art_no} onChange={(e) => setP({ ...p, art_no: e.target.value })} />
        </label>

        <label className="field">Category
          <select value={p.category_id || ''} onChange={(e) => setP({ ...p, category_id: e.target.value })}>
            <option value="">— No category —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        <div style={{ fontSize: 14, fontWeight: 600 }}>Colour options</div>
        <div className="colour-edit">
          {p.colours.length === 0 && <span className="muted">No colours added</span>}
          {p.colours.map((c, i) => (
            <div className="item" key={i}>
              <ColourBox c={c} />
              <button type="button" className="x" onClick={() => removeColour(i)} aria-label="Remove colour">×</button>
            </div>
          ))}
        </div>
        <div className="colour-add">
          <span className="btn small mint file-btn">+ Colour photo
            <input type="file" accept="image/*" onChange={addColourPhoto} />
          </span>
          <span className="swatch-pick">
            <input type="color" value={swatch} onChange={(e) => setSwatch(e.target.value)} />
            <button type="button" className="btn small mint" onClick={addSwatch}>+ Swatch</button>
          </span>
        </div>

        <div style={{ fontSize: 14, fontWeight: 600 }}>Price</div>
        <div className="row" style={{ margin: '6px 0 12px', gap: 18 }}>
          <label className="check"><input type="checkbox" checked={p.use_wsp} onChange={(e) => setP({ ...p, use_wsp: e.target.checked })} /> WSP</label>
          <label className="check"><input type="checkbox" checked={p.use_mrp} onChange={(e) => setP({ ...p, use_mrp: e.target.checked })} /> MRP</label>
        </div>

        <div style={{ fontSize: 14, fontWeight: 600 }}>Sizes <span style={{ color: 'var(--red)' }}>*</span></div>
        {groups.map((g) => (
          <div key={g.name}>
            <div className="size-group-title">{g.name}</div>
            <div className={'size-grid' + (p.use_wsp && p.use_mrp ? ' one' : '')}>
              {g.sizes.map((s) => {
                const on = p.sizes[s] !== undefined;
                const v = on ? p.sizes[s] : {};
                return (
                  <div className={'size-row' + (on ? ' on' : '')} key={s}>
                    <label>
                      <input type="checkbox" checked={on} onChange={() => toggleSize(s)} />
                      {s}
                    </label>
                    {p.use_wsp && (
                      <input type="number" inputMode="decimal" min="0" step="0.01" placeholder={on ? 'WSP ₹' : ''}
                        disabled={!on} value={on ? v.wsp : ''} onChange={(e) => setPrice(s, 'wsp', e.target.value)} />
                    )}
                    {p.use_mrp && (
                      <input type="number" inputMode="decimal" min="0" step="0.01" placeholder={on ? 'MRP ₹' : ''}
                        disabled={!on} value={on ? v.mrp : ''} onChange={(e) => setPrice(s, 'mrp', e.target.value)} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div style={{ marginBottom: 16 }}>
          <label className="switch">
            <input type="checkbox" checked={p.in_stock} onChange={(e) => setP({ ...p, in_stock: e.target.checked })} />
            <span className="track" />
            {p.in_stock ? 'In stock' : 'Out of stock'}
          </label>
        </div>

        <div className="row">
          <button className="btn" disabled={busy} style={{ flex: 1 }}>{busy ? 'Saving…' : 'Save'}</button>
          <button type="button" className="btn blue" onClick={onCancel} disabled={busy} style={{ flex: 1 }}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ---------------- Categories tab ----------------
function CategoriesTab({ categories, products, call }) {
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  async function add(e) {
    e.preventDefault();
    if (!name.trim()) return;
    if (await call({ action: 'addCategory', name })) setName('');
  }

  async function rename(id) {
    if (await call({ action: 'renameCategory', id, name: editName })) setEditId(null);
  }

  async function remove(c) {
    const count = products.filter((p) => p.category_id === c.id).length;
    const msg = count
      ? `Delete category "${c.name}"? Its ${count} product(s) will stay, without a category.`
      : `Delete category "${c.name}"?`;
    if (window.confirm(msg)) await call({ action: 'deleteCategory', id: c.id });
  }

  return (
    <div className="card">
      <form className="row" onSubmit={add} style={{ flexWrap: 'nowrap', marginBottom: 8 }}>
        <input type="text" placeholder="Add your category" value={name} onChange={(e) => setName(e.target.value)} style={{ marginTop: 0 }} />
        <button className="btn">Add your category</button>
      </form>
      {categories.length === 0 && <p className="muted">No categories yet.</p>}
      {categories.map((c) => (
        <div className="list-item" key={c.id}>
          {editId === c.id ? (
            <>
              <input type="text" className="grow" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ marginTop: 0 }} autoFocus />
              <button className="btn small mint" onClick={() => rename(c.id)}>Save</button>
              <button className="btn small blue" onClick={() => setEditId(null)}>Cancel</button>
            </>
          ) : (
            <>
              <div className="grow">
                <div style={{ fontWeight: 700 }}>{c.name}</div>
                <div className="muted">{products.filter((p) => p.category_id === c.id).length} product(s)</div>
              </div>
              <button className="btn small blue" onClick={() => { setEditId(c.id); setEditName(c.name); }}>Rename</button>
              <button className="btn small blush" onClick={() => remove(c)}>Delete</button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------- Products tab ----------------
function ProductsTab({ categories, products: allProducts, call, onEdit, onAdd }) {
  const [query, setQuery] = useState('');
  const products = allProducts.filter((p) => matchArt(p, query));
  const groups = categories.map((c) => ({ id: c.id, name: c.name, items: products.filter((p) => p.category_id === c.id) }));
  const known = new Set(categories.map((c) => c.id));
  const none = products.filter((p) => !p.category_id || !known.has(p.category_id));
  if (none.length) groups.push({ id: 'none', name: 'No category', items: none });

  async function remove(p) {
    if (window.confirm(`Delete "${p.art_no}"?`)) await call({ action: 'deleteProduct', id: p.id });
  }

  return (
    <div>
      <SearchBar onSearch={setQuery} />
      <button className="btn full" onClick={onAdd}>+ Add product</button>
      {products.length === 0 && (
        <p className="muted center" style={{ marginTop: 20 }}>{query ? `No product found for "${query}".` : 'No products yet.'}</p>
      )}
      {groups.filter((g) => g.items.length).map((g) => (
        <div key={g.id}>
          <div className="section-title">{g.name} ({g.items.length})</div>
          <div className="grid">
            {g.items.map((p) => (
              <ProductCard key={p.id} p={p} categories={categories}>
                <label className="switch" style={{ marginTop: 'auto' }}>
                  <input type="checkbox" checked={p.in_stock} onChange={(e) => call({ action: 'toggleStock', id: p.id, in_stock: e.target.checked })} />
                  <span className="track" />
                  In stock
                </label>
                <div className="row">
                  <button className="btn small blue" onClick={() => onEdit(p)} style={{ flex: 1 }}>Edit</button>
                  <button className="btn small blush" onClick={() => remove(p)} style={{ flex: 1 }}>Delete</button>
                </div>
              </ProductCard>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------- Page ----------------
export default function ManagePage() {
  const { slug } = useParams();
  const [state, setState] = useState('loading'); // loading | login | ready | missing
  const [biz, setBiz] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState(null); // master | admin | pin
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [tab, setTab] = useState('products');
  const [editing, setEditing] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const d = await api('/api/business', { action: 'me', slug });
      setBiz(d.business);
      setIsAdmin(!!d.isAdmin);
      setRole(d.role);
      if (!d.isAdmin) setTab('products');
      setCategories(d.categories);
      setProducts(d.products);
      setState('ready');
    } catch (e) {
      if (e.status === 401) { setBiz(e.data && e.data.business); setState('login'); }
      else if (e.status === 404) setState('missing');
      else { setError(e.message); setState('login'); }
    }
  }

  useEffect(() => { load(); }, [slug]);

  // runs an action and refreshes the catalogue; returns true on success
  async function call(body) {
    setError('');
    try {
      const d = await api('/api/business', { ...body, slug });
      setCategories(d.categories);
      setProducts(d.products);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  async function saveProduct(product) {
    const d = await api('/api/business', { action: 'saveProduct', slug, product });
    setCategories(d.categories);
    setProducts(d.products);
    setEditing(null);
  }

  function openEdit(p) {
    const sizes = {};
    (p.sizes || []).forEach((s) => {
      const w = sizeWsp(s, p);
      const m = sizeMrp(s, p);
      sizes[s.size] = { wsp: w == null ? '' : String(w), mrp: m == null ? '' : String(m) };
    });
    const hasW = (p.sizes || []).some((s) => sizeWsp(s, p) != null);
    const hasM = (p.sizes || []).some((s) => sizeMrp(s, p) != null);
    setEditing({
      id: p.id, art_no: p.art_no, category_id: p.category_id || '', photo: undefined,
      photo_url: p.photo_url, colours: Array.isArray(p.colours) ? p.colours : [],
      use_wsp: hasW || !hasM, use_mrp: hasM, sizes, in_stock: p.in_stock,
    });
  }

  async function login(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/api/business', { action: 'login', slug, password });
      setPassword('');
      await load();
    } catch (e2) {
      setError(e2.message);
    }
    setBusy(false);
  }

  async function logout() {
    await api('/api/business', { action: 'logout', slug }).catch(() => {});
    setState('login');
  }

  if (state === 'loading') return <main className="wrap"><p className="muted center">Loading…</p></main>;
  if (state === 'missing') return <main className="wrap"><div className="error">Business not found.</div></main>;

  if (state === 'login') {
    return (
      <main className="wrap" style={{ maxWidth: 420, paddingTop: 50 }}>
        <form className="card center" onSubmit={login}>
          {biz && (biz.logo_url ? <img className="logo big" src={biz.logo_url} alt="" />
            : <span className="logo big logo-ph">{(biz.name || '?').charAt(0).toUpperCase()}</span>)}
          <h2 style={{ marginTop: 10 }}>{biz ? biz.name : 'Catalogue settings'}</h2>
          <div className="muted" style={{ marginBottom: 12 }}>Catalogue settings</div>
          {error && <div className="error">{error}</div>}
          <label className="field" style={{ textAlign: 'left' }}>Catalogue settings PIN (4 digits)
            <input type="password" inputMode="numeric" maxLength={4} value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 4))} autoFocus />
          </label>
          <button className="btn full" disabled={busy}>{busy ? 'Please wait…' : 'Log in'}</button>
        </form>
      </main>
    );
  }

  return (
    <main className="wrap">
      <div className="row between" style={{ marginBottom: 14, flexWrap: 'nowrap' }}>
        <div className="row" style={{ flexWrap: 'nowrap', minWidth: 0 }}>
          {biz.logo_url ? <img className="logo" src={biz.logo_url} alt="" />
            : <span className="logo logo-ph">{biz.name.charAt(0).toUpperCase()}</span>}
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0 }}>{biz.name}</h2>
            <div className="muted" style={{ fontWeight: 700 }}>Catalogue settings</div>
            <a className="muted" href={`/b/${biz.slug}`} target="_blank" rel="noreferrer">View catalogue ↗</a>
          </div>
        </div>
        {role === 'master' ? <a className="btn small blue" href="/admin">Master admin</a>
          : role === 'admin' ? <a className="btn small blue" href="/company">Admin</a>
            : <button className="btn small blue" onClick={logout}>Log out</button>}
      </div>

      <div className="tabs">
        <button className={'tab' + (tab === 'products' ? ' active' : '')} onClick={() => setTab('products')}>Products ({products.length})</button>
        {isAdmin && (
          <>
            <button className={'tab' + (tab === 'categories' ? ' active' : '')} onClick={() => setTab('categories')}>Categories ({categories.length})</button>
            <button className={'tab' + (tab === 'sizes' ? ' active' : '')} onClick={() => setTab('sizes')}>Sizes</button>
            <button className={'tab' + (tab === 'gst' ? ' active' : '')} onClick={() => setTab('gst')}>GST slabs</button>
          </>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {tab === 'products' || !isAdmin ? (
        <ProductsTab categories={categories} products={products} call={call} onEdit={openEdit} onAdd={() => setEditing(blankProduct())} />
      ) : tab === 'categories' ? (
        <CategoriesTab categories={categories} products={products} call={call} />
      ) : tab === 'sizes' ? (
        <SizeLists slug={slug} groups={brandSizeGroups(biz)} onSaved={(size_groups) => setBiz({ ...biz, size_groups })} />
      ) : (
        <GstSlabs slug={slug} slabs={biz.gst_slabs} onSaved={(gst_slabs) => setBiz({ ...biz, gst_slabs })} />
      )}

      {editing && (
        <ProductForm initial={editing} categories={categories} sizeGroups={brandSizeGroups(biz)} onCancel={() => setEditing(null)} onSave={saveProduct} />
      )}

      <div className="footer">Powered by TechIngen Solutions</div>
    </main>
  );
}
