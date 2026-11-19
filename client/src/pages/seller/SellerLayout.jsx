import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useI18n } from '../../lib/i18n.jsx';
import { useStore } from '../../lib/store.jsx';
import { UserAvatar } from '../../components/Avatars.jsx';
import { Icon } from '../../components/ui.jsx';

export default function SellerLayout() {
  const { t } = useI18n();
  const { user } = useStore();
  const loc = useLocation();
  const [pending, setPending] = useState(0);
  useEffect(() => {
    const load = () => api.get('/seller/overview').then((r) => setPending(r.overview.toConfirm + r.overview.toShip)).catch(() => {});
    load();
    window.addEventListener('shuka:orders-changed', load);
    return () => window.removeEventListener('shuka:orders-changed', load);
  }, [loc.pathname]);

  return (
    <div className="dash">
      <aside className="dash-side">
        <div className="store">
          <UserAvatar user={user} size={46} />
          <div><b>{user.storeName}</b><span className="small" style={{ opacity: 0.7 }}>{user.name}</span></div>
        </div>
        <nav aria-label={t('nav.dashboard')}>
          <NavLink to="/seller" end><Icon name="chart" size={18} /> {t('dash.overview')}</NavLink>
          <NavLink to="/seller/products"><Icon name="tag" size={18} /> {t('dash.products')}</NavLink>
          <NavLink to="/seller/orders"><Icon name="truck" size={18} /> {t('dash.orders')}{pending > 0 && <span className="count">{pending}</span>}</NavLink>
          <Link to="/"><Icon name="store" size={18} /> {t('dash.storefront')}</Link>
        </nav>
      </aside>
      <div className="dash-main">
        <Outlet />
      </div>
    </div>
  );
}
