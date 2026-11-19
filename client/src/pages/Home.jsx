import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';
import { useLoad, useStore } from '../lib/store.jsx';
import { Anahit, Aram } from '../components/Avatars.jsx';
import { CategoryIcon } from '../components/CategoryIcon.jsx';
import { ErrorAlert, Loading, ProductCard } from '../components/ui.jsx';

export default function Home() {
  const { t, category } = useI18n();
  const { categories, user } = useStore();
  const newest = useLoad(() => api.get('/products?sort=newest'), []);

  return (
    <main className="page">
      <div className="container">
        <section className="hero">
          <div>
            <h1>
              {t('home.title1')}<em>{t('home.taraz')}</em>{t('home.title2')}
            </h1>
            <p className="muted" style={{ fontSize: '1.05rem', maxWidth: 560 }}>{t('home.lead')}</p>
            <div className="row" style={{ marginTop: 18 }}>
              <Link to="/search" className="btn btn-primary btn-lg">{t('home.shop')}</Link>
              <Link to={user?.isSeller ? '/seller' : '/sell'} className="btn btn-lg">{user?.isSeller ? t('nav.dashboard') : t('home.sell')}</Link>
            </div>
          </div>
          <div className="portraits" aria-hidden="true">
            <div>
              <div className="portrait"><Anahit framed={false} size="100%" /></div>
              <div className="portrait-caption">{t('home.buyer')}</div>
              <div className="small muted">{t('home.buyerNote')}</div>
            </div>
            <div>
              <div className="portrait"><Aram framed={false} size="100%" /></div>
              <div className="portrait-caption">{t('home.seller')}</div>
              <div className="small muted">{t('home.sellerNote')}</div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head"><h2>{t('home.categories')}</h2></div>
          <div className="cat-grid">
            {categories.map((c) => (
              <Link key={c.slug} to={`/search?category=${c.slug}`} className="cat-tile">
                <span className="ico"><CategoryIcon slug={c.slug} /></span>
                <span>{category(c.slug, c.name)}</span>
                <small>{t('home.productsCount', { n: c.productCount })}</small>
              </Link>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>{t('home.newest')}</h2>
            <Link to="/search?sort=newest">{t('home.seeAll')} →</Link>
          </div>
          {newest.loading && <Loading />}
          <ErrorAlert error={newest.error} />
          {newest.data && (
            <div className="product-grid">
              {newest.data.items.slice(0, 12).map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
