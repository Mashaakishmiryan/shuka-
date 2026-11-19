import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';
import { useLoad } from '../lib/store.jsx';
import { SteppedDiamond } from '../components/Motifs.jsx';
import { Anahit } from '../components/Avatars.jsx';
import { ErrorAlert, Loading } from '../components/ui.jsx';

export default function OrderPlaced() {
  const { id } = useParams();
  const { t, amd } = useI18n();
  const res = useLoad(() => api.get(`/orders/${id}`), [id]);
  if (res.loading) return <main className="page"><Loading /></main>;
  if (res.error) return <main className="page container"><ErrorAlert error={res.error} /></main>;
  const o = res.data.order;
  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="card card-pad" style={{ textAlign: 'center', padding: '36px 24px' }}>
          <div className="row" style={{ justifyContent: 'center', gap: 4 }}>
            <SteppedDiamond size={40} />
            <Anahit size={88} />
            <SteppedDiamond size={40} />
          </div>
          <h1 style={{ marginTop: 18 }}>{t('checkout.doneTitle')}</h1>
          <p className="muted" style={{ margin: 0 }}>{t('checkout.doneNumber')}</p>
          <div className="price price-lg" style={{ fontSize: '2.4rem', color: 'var(--link)' }}>#{o.id}</div>
          <p style={{ marginTop: 14 }}>{t('checkout.doneText', { total: amd(o.totalAmd) })}</p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 18 }}>
            <Link to={`/orders/${o.id}`} className="btn btn-brand">{t('checkout.viewOrder')}</Link>
            <Link to="/search" className="btn">{t('checkout.continue')}</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
