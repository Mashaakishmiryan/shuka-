import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';
import { useLoad, useStore } from '../lib/store.jsx';
import { Anahit, Aram } from '../components/Avatars.jsx';
import { CategoryIcon } from '../components/CategoryIcon.jsx';
import { ErrorAlert, Icon, Loading, ProductCard } from '../components/ui.jsx';

/* ───── hero slider ───── */
function HeroSlider({ categories, user }) {
  const { t } = useI18n();
  const imageOf = (slug) => categories.find((c) => c.slug === slug)?.image?.large;
  const slides = [
    { key: 'welcome', to: '/search', bg: '#fde7e6', art: 'portraits' },
    { key: 'food', to: '/search?category=food', bg: '#fff0dc', img: imageOf('food') },
    { key: 'handmade', to: '/search?category=handmade', bg: '#fde7e6', img: imageOf('handmade') },
    { key: 'tech', to: '/search?category=electronics', bg: '#eeeeee', img: imageOf('electronics') },
    { key: 'sell', to: user?.isSeller ? '/seller' : '/sell', bg: '#fff0dc', art: 'aram' },
  ];
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef(null);
  const go = useCallback((n) => setI((n + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(() => setI((x) => (x + 1) % slides.length), 6000);
    return () => clearInterval(id);
  }, [paused, slides.length]);

  const s = slides[i];
  return (
    <section
      className="slider" aria-roledescription="carousel" aria-label="Shuka"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; setPaused(true); }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touch.current ?? 0);
        if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
        setPaused(false);
      }}
    >
      <div className="slide" key={s.key} style={{ '--slide-bg': s.bg }}>
        <div>
          <span className="eyebrow">{t(`slide.${s.key}.eyebrow`)}</span>
          <h1>{t(`slide.${s.key}.title`)}</h1>
          <p>{t(`slide.${s.key}.text`)}</p>
          <Link to={s.to} className="btn btn-primary btn-lg" style={{ marginTop: 6 }}>
            {s.key === 'sell' ? (user?.isSeller ? t('nav.dashboard') : t('home.sell')) : t('slide.cta')} <Icon name="arrowRight" size={18} />
          </Link>
        </div>
        <div className="art" aria-hidden="true">
          <span className="blob" />
          {s.art === 'portraits' && (
            <div className="portraits"><Anahit size={150} /><Aram size={150} /></div>
          )}
          {s.art === 'aram' && <div className="portraits"><Aram size={190} /></div>}
          {s.img && <img src={s.img} alt="" />}
        </div>
      </div>
      <button type="button" className="arrow prev" onClick={() => go(i - 1)} aria-label={t('slide.prev')}><Icon name="arrowLeft" size={18} /></button>
      <button type="button" className="arrow next" onClick={() => go(i + 1)} aria-label={t('slide.next')}><Icon name="arrowRight" size={18} /></button>
      <div className="dots">
        {slides.map((x, n) => (
          <button key={x.key} type="button" aria-label={`${n + 1}`} aria-current={n === i} onClick={() => go(n)} />
        ))}
      </div>
    </section>
  );
}

/* ───── round categories with scroll arrows ───── */
function CategoryCircles({ categories }) {
  const { t, category } = useI18n();
  const ref = useRef(null);
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <section className="section cat-row">
      <button type="button" className="row-arrow prev" onClick={() => scroll(-1)} aria-label={t('page.prev')}><Icon name="arrowLeft" size={18} /></button>
      <div className="cat-circles" ref={ref}>
        {categories.map((c) => (
          <Link key={c.slug} to={`/search?category=${c.slug}`} className="cat-circle">
            <span className="ring">
              {c.image ? <img src={c.image.thumb} alt="" loading="lazy" /> : <span className="ico"><CategoryIcon slug={c.slug} /></span>}
            </span>
            <span>{category(c.slug, c.name)}</span>
            <small>{t('home.productsCount', { n: c.productCount })}</small>
          </Link>
        ))}
      </div>
      <button type="button" className="row-arrow next" onClick={() => scroll(1)} aria-label={t('page.next')}><Icon name="arrowRight" size={18} /></button>
    </section>
  );
}

function Row({ title, link, linkText, items, strip = false }) {
  if (!items?.length) return null;
  return (
    <>
      <div className="section-head">
        <h2>{title}</h2>
        {link && <Link to={link}>{linkText}</Link>}
      </div>
      <div className={strip ? 'product-strip' : 'product-grid'}>
        {items.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </>
  );
}

export default function Home() {
  const { t } = useI18n();
  const { categories, user } = useStore();
  const newest = useLoad(() => api.get('/products?sort=newest'), []);
  const top = useLoad(() => api.get('/products?sort=rating'), []);
  const again = useLoad(() => (user ? api.get('/orders/again') : Promise.resolve({ items: [] })), [user?.id]);

  return (
    <main className="page" style={{ paddingTop: 0 }}>
      <div className="container">
        <HeroSlider categories={categories} user={user} />
        <CategoryCircles categories={categories} />
      </div>

      {again.data?.items.length > 0 && (
        <section className="band tint">
          <div className="container">
            <Row title={t('home.orderAgain')} link="/orders" linkText={`${t('home.allHistory')} →`} items={again.data.items} strip />
          </div>
        </section>
      )}

      <section className="band">
        <div className="container">
          {newest.loading && <Loading />}
          <ErrorAlert error={newest.error} />
          <Row title={t('home.new')} link="/search?sort=newest" linkText={`${t('home.allProducts')} →`} items={newest.data?.items.slice(0, 8)} />
        </div>
      </section>

      <section className="band tint">
        <div className="container">
          <Row title={t('home.popular')} link="/search?sort=rating" linkText={`${t('home.allProducts')} →`} items={top.data?.items.slice(0, 12)} strip />
        </div>
      </section>
    </main>
  );
}
