'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import BrandHeader from '../../../components/BrandHeader';
import OrderCard from '../../../components/OrderCard';
import { checkOrder, lineQty, orderText, orderRows } from '../../../lib/order';
import OrderReport from '../../../components/OrderReport';
import SearchBar, { matchArt } from '../../../components/SearchBar';
import { slabLines } from '../../../lib/gst';
import { whatsappLink } from '../../../lib/social';

const EMPTY_CUSTOMER = { name: '', contact_person: '', phone: '', gst: '', address: '', note: '' };

export default function MainCatalogue() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const custRef = useRef(null);
  const [custError, setCustError] = useState('');
  const [cat, setCat] = useState('all');
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState({});
  const [orderError, setOrderError] = useState('');
  const [making, setMaking] = useState(false);
  const [pdfMode, setPdfMode] = useState('full'); // 'report' | 'full'
  const [pdf, setPdf] = useState(null); // { file, url, text }
  const [shareMsg, setShareMsg] = useState('');

  useEffect(() => {
    fetch(`/api/business?slug=${encodeURIComponent(slug)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Could not load the catalogue');
        setData(d);
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  const shown = useMemo(() => {
    if (!data) return [];
    return data.products.filter((p) => (cat === 'all' || p.category_id === cat) && matchArt(p, query));
  }, [data, cat, query]);

  // live consolidated report for the bottom of the catalogue
  const liveReport = useMemo(() => {
    if (!data) return null;
    const lines = data.products.filter((p) => sel[p.id] && sel[p.id].on && p.in_stock);
    return orderRows(lines, sel, data.categories, data.business.gst_slabs);
  }, [data, sel]);

  const totals = useMemo(() => {
    if (!data) return { count: 0, pcs: 0 };
    let count = 0;
    let pcs = 0;
    for (const p of data.products) {
      const s = sel[p.id];
      if (s && s.on && p.in_stock) { count += 1; pcs += lineQty(p, s).pcs; }
    }
    return { count, pcs };
  }, [data, sel]);

  async function sendOrder() {
    setOrderError('');
    if (!customer.name.trim() || !customer.phone.trim()) {
      setCustError('Please fill in store name and contact number.');
      setOrderError('Fill in the customer details first.');
      if (custRef.current) custRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setCustError('');
    const chk = checkOrder(data.products, sel);
    if (chk.error) return setOrderError(chk.error);
    setMaking(true);
    try {
      const { buildOrderPdf } = await import('../../../lib/orderPdf');
      const bytes = await buildOrderPdf({
        brand: data.business, customer, products: chk.lines, categories: data.categories, sel, mode: pdfMode,
      });
      const safe = (customer.name || 'customer').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
      const name = `Order-${pdfMode === 'report' ? 'Report' : 'Full'}-${safe}-${new Date().toISOString().slice(0, 10)}.pdf`;
      const file = new File([bytes], name, { type: 'application/pdf' });
      if (pdf && pdf.url) URL.revokeObjectURL(pdf.url);
      setPdf({ file, url: URL.createObjectURL(file), text: orderText(data.business, customer, chk.lines, data.categories, sel) });
      setShareMsg('');
    } catch (e) {
      setOrderError('Could not make the PDF: ' + (e.message || 'please try again'));
    }
    setMaking(false);
  }

  async function sharePdf() {
    setShareMsg('');
    const file = pdf.file;
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: file.name, text: `Order from ${customer.name}` });
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
    downloadPdf();
    setShareMsg('Sharing is not available here, so the PDF was downloaded. Attach it in WhatsApp.');
  }

  function downloadPdf() {
    const a = document.createElement('a');
    a.href = pdf.url;
    a.download = pdf.file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  if (error) return <main className="wrap"><div className="error">{error}</div></main>;
  if (!data) return <main className="wrap"><p className="muted center">Loading catalogue…</p></main>;

  const b = data.business;
  const setC = (k) => (e) => setCustomer({ ...customer, [k]: e.target.value });

  const brandWa = whatsappLink(b.whatsapp);

  // One page: Brand Page first, then customer details, catalogue, and Send order at the end
  return (
    <main className="wrap" style={{ paddingBottom: 110 }}>
      <BrandHeader b={b} />

      <div className="card" ref={custRef}>
        <h3>Buyer details</h3>
        {custError && <div className="error">{custError}</div>}
        <label className="field">Store name <span className="req">*</span>
          <input type="text" value={customer.name} onChange={setC('name')} />
        </label>
        <label className="field">Contact person
          <input type="text" value={customer.contact_person} onChange={setC('contact_person')} />
        </label>
        <label className="field">Contact number <span className="req">*</span>
          <input type="tel" value={customer.phone} onChange={setC('phone')} />
        </label>
        <label className="field">GST number
          <input type="text" value={customer.gst} onChange={setC('gst')} style={{ textTransform: 'uppercase' }} />
        </label>
        <label className="field">Address
          <textarea value={customer.address} onChange={setC('address')} />
        </label>
        <label className="field" style={{ marginBottom: 0 }}>Note
          <textarea value={customer.note} onChange={setC('note')} placeholder="Transport / courier, delivery details, etc." />
        </label>
      </div>

      <SearchBar onSearch={setQuery} />

      {data.categories.length > 0 && (
        <div className="chips">
          <button className={'chip' + (cat === 'all' ? ' active' : '')} onClick={() => setCat('all')}>All</button>
          {data.categories.map((c) => (
            <button key={c.id} className={'chip' + (cat === c.id ? ' active' : '')} onClick={() => setCat(c.id)}>{c.name}</button>
          ))}
        </div>
      )}

      {shown.length === 0 ? <p className="muted center">{query ? `No product found for "${query}".` : 'No products yet.'}</p> : (
        <div className="grid">
          {shown.map((p) => (
            <OrderCard key={p.id} p={p} categories={data.categories} sel={sel[p.id]}
              onChange={(s) => setSel({ ...sel, [p.id]: s })} />
          ))}
        </div>
      )}

      <div className="card report-card" style={{ marginTop: 18 }}>
        <OrderReport customer={customer} brand={b} report={liveReport || { rows: [], totalQty: 0, taxable: 0, totalGst: 0, grandTotal: 0, allPriced: true }} />
      </div>

      <div className="slab-note">
        {slabLines(b.gst_slabs).map((l, i) => <div key={i}>{l}</div>)}
      </div>

      <div className="pdf-choice">
        {[['report', 'Report PDF', 'Order summary table only'], ['full', 'Full PDF', 'With product images + summary']].map(([k, label, hint]) => (
          <button type="button" key={k} className={'pdf-box' + (pdfMode === k ? ' on' : '')} onClick={() => setPdfMode(k)} aria-pressed={pdfMode === k}>
            <span className="pdf-tick">{pdfMode === k ? '✓' : ''}</span>
            <span className="pdf-label">{label}</span>
            <span className="pdf-hint">{hint}</span>
          </button>
        ))}
      </div>

      <div className="footer">Powered by TechIngen Solutions</div>

      <div className="order-bar">
        {orderError && <div className="error" style={{ marginBottom: 8 }}>{orderError}</div>}
        <button className="btn full" onClick={sendOrder} disabled={making}>
          {making ? 'Making PDF…' : `Send order${totals.count ? ` · ${totals.count} item${totals.count > 1 ? 's' : ''} · ${totals.pcs} pcs` : ''}`}
        </button>
      </div>

      {pdf && (
        <div className="overlay">
          <div className="card center">
            <h2>{pdfMode === 'report' ? 'Report PDF' : 'Full PDF'} ready</h2>
            <p className="muted">Share the PDF on WhatsApp to {b.name}, then share again to the customer.</p>
            {shareMsg && <div className="ok">{shareMsg}</div>}
            <button className="btn full" onClick={sharePdf} style={{ marginBottom: 10 }}>Share PDF on WhatsApp</button>
            {brandWa && (
              <a className="btn full mint" style={{ marginBottom: 10 }} target="_blank" rel="noreferrer"
                href={brandWa + (brandWa.includes('?') ? '&' : '?') + 'text=' + encodeURIComponent(pdf.text)}>
                Send order to {b.name} WhatsApp
              </a>
            )}
            <button className="btn full mint" onClick={downloadPdf} style={{ marginBottom: 10 }}>Download PDF</button>
            <button className="btn full blue" onClick={() => setPdf(null)}>Close</button>
          </div>
        </div>
      )}
    </main>
  );
}
