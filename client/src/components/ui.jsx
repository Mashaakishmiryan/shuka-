import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';
import { useStore } from '../lib/store.jsx';
import { SteppedDiamond, Spinner } from './Motifs.jsx';

/* ───── icons (stroke, 24px grid) ───── */
const paths = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4-4',
  cart: 'M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2M10 20.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zm8 0a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0',
  box: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  store: 'M4 10v10h16V10M3 4h18l-1 6H4zM9 20v-6h6v6',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  tag: 'M20 12 12 20l-9-9V3h8zM7.5 7.5h.01',
  truck: 'M3 6h11v10H3zm11 4h4l3 3v3h-7M7.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  cash: 'M3 7h18v10H3zm9 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 10v.01M18 14v.01',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  back: 'M15 5l-7 7 7 7',
  filter: 'M4 6h16M7 12h10M10 18h4',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  pin: 'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zm0-9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  alert: 'M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  x: 'M6 6l12 12M18 6 6 18',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  heart: 'M12 20.5s-7.5-4.6-9.3-9.2C1.5 8.2 3.4 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.6 0 5.5 3.7 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  arrowLeft: 'M19 12H5m6-6-6 6 6 6',
  arrowRight: 'M5 12h14m-6-6 6 6-6 6',
};
export function Icon({ name, size = 20, stroke = 1.9, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={paths[name]} />
    </svg>
  );
}

/* ───── rating ───── */
export function Stars({ value = 0, size = 14 }) {
  const full = Math.round(value);
  return (
    <span className="stars" style={{ fontSize: size }} aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= full ? '' : 'off'}>★</span>)}
    </span>
  );
}
export function RatingLine({ avg, count }) {
  const { t } = useI18n();
  if (!count) return <span className="rating-line"><Stars value={0} /></span>;
  return (
    <span className="rating-line">
      <Stars value={avg} /> <b style={{ color: 'var(--text)' }}>{avg.toFixed(1)}</b>
      <span title={t('product.reviewsCount', { n: count })}>({count})</span>
    </span>
  );
}

/* ───── product card ───── */
export function StockLabel({ stock }) {
  const { t } = useI18n();
  if (stock <= 0) return <span className="stock out">{t('product.outOfStock')}</span>;
  if (stock <= 5) return <span className="stock low">{t('product.onlyLeft', { n: stock })}</span>;
  return <span className="stock in"><Icon name="check" size={16} /> {t('product.inStock')}</span>;
}

export function FavButton({ p }) {
  const { t } = useI18n();
  const { isFavorite, toggleFavorite } = useStore();
  const on = isFavorite(p.id);
  return (
    <button
      type="button" className="fav-btn" aria-pressed={on} aria-label={on ? t('fav.remove') : t('fav.add')}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(p.id); }}
    >
      <Icon name="heart" size={18} />
    </button>
  );
}

function QuickAdd({ p }) {
  const { t, errorText } = useI18n();
  const { user, cart, setCart, toast } = useStore();
  const nav = useNavigate();
  const [state, setState] = useState('idle');
  const inCart = cart?.groups.flatMap((g) => g.items).find((i) => i.productId === p.id)?.quantity || 0;
  if (p.stock === 0 || (user && p.storeName && user.storeName === p.storeName)) return null;
  return (
    <button
      type="button" className={`quick-add ${state === 'done' ? 'done' : ''}`} disabled={state === 'busy' || (user && inCart >= p.stock)}
      onClick={async (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!user) { nav(`/login?next=${encodeURIComponent(`/products/${p.id}`)}`); return; }
        setState('busy');
        try {
          const r = await api.put(`/cart/items/${p.id}`, { quantity: inCart + 1, acceptPrice: true });
          setCart(r.cart);
          setState('done');
          toast(t('product.added'));
          setTimeout(() => setState('idle'), 1500);
        } catch (err) {
          setState('idle');
          toast(errorText(err), 'error');
        }
      }}
    >
      {state === 'done' ? <><Icon name="check" size={14} /> {t('card.added')}</> : <><Icon name="plus" size={14} /> {t('card.add')}</>}
    </button>
  );
}

export function ProductCard({ p }) {
  const { amd, t } = useI18n();
  return (
    <Link to={`/products/${p.id}`} className="product-card">
      <FavButton p={p} />
      <div className="thumb">
        {p.image ? <img src={p.image.thumb} alt="" loading="lazy" width="400" height="400" /> : null}
        {p.stock === 0 && <span className="flag pill">{t('product.outOfStock')}</span>}
        {p.stock > 0 && p.stock <= 3 && <span className="flag pill tag-sale">{t('product.onlyLeft', { n: p.stock })}</span>}
      </div>
      <div className="body">
        <span className="title">{p.title}</span>
        {p.storeName && <span className="store">{p.storeName}</span>}
        <RatingLine avg={p.ratingAvg} count={p.ratingCount} />
        <span className="price" style={{ marginTop: 'auto' }}>{amd(p.priceAmd)}</span>
        <QuickAdd p={p} />
      </div>
    </Link>
  );
}

/* ───── pagination (links keep the rest of the URL) ───── */
export function Pagination({ page, pages, makeHref }) {
  const { t } = useI18n();
  if (pages <= 1) return null;
  const nums = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) nums.push(i);
  return (
    <nav className="pagination" aria-label="pagination">
      {page > 1 ? <Link to={makeHref(page - 1)} aria-label={t('page.prev')}>‹</Link> : <span className="disabled">‹</span>}
      {nums[0] > 1 && <><Link to={makeHref(1)}>1</Link>{nums[0] > 2 && <span className="disabled">…</span>}</>}
      {nums.map((n) => (n === page
        ? <span key={n} className="current" aria-current="page">{n}</span>
        : <Link key={n} to={makeHref(n)}>{n}</Link>))}
      {nums.at(-1) < pages && <>{nums.at(-1) < pages - 1 && <span className="disabled">…</span>}<Link to={makeHref(pages)}>{pages}</Link></>}
      {page < pages ? <Link to={makeHref(page + 1)} aria-label={t('page.next')}>›</Link> : <span className="disabled">›</span>}
    </nav>
  );
}

/* ───── forms ───── */
export function Field({ label, error, hint, children, className = '', htmlFor, optional }) {
  const { fieldError, t } = useI18n();
  return (
    <div className={`field ${error ? 'invalid' : ''} ${className}`}>
      {label && (
        <label htmlFor={htmlFor}>
          {label}{optional && <span className="muted" style={{ fontWeight: 500 }}> · {t('checkout.optional')}</span>}
        </label>
      )}
      {children}
      {error ? <span className="error" role="alert">{fieldError(error) || error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function QtyInput({ value, max, min = 1, onChange, small = false, disabled = false, label = 'Quantity' }) {
  const clamp = (n) => Math.max(min, Math.min(max, n));
  return (
    <div className={`qty ${small ? 'sm' : ''}`}>
      <button type="button" onClick={() => onChange(clamp(value - 1))} disabled={disabled || value <= min} aria-label="−">−</button>
      <input
        type="number" inputMode="numeric" aria-label={label} value={value} min={min} max={max} disabled={disabled}
        onChange={(e) => { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) onChange(clamp(n)); }}
      />
      <button type="button" onClick={() => onChange(clamp(value + 1))} disabled={disabled || value >= max} aria-label="+">+</button>
    </div>
  );
}

export function ErrorAlert({ error }) {
  const { errorText } = useI18n();
  if (!error) return null;
  return <div className="alert alert-error" role="alert"><Icon name="alert" size={18} /> <span>{typeof error === 'string' ? error : errorText(error)}</span></div>;
}

/* ───── order status ───── */
export function StatusPill({ status }) {
  const { status: label } = useI18n();
  return <span className={`pill status-${status}`}><span className="dot" />{label(status)}</span>;
}

export function Timeline({ history, who }) {
  const { status, dateTime } = useI18n();
  return (
    <ol className="timeline">
      {history.map((h, i) => (
        <li key={i}>
          <b>{status(h.to)}</b> <span className="muted">· {dateTime(h.at)}{who ? ` · ${who(h)}` : ''}</span>
        </li>
      ))}
    </ol>
  );
}

/* ───── states & guards ───── */
export function Empty({ title, hint, action }) {
  return (
    <div className="empty">
      <SteppedDiamond size={72} />
      <h2>{title}</h2>
      {hint && <p className="muted" style={{ margin: 0 }}>{hint}</p>}
      {action}
    </div>
  );
}

export function Loading() {
  const { t } = useI18n();
  return <Spinner label={t('common.loading')} />;
}

export function RequireUser({ children, seller = false }) {
  const { user } = useStore();
  const loc = useLocation();
  if (user === undefined) return <Loading />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (seller && !user.isSeller) return <Navigate to="/sell" replace />;
  return children;
}

export function NotFound() {
  const { t } = useI18n();
  return (
    <div className="container">
      <Empty title={t('common.notFound')} hint={t('common.notFoundHint')} action={<Link className="btn" to="/">{t('common.home')}</Link>} />
    </div>
  );
}

/** Turns an ApiError's per-field codes into { field: code }. */
export const fieldsOf = (err) => (err && err.fields) || {};
