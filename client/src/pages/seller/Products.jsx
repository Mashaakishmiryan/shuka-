import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useI18n } from '../../lib/i18n.jsx';
import { useLoad, useStore } from '../../lib/store.jsx';
import { Empty, ErrorAlert, Icon, Loading } from '../../components/ui.jsx';

export default function Products() {
  const { t, amd } = useI18n();
  const { toast } = useStore();
  const nav = useNavigate();
  const res = useLoad(() => api.get('/seller/products'), []);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  async function togglePublish(p) {
    setBusy(p.id);
    setError(null);
    try {
      await api.patch(`/seller/products/${p.id}`, { isPublished: !p.isPublished });
      toast(t('editor.saved'));
      await res.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="stack">
      <div className="spread">
        <h1 style={{ margin: 0 }}>{t('dash.products')}</h1>
        <Link to="/seller/products/new" className="btn btn-primary"><Icon name="plus" size={18} /> {t('dash.addProduct')}</Link>
      </div>
      <ErrorAlert error={error} />
      {res.loading && <Loading />}
      <ErrorAlert error={res.error} />
      {res.data && res.data.products.length === 0 && (
        <div className="card"><Empty title={t('dash.noProducts')} hint={t('dash.noProductsHint')} action={<Link to="/seller/products/new" className="btn btn-primary">{t('dash.addProduct')}</Link>} /></div>
      )}
      {res.data && res.data.products.length > 0 && (
        <div className="card table-wrap">
          <table className="table responsive">
            <thead>
              <tr>
                <th />
                <th>{t('dash.col.product')}</th>
                <th className="num">{t('dash.col.price')}</th>
                <th className="num">{t('dash.col.stock')}</th>
                <th>{t('dash.col.status')}</th>
                <th className="num">{t('dash.col.sold')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {res.data.products.map((p) => (
                <tr key={p.id} className="clickable" onClick={(e) => { if (!e.target.closest('button,a')) nav(`/seller/products/${p.id}`); }}>
                  <td>{p.image ? <img src={p.image.thumb} alt="" /> : <span style={{ display: 'block', width: 46, height: 46, borderRadius: 8, background: 'var(--surface-sunk)' }} />}</td>
                  <td className="span">
                    <Link to={`/seller/products/${p.id}`} style={{ color: 'var(--text)', fontWeight: 700 }}>{p.title}</Link>
                    <div className="small muted">{amd(p.priceAmd)} · {t('dash.col.stock')}: <b style={{ color: p.stock === 0 ? 'var(--danger)' : 'inherit' }}>{p.stock}</b></div>
                  </td>
                  <td className="num" data-hide-mobile>{amd(p.priceAmd)}</td>
                  <td className="num" data-hide-mobile style={{ color: p.stock === 0 ? 'var(--danger)' : undefined, fontWeight: p.stock <= 3 ? 700 : 400 }}>{p.stock}</td>
                  <td>{p.isPublished ? <span className="pill status-delivered">{t('dash.published')}</span> : <span className="pill">{t('dash.hidden')}</span>}</td>
                  <td className="num" data-hide-mobile>{p.unitsSold}</td>
                  <td className="span">
                    <div className="row" style={{ gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                      <Link className="btn btn-sm" to={`/seller/products/${p.id}`}>{t('dash.edit')}</Link>
                      <button type="button" className="btn btn-sm btn-ghost" disabled={busy === p.id || (!p.isPublished && p.imageCount === 0)} onClick={() => togglePublish(p)}>
                        {p.isPublished ? t('dash.unpublish') : t('dash.publish')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
