import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';
import { useStore } from '../lib/store.jsx';
import { Empty, Loading, ProductCard } from '../components/ui.jsx';

/** Favourites are kept in this browser (an optional extension; no extra table needed). */
export default function Favorites() {
  const { t } = useI18n();
  const { favorites } = useStore();
  const [items, setItems] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all(
      favorites.map((id) => api.get(`/products/${id}`).then((r) => r.product).catch(() => null)),
    ).then((list) => {
      if (!alive) return;
      setItems(list.filter(Boolean).map((p) => ({
        id: p.id, title: p.title, priceAmd: p.priceAmd, stock: p.stock, ratingAvg: p.ratingAvg,
        ratingCount: p.ratingCount, image: p.images[0] || null, storeName: p.seller.storeName,
      })));
    });
    return () => { alive = false; };
  }, [favorites]);

  return (
    <main className="page">
      <div className="container">
        <h1>{t('fav.title')}</h1>
        {items === null && <Loading />}
        {items && items.length === 0 && (
          <Empty title={t('fav.empty')} hint={t('fav.emptyHint')} action={<Link to="/search" className="btn btn-primary">{t('home.shop')}</Link>} />
        )}
        {items && items.length > 0 && (
          <div className="product-grid">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        )}
      </div>
    </main>
  );
}
