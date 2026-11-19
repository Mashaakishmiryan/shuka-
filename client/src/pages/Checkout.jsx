import { useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, newRequestKey } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';
import { useStore } from '../lib/store.jsx';
import { SilverBelt } from '../components/Motifs.jsx';
import { ErrorAlert, Field, Icon, Loading, fieldsOf } from '../components/ui.jsx';

const REGIONS = ['yerevan', 'aragatsotn', 'ararat', 'armavir', 'gegharkunik', 'kotayk', 'lori', 'shirak', 'syunik', 'tavush', 'vayots_dzor'];

export default function Checkout() {
  const { t, amd, region } = useI18n();
  const { user, cart, refreshCart, refreshUser } = useStore();
  const nav = useNavigate();
  const last = user?.lastAddress;
  const [form, setForm] = useState(() => ({
    recipient: last?.recipient || user?.name || '',
    phone: last?.phone || user?.phone || '',
    region: last?.region || '',
    city: last?.city || '',
    street: last?.street || '',
    apartment: last?.apartment || '',
    note: '',
  }));
  const [error, setError] = useState(null);
  const [placing, setPlacing] = useState(false);
  // One key per checkout page visit: a double click or a retry sends the same key → one order.
  const requestKey = useMemo(newRequestKey, []);
  const lock = useRef(false);

  if (!cart) return <main className="page"><Loading /></main>;
  if (cart.groups.length === 0 && !placing) return <Navigate to="/cart" replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const fe = fieldsOf(error);

  async function submit(e) {
    e.preventDefault();
    if (lock.current) return; // the button locks after one click
    lock.current = true;
    setPlacing(true);
    setError(null);
    try {
      const r = await api.post('/orders', { ...form, requestKey });
      await Promise.all([refreshCart(), refreshUser()]);
      nav(`/orders/${r.order.id}/placed`, { replace: true });
    } catch (err) {
      setError(err);
      lock.current = false;
      setPlacing(false);
      if (err.status === 409) refreshCart();
    }
  }

  return (
    <main className="page">
      <div className="container">
        <h1>{t('checkout.title')}</h1>
        <form className="checkout-layout" onSubmit={submit} noValidate>
          <section className="card card-pad">
            <h2>{t('checkout.delivery')}</h2>
            {last && <p className="small muted">{t('checkout.prefilled')}</p>}
            <div className="form-grid">
              <Field label={t('checkout.recipient')} error={fe.recipient} htmlFor="recipient">
                <input id="recipient" className="input" autoComplete="name" value={form.recipient} onChange={set('recipient')} required />
              </Field>
              <Field label={t('checkout.phone')} error={fe.phone} htmlFor="phone" hint={t('auth.phoneHint')}>
                <input id="phone" className="input" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} required />
              </Field>
              <Field label={t('checkout.region')} error={fe.region} htmlFor="region">
                <select id="region" className="select" value={form.region} onChange={set('region')} required>
                  <option value="">{t('checkout.chooseRegion')}</option>
                  {REGIONS.map((r) => <option key={r} value={r}>{region(r)}</option>)}
                </select>
              </Field>
              <Field label={t('checkout.city')} error={fe.city} htmlFor="city">
                <input id="city" className="input" autoComplete="address-level2" value={form.city} onChange={set('city')} required />
              </Field>
              <Field label={t('checkout.street')} error={fe.street} htmlFor="street">
                <input id="street" className="input" autoComplete="address-line1" value={form.street} onChange={set('street')} required />
              </Field>
              <Field label={t('checkout.apartment')} error={fe.apartment} htmlFor="apartment" optional>
                <input id="apartment" className="input" autoComplete="address-line2" value={form.apartment} onChange={set('apartment')} />
              </Field>
              <Field label={t('checkout.note')} error={fe.note} htmlFor="note" className="full" optional>
                <textarea id="note" className="textarea" rows={3} placeholder={t('checkout.notePlaceholder')} value={form.note} onChange={set('note')} maxLength={500} />
              </Field>
            </div>
          </section>

          <aside className="card card-pad summary">
            <h2>{t('checkout.yourOrder')}</h2>
            {cart.groups.map((g) => (
              <div key={g.sellerId} style={{ marginBottom: 14 }}>
                <div className="spread small"><b>{g.storeName}</b><span>{amd(g.subtotal)}</span></div>
                <ul className="mini-items">
                  {g.items.filter((i) => i.available).map((i) => (
                    <li key={i.productId}>
                      {i.image ? <img src={i.image.thumb} alt="" /> : <span />}
                      <span>{i.title} <span className="muted">× {i.quantity}</span></span>
                      <span>{amd(i.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <SilverBelt label={t('cart.total')} value={amd(cart.total)} />
            <div className="alert alert-info" style={{ marginBottom: 12 }}>
              <Icon name="cash" size={18} />
              <span><b>{t('checkout.payment')}</b><br /><span style={{ fontWeight: 500 }}>{t('checkout.paymentHint')}</span></span>
            </div>
            {error && (
              <div style={{ marginBottom: 12 }}>
                <ErrorAlert error={error} />
                {error.status === 409 && <Link to="/cart" className="btn btn-sm" style={{ marginTop: 8 }}>{t('checkout.backToCart')}</Link>}
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={placing || cart.hasProblems}>
              {placing ? t('checkout.placing') : t('checkout.place')}
            </button>
            {cart.hasProblems && <p className="small muted" style={{ marginTop: 8 }}>{t('cart.fixProblems')} · <Link to="/cart">{t('checkout.backToCart')}</Link></p>}
          </aside>
        </form>
      </div>
    </main>
  );
}
