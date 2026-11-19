import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';
import { useLoad, useStore } from '../lib/store.jsx';
import { Anahit, Aram } from '../components/Avatars.jsx';
import { Empty, ErrorAlert, Icon, Loading, QtyInput, RatingLine, Stars, StockLabel } from '../components/ui.jsx';

export default function Product() {
  const { id } = useParams();
  const { t, amd, date, category, errorText } = useI18n();
  const { user, cart, refreshCart, setCart, toast } = useStore();
  const loc = useLocation();
  const res = useLoad(() => api.get(`/products/${id}`), [id]);
  const reviews = useLoad(() => api.get(`/products/${id}/reviews`), [id]);
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { setActive(0); setQty(1); setError(null); }, [id]);

  if (res.loading) return <main className="page"><Loading /></main>;
  if (res.error) {
    return (
      <main className="page container">
        {res.error.status === 404
          ? <Empty title={t('product.notFound')} action={<Link to="/search" className="btn">{t('search.backToAll')}</Link>} />
          : <ErrorAlert error={res.error} />}
      </main>
    );
  }

  const p = res.data.product;
  const inCart = cart?.groups.flatMap((g) => g.items).find((i) => i.productId === p.id)?.quantity || 0;
  const canAdd = Math.max(0, p.stock - inCart);
  const image = p.images[active] || p.images[0];

  async function addToCart() {
    setBusy(true);
    setError(null);
    try {
      // Setting the total quantity also records today's price for this item.
      const r = await api.put(`/cart/items/${p.id}`, { quantity: inCart + qty, acceptPrice: true });
      setCart(r.cart);
      toast(t('product.added'));
      setQty(1);
    } catch (e) {
      setError(errorText(e));
      if (e.data?.stock !== undefined) res.setData({ product: { ...p, stock: e.data.stock } });
      refreshCart();
    } finally {
      setBusy(false);
    }
  }

  const buyControls = () => {
    if (p.isOwn) {
      return (
        <div className="alert alert-info">
          <Icon name="store" size={18} />
          <span>{t('product.ownProduct')} · <Link to={`/seller/products/${p.id}`}>{t('product.editProduct')}</Link></span>
        </div>
      );
    }
    if (!user) {
      return <Link to={`/login?next=${encodeURIComponent(loc.pathname)}`} className="btn btn-primary btn-lg">{t('product.signInToBuy')}</Link>;
    }
    if (p.stock === 0) return <button type="button" className="btn btn-lg" disabled>{t('product.outOfStock')}</button>;
    return (
      <div className="stack">
        <div className="row">
          <span className="label">{t('product.quantity')}</span>
          <QtyInput value={Math.min(qty, Math.max(1, canAdd))} max={Math.max(1, canAdd)} onChange={setQty} disabled={canAdd === 0} label={t('product.quantity')} />
        </div>
        {inCart > 0 && (
          <div className="small muted">
            {t('product.inCart', { n: inCart })} · <Link to="/cart">{t('product.viewCart')}</Link>
            {canAdd === 0 && <> · {t('product.maxStock', { n: p.stock })}</>}
          </div>
        )}
        <button type="button" className="btn btn-primary btn-lg btn-block" disabled={busy || canAdd === 0} onClick={addToCart}>
          <Icon name="cart" /> {t('product.addToCart')}
        </button>
      </div>
    );
  };

  return (
    <main className="page">
      <div className="container">
        <div className="breadcrumbs">
          <Link to="/">Շուկա</Link> /
          <Link to={`/search?category=${p.category.slug}`}>{category(p.category.slug, p.category.name)}</Link>
        </div>
        {!p.isPublished && <div className="alert alert-warn" style={{ marginBottom: 16 }}><Icon name="eye" size={18} /> {t('product.unpublished')}</div>}

        <div className="product-layout">
          <div className="gallery">
            <div className="main">
              {image && <img src={image.large} alt={p.title} width="1200" height="1200" />}
            </div>
            {p.images.length > 1 && (
              <div className="thumbs">
                {p.images.map((img, i) => (
                  <button key={img.id} type="button" onClick={() => setActive(i)} aria-current={i === active} aria-label={`${i + 1}`}>
                    <img src={img.thumb} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="buy-box">
            <h1>{p.title}</h1>
            <RatingLine avg={p.ratingAvg} count={p.ratingCount} />
            <div className="price price-lg">{amd(p.priceAmd)}</div>
            <StockLabel stock={p.stock} />
            <div className="seller-line">
              <Aram size={42} />
              <div>
                <div className="small muted">{t('product.soldBy')}</div>
                <b>{p.seller.storeName}</b>
              </div>
            </div>
            {error && <ErrorAlert error={error} />}
            {buyControls()}
            <div className="cod-note"><Icon name="cash" /> {t('product.cod')}</div>
            <div>
              <h3 style={{ marginTop: 10 }}>{t('product.description')}</h3>
              <p className="description">{p.description}</p>
            </div>
          </div>
        </div>

        <section className="section">
          <div className="section-head">
            <h2>{t('product.reviews')}</h2>
            {p.ratingCount > 0 && <span className="row"><Stars value={p.ratingAvg} size={18} /> <b>{p.ratingAvg.toFixed(1)}</b></span>}
          </div>
          <div className="card card-pad">
            {reviews.loading && <Loading />}
            {reviews.data && reviews.data.reviews.length === 0 && <p className="muted" style={{ margin: 0 }}>{t('product.noReviews')}</p>}
            {reviews.data?.reviews.map((r) => (
              <div className="review" key={r.id}>
                <Anahit size={44} ring="rose" />
                <div>
                  <div className="row" style={{ gap: 8 }}>
                    <Stars value={r.rating} size={15} />
                    <b>{r.author}</b>
                    <span className="small muted">{date(r.createdAt)}</span>
                  </div>
                  {r.body && <p style={{ margin: '6px 0 0' }}>{r.body}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
