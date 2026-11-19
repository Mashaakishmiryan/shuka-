import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';
import { useLoad, useStore } from '../lib/store.jsx';
import { HemBorder } from '../components/Motifs.jsx';
import { Empty, ErrorAlert, Field, Icon, Loading, StatusPill, Timeline } from '../components/ui.jsx';

function ReviewForm({ item, onDone, onCancel }) {
  const { t } = useI18n();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="card card-pad stack" style={{ marginTop: 10, background: 'var(--surface-2)' }}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api.post(`/products/${item.productId}/reviews`, { rating, body });
          onDone();
        } catch (err) {
          setError(err);
          setBusy(false);
        }
      }}
    >
      <b>{t('review.title', { title: item.title })}</b>
      <div>
        <div className="label">{t('review.rating')}</div>
        <div className="stars-input" role="radiogroup" aria-label={t('review.rating')}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n}`} className={n <= rating ? 'on' : ''} onClick={() => setRating(n)}>★</button>
          ))}
        </div>
      </div>
      <Field label={t('review.body')} htmlFor={`rv-${item.id}`} optional>
        <textarea id={`rv-${item.id}`} className="textarea" rows={3} maxLength={2000} placeholder={t('review.placeholder')} value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <ErrorAlert error={error} />
      <div className="row">
        <button className="btn btn-primary" type="submit" disabled={busy}>{t('review.submit')}</button>
        <button className="btn btn-ghost" type="button" onClick={onCancel}>{t('review.cancel')}</button>
      </div>
    </form>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const { t, amd, date, region } = useI18n();
  const { toast } = useStore();
  const res = useLoad(() => api.get(`/orders/${id}`), [id]);
  const [reviewing, setReviewing] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  if (res.loading && !res.data) return <main className="page"><Loading /></main>;
  if (res.error) {
    return (
      <main className="page container">
        {res.error.status === 404 ? <Empty title={t('common.notFound')} action={<Link className="btn" to="/orders">{t('orders.back')}</Link>} /> : <ErrorAlert error={res.error} />}
      </main>
    );
  }
  const o = res.data.order;
  const a = o.address;

  async function cancel(part) {
    if (!window.confirm(t('orders.cancelConfirm', { store: part.storeName }))) return;
    setBusy(part.id);
    setError(null);
    try {
      await api.post(`/orders/${o.id}/sellers/${part.id}/cancel`);
      toast(t('orders.cancelled'));
      await res.reload();
    } catch (e) {
      setError(e);
      res.reload();
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 980 }}>
        <Link to="/orders" className="btn btn-ghost btn-sm"><Icon name="back" size={16} /> {t('orders.back')}</Link>
        <div className="spread" style={{ margin: '8px 0 16px' }}>
          <div>
            <h1 style={{ marginBottom: 4 }}>{t('orders.order', { id: o.id })}</h1>
            <span className="muted">{t('orders.placedOn', { date: date(o.createdAt) })}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="small muted">{t('orders.cashToPay')}</div>
            <div className="price price-lg">{amd(o.totalAmd)}</div>
          </div>
        </div>
        <ErrorAlert error={error} />

        <div className="checkout-layout" style={{ marginTop: 12 }}>
          <div className="stack" style={{ marginTop: 0 }}>
            {o.parts.map((part) => (
              <section key={part.id} className="card seller-group">
                <div className="head">
                  <span><span className="muted small">{t('cart.from')}</span> <strong>{part.storeName}</strong></span>
                  <StatusPill status={part.status} />
                </div>
                <HemBorder onLight />
                {part.items.map((i) => (
                  <div key={i.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="line-item" style={{ borderTop: 0 }}>
                      <Link to={`/products/${i.productId}`}>{i.image ? <img src={i.image.thumb} alt="" /> : <span />}</Link>
                      <div>
                        <Link to={`/products/${i.productId}`} className="title">{i.title}</Link>
                        <div className="small muted">{amd(i.unitPriceAmd)} × {i.quantity}</div>
                        <div className="controls">
                          {i.canReview && reviewing !== i.id && (
                            <button type="button" className="btn btn-sm btn-brand" onClick={() => setReviewing(i.id)}>★ {t('orders.writeReview')}</button>
                          )}
                          {i.reviewed && <span className="pill status-delivered">✓ {t('orders.reviewed')}</span>}
                        </div>
                      </div>
                      <div className="total price">{amd(i.lineTotal)}</div>
                    </div>
                    {reviewing === i.id && (
                      <div style={{ padding: '0 18px 16px' }}>
                        <ReviewForm item={i} onCancel={() => setReviewing(null)} onDone={() => { setReviewing(null); toast(t('review.thanks')); res.reload(); }} />
                      </div>
                    )}
                  </div>
                ))}
                <div className="group-foot"><span>{t('cart.subtotal')}</span><span>{amd(part.subtotalAmd)}</span></div>
                <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)' }}>
                  <div className="label" style={{ marginBottom: 8 }}>{t('orders.history')}</div>
                  <Timeline history={part.history} who={(h) => (h.byMe ? t('orders.by.you') : t('orders.by.seller'))} />
                  <div className="spread" style={{ marginTop: 6 }}>
                    <span className="small muted"><Icon name="phone" size={14} /> {t('orders.sellerPhone')}: <a href={`tel:${part.sellerPhone}`}>{part.sellerPhone}</a></span>
                    {part.canCancel && (
                      <button type="button" className="btn btn-danger btn-sm" disabled={busy === part.id} onClick={() => cancel(part)}>{t('orders.cancel')}</button>
                    )}
                  </div>
                </div>
              </section>
            ))}
          </div>

          <aside className="card card-pad summary">
            <h3><Icon name="pin" size={18} /> {t('orders.deliveryTo')}</h3>
            <div className="address-block">
              <b>{a.recipient}</b><br />
              {a.phone}<br />
              {a.street}{a.apartment ? `, ${a.apartment}` : ''}<br />
              {a.city}, {region(a.region)}
              {a.note && <p className="small muted" style={{ marginTop: 8 }}>“{a.note}”</p>}
            </div>
            <div className="alert alert-info" style={{ marginTop: 14 }}><Icon name="cash" size={18} /> {t('checkout.payment')}</div>
          </aside>
        </div>
      </div>
    </main>
  );
}
