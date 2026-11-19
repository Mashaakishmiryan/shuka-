import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';
import { useLoad } from '../lib/store.jsx';
import { Empty, ErrorAlert, Loading, Pagination, StatusPill } from '../components/ui.jsx';

export default function Orders() {
  const { t, amd, date } = useI18n();
  const [params] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const res = useLoad(() => api.get(`/orders?page=${page}`), [page]);

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 900 }}>
        <h1>{t('orders.title')}</h1>
        {res.loading && <Loading />}
        <ErrorAlert error={res.error} />
        {res.data && res.data.orders.length === 0 && (
          <Empty title={t('orders.empty')} action={<Link to="/search" className="btn btn-primary">{t('home.shop')}</Link>} />
        )}
        {res.data && res.data.orders.length > 0 && (
          <div className="card">
            {res.data.orders.map((o) => (
              <Link key={o.id} to={`/orders/${o.id}`} className="order-row">
                <div className="imgs">{o.images.slice(0, 3).map((im, i) => <img key={i} src={im.thumb} alt="" />)}</div>
                <div>
                  <b style={{ fontFamily: 'var(--serif)' }}>{t('orders.order', { id: o.id })}</b>
                  <div className="small muted">{t('orders.placedOn', { date: date(o.createdAt) })}</div>
                  <div className="row" style={{ gap: 6, marginTop: 6 }}>
                    {o.parts.map((p) => (
                      <span key={p.id} className="row small" style={{ gap: 4 }}>
                        <span className="muted">{p.storeName}:</span> <StatusPill status={p.status} />
                      </span>
                    ))}
                  </div>
                </div>
                <div className="price">{amd(o.totalAmd)}</div>
              </Link>
            ))}
          </div>
        )}
        {res.data && <Pagination page={res.data.page} pages={res.data.pages} makeHref={(n) => `/orders?page=${n}`} />}
      </div>
    </main>
  );
}
