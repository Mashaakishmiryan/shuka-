import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../lib/i18n.jsx';
import { useStore } from '../lib/store.jsx';
import { HemBorder } from './Motifs.jsx';
import { UserAvatar } from './Avatars.jsx';
import { Icon } from './ui.jsx';

function LangSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label={t('nav.language')}>
      <button type="button" aria-pressed={lang === 'hy'} onClick={() => setLang('hy')} lang="hy">ՀԱՅ</button>
      <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')} lang="en">EN</button>
    </div>
  );
}

function SearchBar() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const loc = useLocation();
  const [q, setQ] = useState(params.get('q') || '');
  useEffect(() => {
    if (loc.pathname === '/search') setQ(params.get('q') || '');
  }, [loc.pathname, params]);
  return (
    <form
      className="search" role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const next = new URLSearchParams();
        if (q.trim()) next.set('q', q.trim());
        // keep the chosen category when searching from a category page
        if (loc.pathname === '/search' && params.get('category')) next.set('category', params.get('category'));
        nav(`/search${next.toString() ? `?${next}` : ''}`);
      }}
    >
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('nav.searchPlaceholder')} aria-label={t('nav.search')} enterKeyHint="search" />
      <button type="submit" aria-label={t('nav.search')}><Icon name="search" /></button>
    </form>
  );
}

function AccountMenu() {
  const { user, logout } = useStore();
  const { t } = useI18n();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  if (!user) {
    return (
      <Link className="icon-btn" to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`}>
        <Icon name="user" /> <span className="label">{t('nav.signIn')}</span>
      </Link>
    );
  }
  return (
    <div className="menu" ref={ref}>
      <button type="button" className="icon-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <UserAvatar user={user} size={28} ring="rose" />
        <span className="label">{user.name.split(' ')[0]}</span>
      </button>
      {open && (
        <div className="menu-panel" role="menu">
          <div className="who">
            <UserAvatar user={user} size={40} />
            <div style={{ minWidth: 0 }}>
              <b style={{ display: 'block' }}>{user.name}</b>
              <span className="small muted">{user.storeName || user.email}</span>
            </div>
          </div>
          <Link role="menuitem" to="/orders"><Icon name="box" size={18} /> {t('nav.myOrders')}</Link>
          {user.isSeller
            ? <Link role="menuitem" to="/seller"><Icon name="store" size={18} /> {t('nav.dashboard')}</Link>
            : <Link role="menuitem" to="/sell"><Icon name="store" size={18} /> {t('nav.sell')}</Link>}
          <Link role="menuitem" to="/account"><Icon name="user" size={18} /> {t('nav.profile')}</Link>
          <button type="button" role="menuitem" className="item" onClick={async () => { await logout(); nav('/'); }}>
            <Icon name="logout" size={18} /> {t('nav.logout')}
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { t, category } = useI18n();
  const { cartCount, categories } = useStore();
  const [params] = useSearchParams();
  const loc = useLocation();
  const activeCat = loc.pathname === '/search' ? params.get('category') : null;
  return (
    <header className="site-header">
      <div className="container bar">
        <Link to="/" className="logo" aria-label="Shuka — home">
          <span className="hy" lang="hy">Շուկա</span>
          <span className="en">SHUKA</span>
        </Link>
        <SearchBar />
        <div className="header-actions">
          <LangSwitch />
          <Link to="/cart" className="icon-btn" aria-label={`${t('nav.cart')} (${cartCount})`}>
            <Icon name="cart" size={22} />
            <span className="label">{t('nav.cart')}</span>
            {cartCount > 0 && <span className="badge-count">{cartCount > 99 ? '99+' : cartCount}</span>}
          </Link>
          <AccountMenu />
        </div>
      </div>
      <nav className="cat-nav" aria-label={t('nav.categories')}>
        <div className="container">
          <ul>
            <li><Link to="/search" className={loc.pathname === '/search' && !activeCat ? 'active' : ''}>{t('nav.allProducts')}</Link></li>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link to={`/search?category=${c.slug}`} className={activeCat === c.slug ? 'active' : ''}>{category(c.slug, c.name)}</Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      <HemBorder />
    </header>
  );
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="site-footer">
      <div className="inner">
        <div>
          <b style={{ fontFamily: 'var(--serif-hy)', fontSize: '1.2rem', color: '#fff' }} lang="hy">Շուկա</b>
          <div>{t('footer.made')}</div>
        </div>
        <div className="stack" style={{ textAlign: 'right' }}>
          <div className="row" style={{ justifyContent: 'flex-end' }}><Icon name="cash" size={18} /> {t('footer.cod')}</div>
          <a className="small" href="https://github.com/Mashaakishmiryan/shuka-/blob/main/server/seed-images/CREDITS.md" target="_blank" rel="noreferrer">
            {t('footer.credits')}
          </a>
        </div>
      </div>
    </footer>
  );
}

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((x) => (
        <div key={x.id} className={`toast ${x.kind === 'error' ? 'error' : ''}`}>
          <Icon name={x.kind === 'error' ? 'alert' : 'check'} size={18} /> {x.text}
        </div>
      ))}
    </div>
  );
}

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export function StoreLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  );
}

export { NavLink };
