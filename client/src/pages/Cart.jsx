import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';
import { useStore } from '../lib/store.jsx';
import { HemBorder, SilverBelt } from '../components/Motifs.jsx';
import { Empty, ErrorAlert, Icon, Loading, QtyInput } from '../components/ui.jsx';

export default function Cart() {
  const { t, amd } = useI18n();
  const { cart, setCart } = useStore();
  const nav = useNavigate();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  if (!cart) return <main className="page"><Loading /></main>;

  const run = async (pid, fn) => {
    setBusy(pid);
    setError(null);
    try {
      const r = await fn();
      setCart(r.cart);
    } catch (e) {
      setError(e);
      api.get('/cart').then((r) => setCart(r.cart)).catch(() => {});
    } finally {
      setBusy(null);
    }
  };
  const setQty = (item, quantity) => run(item.productId, () => api.put(`/cart/items/${item.productId}`, { quantity }));
  const accept = (item) => run(item.productId, () => api.put(`/cart/items/${item.productId}`, { quantity: Math.min(item.quantity, item.stock), acceptPrice: true }));
  const remove = (item) => run(item.productId, () => api.del(`/cart/items/${item.productId}`));

  if (cart.groups.length === 0) {
    return (
      <main className="page container">
        <Empty title={t('cart.empty')} hint={t('cart.emptyHint')} action={<Link to="/search" className="btn btn-primary">{t('home.shop')}</Link>} />
      </main>
    );
  }

  const count = cart.groups.reduce((s, g) => s + g.items.filter((i) => i.available).reduce((a, i) => a + i.quantity, 0), 0);

  return (
    <main className="page">
      <div className="container">
        <h1>{t('cart.title')}</h1>
        {cart.groups.length > 1 && <p className="muted">{t('cart.sellers', { n: cart.groups.length })}</p>}
        <ErrorAlert error={error} />
        <div className="cart-layout" style={{ marginTop: 12 }}>
          <div>
            {cart.groups.map((g) => (
              <section key={g.sellerId} className="card seller-group">
                <div className="head">
                  <span><span className="muted small">{t('cart.from')}</span> <strong>{g.storeName}</strong></span>
                </div>
                <HemBorder onLight />
                {g.items.map((i) => {
                  const problem = i.priceChanged || !i.available || i.exceedsStock;
                  return (
                    <div key={i.productId} className={`line-item ${problem ? 'problem' : ''}`}>
                      <Link to={`/products/${i.productId}`}>{i.image ? <img src={i.image.thumb} alt="" /> : <span />}</Link>
                      <div>
                        <Link to={`/products/${i.productId}`} className="title">{i.title}</Link>
                        <div className="small muted">{amd(i.priceAmd)}</div>
                        {i.priceChanged && i.available && (
                          <div className="alert alert-warn small" style={{ marginTop: 8, padding: '8px 10px' }}>
                            <Icon name="tag" size={16} />
                            <span>
                              {t('cart.priceChanged', { old: amd(i.priceWhenAdded), new: amd(i.priceAmd) })}{' '}
                              <button type="button" className="btn btn-sm" style={{ marginLeft: 6 }} disabled={busy === i.productId} onClick={() => accept(i)}>{t('cart.acceptPrice')}</button>
                            </span>
                          </div>
                        )}
                        {!i.available && <div className="alert alert-error small" style={{ marginTop: 8, padding: '8px 10px' }}>{t('cart.soldOut')}</div>}
                        {i.exceedsStock && <div className="alert alert-warn small" style={{ marginTop: 8, padding: '8px 10px' }}>{t('cart.tooMany', { n: i.stock })}</div>}
                        <div className="controls">
                          {i.available && (
                            <QtyInput small value={i.quantity} max={Math.max(i.stock, 1)} disabled={busy === i.productId}
                              onChange={(q) => q !== i.quantity && setQty(i, q)} label={t('product.quantity')} />
                          )}
                          <button type="button" className="btn btn-ghost btn-sm" disabled={busy === i.productId} onClick={() => remove(i)}>{t('cart.remove')}</button>
                        </div>
                      </div>
                      <div className="total price">{i.available ? amd(i.lineTotal) : '—'}</div>
                    </div>
                  );
                })}
                <div className="group-foot"><span>{t('cart.subtotal')}</span><span>{amd(g.subtotal)}</span></div>
              </section>
            ))}
          </div>

          <aside className="card card-pad summary">
            <div className="summary-row"><span>{t('cart.items', { n: count })}</span><b>{amd(cart.total)}</b></div>
            <div className="summary-row"><span>{t('cart.delivery')}</span><span className="small muted" style={{ textAlign: 'right' }}>{t('cart.deliveryValue')}</span></div>
            <SilverBelt label={t('cart.total')} value={amd(cart.total)} />
            {cart.hasProblems && <div className="alert alert-warn small" style={{ marginBottom: 10 }}>{t('cart.fixProblems')}</div>}
            <button type="button" className="btn btn-primary btn-lg btn-block" disabled={cart.hasProblems || cart.total === 0} onClick={() => nav('/checkout')}>
              {t('cart.checkout')}
            </button>
            <div className="cod-note" style={{ marginTop: 12 }}><Icon name="cash" /> {t('checkout.payment')}</div>
          </aside>
        </div>
      </div>
    </main>
  );
}
