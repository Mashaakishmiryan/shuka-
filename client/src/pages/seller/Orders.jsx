import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, qs } from '../../lib/api.js';
import { useI18n } from '../../lib/i18n.jsx';
import { useLoad } from '../../lib/store.jsx';
import { Empty, ErrorAlert, Loading, Pagination, StatusPill } from '../../components/ui.jsx';

const TABS = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export default function Orders() {
  const { t, amd, date, status, region } = useI18n();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const st = TABS.includes(params.get('status')) ? params.get('status') : '';
  const page = Number(params.get('page')) || 1;
  const res = useLoad(() => api.get(`/seller/orders${qs({ status: st, page: page > 1 ? page : '' })}`), [st, page]);
  const counts = res.data?.counts;
  const all = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : null;

  return (
    <div className="stack">
      <h1 style={{ margin: 0 }}>{t('dash.orders')}</h1>
      <nav className="tabs">
        <Link to="/seller/orders" className={!st ? 'active' : ''}>{t('dash.allOrders')}{all !== null && <span className="n">{all}</span>}</Link>
        {TABS.map((s) => (
          <Link key={s} to={`/seller/orders?status=${s}`} className={st === s ? 'active' : ''}>
            {status(s)}{counts && <span className="n">{counts[s]}</span>}
          </Link>
        ))}
      </nav>
      {res.loading && !res.data && <Loading />}
      <ErrorAlert error={res.error} />
      {res.data && res.data.orders.length === 0 && <div className="card"><Empty title={t('dash.noOrders')} /></div>}
      {res.data && res.data.orders.length > 0 && (
        <div className="card table-wrap">
          <table className="table responsive">
            <thead>
              <tr>
                <th>{t('dash.col.order')}</th>
                <th>{t('dash.col.buyer')}</th>
                <th>{t('dash.col.items')}</th>
                <th>{t('dash.col.status')}</th>
                <th className="num">{t('dash.col.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {res.data.orders.map((o) => (
                <tr key={o.id} className="clickable" onClick={() => nav(`/seller/orders/${o.id}`)}>
                  <td>
                    <Link to={`/seller/orders/${o.id}`} style={{ fontWeight: 800 }}>#{o.id}</Link>
                    <div className="small muted">{date(o.createdAt)}</div>
                  </td>
                  <td className="span">
                    <b>{o.recipient}</b>
                    <div className="small muted">{o.city}, {region(o.region)}</div>
                  </td>
                  <td data-hide-mobile>{t('dash.itemsN', { n: o.itemCount })}</td>
                  <td><StatusPill status={o.status} /></td>
                  <td className="num price span" style={{ fontSize: '1rem' }}>{amd(o.subtotalAmd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {res.data && <Pagination page={res.data.page} pages={res.data.pages} makeHref={(n) => `/seller/orders${qs({ status: st, page: n > 1 ? n : '' })}`} />}
    </div>
  );
}
