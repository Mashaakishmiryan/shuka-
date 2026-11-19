import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useI18n } from '../../lib/i18n.jsx';
import { useLoad, useStore } from '../../lib/store.jsx';
import { SilverBelt } from '../../components/Motifs.jsx';
import { Empty, ErrorAlert, Icon, Loading, StatusPill, Timeline } from '../../components/ui.jsx';

export default function OrderDetail() {
  const { id } = useParams();
  const { t, amd, date, region, status } = useI18n();
  const { toast } = useStore();
  const res = useLoad(() => api.get(`/seller/orders/${id}`), [id]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (res.loading && !res.data) return <Loading />;
  if (res.error) {
    return res.error.status === 404
      ? <Empty title={t('common.notFound')} action={<Link className="btn" to="/seller/orders">{t('dash.backToOrders')}</Link>} />
      : <ErrorAlert error={res.error} />;
  }
  const o = res.data.order;
  const d = o.delivery;

  async function move(to) {
    if (to === 'cancelled' && !window.confirm(t('dash.cancelConfirm'))) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/seller/orders/${o.id}/status`, { to });
      toast(t('dash.moved', { status: status(to) }));
      window.dispatchEvent(new Event('shuka:orders-changed'));
      await res.reload();
    } catch (e) {
      setError(e);
      res.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 1000 }}>
      <Link to="/seller/orders" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}><Icon name="back" size={16} /> {t('dash.backToOrders')}</Link>
      <div className="spread">
        <div>
          <h1 style={{ marginBottom: 4 }}>{t('dash.orderTitle', { id: o.id })}</h1>
          <span className="muted">{date(o.orderedAt)}</span>
        </div>
        <StatusPill status={o.status} />
      </div>
      <ErrorAlert error={error} />

      <div className="checkout-layout">
        <div className="stack" style={{ marginTop: 0 }}>
          <section className="card">
            <div className="card-pad" style={{ paddingBottom: 0 }}><h3>{t('dash.items')}</h3></div>
            {o.items.map((i) => (
              <div key={i.id} className="line-item">
                {i.image ? <img src={i.image.thumb} alt="" /> : <span />}
                <div>
                  <div className="title">{i.title}</div>
                  <div className="small muted">{amd(i.unitPriceAmd)} × {i.quantity} · {t('dash.priceAtPurchase')}</div>
                </div>
                <div className="total price">{amd(i.lineTotal)}</div>
              </div>
            ))}
          </section>

          <section className="card card-pad">
            <h3>{t('dash.history')}</h3>
            <Timeline history={o.history} who={(h) => (h.by === 'seller' ? t('dash.by.seller') : `${t('dash.by.buyer')} (${h.byName})`)} />
          </section>
        </div>

        <aside className="stack summary" style={{ marginTop: 0 }}>
          <section className="card card-pad">
            <h3><Icon name="pin" size={18} /> {t('dash.deliveryDetails')}</h3>
            <dl className="kv">
              <dt>{t('dash.recipient')}</dt><dd>{d.recipient}</dd>
              <dt>{t('dash.phone')}</dt><dd><a href={`tel:${d.phone}`}>{d.phone}</a></dd>
              <dt>{t('dash.address')}</dt>
              <dd>{d.street}{d.apartment ? `, ${d.apartment}` : ''}<br />{d.city}, {region(d.region)}</dd>
              {d.note && <><dt>{t('dash.note')}</dt><dd style={{ fontWeight: 500 }}>“{d.note}”</dd></>}
            </dl>
            <SilverBelt label={t('dash.cashToCollect')} value={amd(o.cashToCollect)} />
          </section>

          <section className="card card-pad">
            <h3>{t('dash.actions')}</h3>
            {o.allowedMoves.length === 0 && <p className="muted" style={{ margin: 0 }}>{t('dash.noActions')}</p>}
            <div className="stack">
              {o.allowedMoves.filter((m) => m !== 'cancelled').map((m) => (
                <button key={m} type="button" className="btn btn-primary btn-lg btn-block" disabled={busy} onClick={() => move(m)}>{t(`dash.move.${m}`)}</button>
              ))}
              {o.allowedMoves.includes('cancelled') && (
                <button type="button" className="btn btn-danger btn-block" disabled={busy} onClick={() => move('cancelled')}>{t('dash.move.cancelled')}</button>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
