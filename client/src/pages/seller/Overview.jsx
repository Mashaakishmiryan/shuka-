import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useI18n } from '../../lib/i18n.jsx';
import { useLoad } from '../../lib/store.jsx';
import { ErrorAlert, Icon, Loading } from '../../components/ui.jsx';

const ORDER = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const COLORS = { placed: 'var(--collar-periwinkle)', confirmed: 'var(--taraz-rose)', shipped: 'var(--apricot)', delivered: 'var(--ok)', cancelled: 'var(--silver-coin)' };

export default function Overview() {
  const { t, amd, status } = useI18n();
  const res = useLoad(() => api.get('/seller/overview'), []);
  if (res.loading) return <Loading />;
  if (res.error) return <ErrorAlert error={res.error} />;
  const o = res.data.overview;
  const max = Math.max(1, ...ORDER.map((s) => o.ordersByStatus[s]));

  return (
    <div className="stack">
      <div className="spread">
        <h1 style={{ margin: 0 }}>{t('dash.overview')}</h1>
        <Link to="/seller/products/new" className="btn btn-primary"><Icon name="plus" size={18} /> {t('dash.addProduct')}</Link>
      </div>
      <div className="stat-grid">
        <Link to="/seller/orders?status=placed" className="card stat" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div className="label">{t('dash.toConfirm')}</div><div className="value">{o.toConfirm}</div>
        </Link>
        <Link to="/seller/orders?status=confirmed" className="card stat" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div className="label">{t('dash.toShip')}</div><div className="value">{o.toShip}</div>
        </Link>
        <div className="card stat accent">
          <div className="label">{t('dash.revenue30')}</div><div className="value">{amd(o.revenue30d)}</div>
        </div>
        <div className="card stat">
          <div className="label">{t('dash.revenueAll')}</div><div className="value" style={{ fontSize: '1.5rem' }}>{amd(o.revenueAllTime)}</div>
        </div>
      </div>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))' }}>
        <div className="card card-pad">
          <h3>{t('dash.byStatus')}</h3>
          <div className="bar-list">
            {ORDER.map((s) => (
              <Link key={s} to={`/seller/orders?status=${s}`} className="row" style={{ color: 'inherit', textDecoration: 'none' }}>
                <span>{status(s)}</span>
                <span className="bar-track"><span className="bar-fill" style={{ display: 'block', width: `${(o.ordersByStatus[s] / max) * 100}%`, background: COLORS[s] }} /></span>
                <b style={{ textAlign: 'right' }}>{o.ordersByStatus[s]}</b>
              </Link>
            ))}
          </div>
        </div>
        <div className="card card-pad">
          <h3>{t('dash.products')}</h3>
          <p className="value" style={{ fontFamily: 'var(--serif)', fontSize: '1.9rem', fontWeight: 700, margin: '4px 0' }}>{o.products.total}</p>
          <p className="muted" style={{ margin: 0 }}>{t('dash.productsStat', { published: o.products.published, total: o.products.total })}</p>
          {o.products.soldOut > 0 && <p className="small" style={{ color: 'var(--danger)', fontWeight: 700, marginTop: 6 }}>{t('dash.soldOut', { n: o.products.soldOut })}</p>}
          <Link to="/seller/products" className="btn btn-sm" style={{ marginTop: 12 }}>{t('dash.products')} →</Link>
        </div>
      </div>
    </div>
  );
}
