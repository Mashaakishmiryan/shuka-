import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, qs } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';
import { useLoad, useStore } from '../lib/store.jsx';
import { Empty, ErrorAlert, Icon, Loading, Pagination, ProductCard } from '../components/ui.jsx';

const SORTS = ['newest', 'price_asc', 'price_desc', 'rating'];

/** Search and category results. Every filter lives in the URL, so a search can be shared. */
export default function Search() {
  const { t, category } = useI18n();
  const { categories } = useStore();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [showFilters, setShowFilters] = useState(false);

  const current = {
    q: params.get('q') || '',
    category: params.get('category') || '',
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
    sort: SORTS.includes(params.get('sort')) ? params.get('sort') : 'newest',
    page: params.get('page') || '',
  };
  const key = qs(current);
  const res = useLoad(() => api.get(`/products${key}`), [key]);

  const [minPrice, setMin] = useState(current.minPrice);
  const [maxPrice, setMax] = useState(current.maxPrice);
  useEffect(() => { setMin(current.minPrice); setMax(current.maxPrice); }, [current.minPrice, current.maxPrice]);

  /** URL with some params changed; any filter change goes back to page 1. */
  const href = (changes) => {
    const next = { ...current, page: '', ...changes };
    if (next.sort === 'newest') next.sort = '';
    return `/search${qs(next)}`;
  };

  const catName = current.category ? category(current.category, res.data?.category?.name) : null;
  const heading = current.q ? t('search.resultsFor', { q: current.q }) : catName || t('search.all');
  const hasFilters = current.q || current.category || current.minPrice || current.maxPrice;
  const total = res.data?.total;

  return (
    <main className="page">
      <div className="container">
        <div className="breadcrumbs">
          <Link to="/">Շուկա</Link> / <Link to="/search">{t('nav.allProducts')}</Link>
          {catName && <> / <span>{catName}</span></>}
        </div>
        <h1>{heading}</h1>

        <div className="search-layout">
          <aside className={`filters card card-pad ${showFilters ? 'open' : ''}`} aria-label={t('search.filters')}>
            <h3>{t('search.category')}</h3>
            <ul className="filter-cats">
              <li><Link to={href({ category: '' })} className={!current.category ? 'selected' : ''}>{t('search.allCategories')}</Link></li>
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link to={href({ category: c.slug })} className={current.category === c.slug ? 'selected' : ''}>
                    <span>{category(c.slug, c.name)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <h3>{t('search.price')}</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const clean = (v) => (/^\d+$/.test(v.trim()) ? v.trim() : '');
                nav(href({ minPrice: clean(minPrice), maxPrice: clean(maxPrice) }));
                setShowFilters(false);
              }}
            >
              <div className="price-range">
                <input className="input" inputMode="numeric" placeholder={t('search.from')} aria-label={t('search.from')} value={minPrice} onChange={(e) => setMin(e.target.value)} />
                <span className="muted">–</span>
                <input className="input" inputMode="numeric" placeholder={t('search.to')} aria-label={t('search.to')} value={maxPrice} onChange={(e) => setMax(e.target.value)} />
              </div>
              <button className="btn btn-block" style={{ marginTop: 10 }} type="submit">{t('search.apply')}</button>
            </form>
            {hasFilters && <Link to="/search" className="btn btn-ghost btn-block" style={{ marginTop: 8 }}>{t('search.clear')}</Link>}
          </aside>

          <section>
            <div className="results-bar">
              <div className="row">
                <button type="button" className="btn btn-sm filters-toggle" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
                  <Icon name="filter" size={16} /> {t('search.filters')}
                </button>
                {total !== undefined && <b>{total === 1 ? t('search.count1') : t('search.count', { n: total })}</b>}
              </div>
              <label className="row small" style={{ gap: 8 }}>
                <span className="muted">{t('search.sort')}</span>
                <select className="select" value={current.sort} onChange={(e) => nav(href({ sort: e.target.value }))}>
                  {SORTS.map((s) => <option key={s} value={s}>{t(`sort.${s}`)}</option>)}
                </select>
              </label>
            </div>

            {res.loading && !res.data && <Loading />}
            <ErrorAlert error={res.error} />
            {res.data && res.data.items.length === 0 && (
              <Empty
                title={t('search.empty')}
                hint={t('search.emptyHint')}
                action={<Link to="/search" className="btn btn-primary">{t('search.backToAll')}</Link>}
              />
            )}
            {res.data && res.data.items.length > 0 && (
              <div className="product-grid" style={{ opacity: res.loading ? 0.6 : 1 }}>
                {res.data.items.map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
            )}
            {res.data && <Pagination page={res.data.page} pages={res.data.pages} makeHref={(n) => `/search${qs({ ...current, sort: current.sort === 'newest' ? '' : current.sort, page: n > 1 ? n : '' })}`} />}
          </section>
        </div>
      </div>
    </main>
  );
}
