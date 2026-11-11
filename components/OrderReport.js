
function Swatch({ c }) {
  if (!c) return <span className="muted">-</span>;
  const style = c.type === 'photo' ? { backgroundImage: `url("${c.value}")` } : { backgroundColor: c.value };
  return <span className="mini-swatch" style={style} />;
}

const rs = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\.00$/, '');
const rs0 = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export function orderDateTime(d = new Date()) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ORDER FORM heading: title, date & time, logo, buyer (left) and company (right)
export function OrderFormHead({ customer, brand }) {
  const buyer = [
    ['Buyer', customer.name], ['Contact person', customer.contact_person], ['Contact number', customer.phone],
    ['GST number', customer.gst ? 'GST: ' + customer.gst : ''], ['Address', customer.address],
  ];
  const company = [
    brand.name, brand.contact_person, brand.contact_number,
    brand.gst_number ? 'GST: ' + brand.gst_number : '', brand.address,
  ];
  return (
    <div className="of-head">
      <div className="of-title">ORDER FORM</div>
      <div className="of-date">{orderDateTime()}</div>
      {brand.logo_url && <img className="logo big of-logo" src={brand.logo_url} alt="" />}
      <div className="of-cols">
        <div className="of-left">
          {buyer.map(([k, v], i) => (
            <div key={k} className={i === 0 ? 'of-strong' : ''}>
              {i === 0 ? 'Buyer: ' : ''}{v || (i === 0 ? '-' : <span className="muted">{k}: -</span>)}
            </div>
          ))}
        </div>
        <div className="of-right">
          {company.map((v, i) => (v ? <div key={i} className={i === 0 ? 'of-strong' : ''}>{v}</div> : null))}
        </div>
      </div>
      {customer.note && <div className="of-note"><b>Note:</b> {customer.note}</div>}
    </div>
  );
}

// Consolidated report shown at the bottom of the catalogue
export default function OrderReport({ customer, brand, report }) {
  return (
    <div>
      <OrderFormHead customer={customer} brand={brand} />
      {report.rows.length === 0 ? (
        <p className="muted center" style={{ margin: '10px 0 0' }}>Tick a product image, then choose colour and size. Your order will appear here.</p>
      ) : (
      <>
      <div className="report-scroll">
        <table className="report">
          <thead>
            <tr>
              <th>Sr.</th><th>Art no.</th><th>Clr</th><th>Size</th>
              <th className="num">Qty</th><th className="num">Rate</th><th className="num">GST</th><th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r) => (
              <tr key={r.sr}>
                <td>{r.sr}</td>
                <td>{r.art}</td>
                <td><Swatch c={r.colour} /></td>
                <td className="sizes-cell">{r.size}</td>
                <td className="num">{r.qty}</td>
                <td className="num">{r.rate != null ? rs0(r.rate) : '-'}</td>
                <td className="num">{r.gst != null ? <>{r.gstPct}%<br /><span className="small">{rs(r.gst)}</span></> : '-'}</td>
                <td className="num">{r.total != null ? <>{rs(r.total)}<br /><span className="small total-sub">{rs(r.amount)}+GST</span></> : '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>Total</td>
              <td className="num">{report.totalQty}</td>
              <td className="num" />
              <td className="num">{rs(report.totalGst)}</td>
              <td className="num">{rs(report.grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <table className="cust-table totals-table">
        <tbody>
          <tr><th>Total qty</th><td className="num">{report.totalQty} pcs</td></tr>
          <tr><th>Taxable value</th><td className="num">{rs(report.taxable)}</td></tr>
          <tr><th>GST</th><td className="num">{rs(report.totalGst)}</td></tr>
          <tr className="grand"><th>Grand total</th><td className="num">{rs(report.grandTotal)}{report.allPriced ? '' : ' *'}</td></tr>
        </tbody>
      </table>
      <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
        Rate = WSP per piece, before GST.
        {report.allPriced ? '' : ' * Items without WSP are not included.'}
      </div>
      </>
      )}
    </div>
  );
}
