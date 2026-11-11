
function Swatch({ c }) {
  if (!c) return <span className="muted">-</span>;
  const style = c.type === 'photo' ? { backgroundImage: `url("${c.value}")` } : { backgroundColor: c.value };
  return <span className="mini-swatch" style={style} />;
}

const rs = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\.00$/, '');
const rs0 = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

// Consolidated report shown at the bottom of the catalogue
export default function OrderReport({ customer, report }) {
  return (
    <div>
      <table className="cust-table">
        <tbody>
          <tr><th>Customer name</th><td>{customer.name || '-'}</td></tr>
          <tr><th>Address</th><td style={{ whiteSpace: 'pre-line' }}>{customer.address || '-'}</td></tr>
          <tr><th>Contact number</th><td>{customer.phone || '-'}</td></tr>
          <tr><th>Note</th><td style={{ whiteSpace: 'pre-line' }}>{customer.note || '-'}</td></tr>
        </tbody>
      </table>

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
    </div>
  );
}
