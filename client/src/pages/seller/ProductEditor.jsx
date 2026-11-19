import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useI18n } from '../../lib/i18n.jsx';
import { useStore } from '../../lib/store.jsx';
import { ErrorAlert, Field, Icon, Loading, fieldsOf } from '../../components/ui.jsx';

const MAX_IMAGES = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const empty = { title: '', categoryId: '', description: '', priceAmd: '', stock: '', isPublished: true };

export default function ProductEditor() {
  const { id } = useParams();
  const isNew = !id;
  const { t, category } = useI18n();
  const { categories, toast } = useStore();
  const nav = useNavigate();
  const fileRef = useRef(null);
  const [product, setProduct] = useState(null);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState(null);
  const [imgError, setImgError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fill = (p) => {
    setProduct(p);
    setForm({ title: p.title, categoryId: String(p.categoryId), description: p.description, priceAmd: String(p.priceAmd), stock: String(p.stock), isPublished: p.isPublished });
  };

  useEffect(() => {
    if (isNew) { setProduct(null); setForm(empty); setLoading(false); return; }
    setLoading(true);
    api.get(`/seller/products/${id}`).then((r) => fill(r.product)).catch(setError).finally(() => setLoading(false));
  }, [id, isNew]);

  if (loading) return <Loading />;
  if (!isNew && !product) return <ErrorAlert error={error} />;

  const fe = fieldsOf(error);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const num = (v) => (/^\d+$/.test(String(v).trim()) ? Number(v) : v);
  const images = product?.images || [];

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      title: form.title, categoryId: num(form.categoryId), description: form.description,
      priceAmd: num(form.priceAmd), stock: num(form.stock),
    };
    try {
      if (isNew) {
        const r = await api.post('/seller/products', body);
        toast(t('editor.saved'));
        nav(`/seller/products/${r.product.id}`, { replace: true });
      } else {
        const r = await api.patch(`/seller/products/${id}`, { ...body, isPublished: form.isPublished && images.length > 0 });
        fill(r.product);
        toast(t('editor.saved'));
      }
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  async function upload(fileList) {
    setImgError(null);
    const files = [...fileList];
    if (!files.length) return;
    if (images.length + files.length > MAX_IMAGES) { setImgError(t('editor.imagesHint')); return; }
    const bad = files.find((f) => !TYPES.includes(f.type) || f.size > MAX_BYTES);
    if (bad) { setImgError(`${bad.name}: ${t('editor.imagesHint')}`); return; }
    setUploading(true);
    try {
      const r = await api.upload(`/seller/products/${id}/images`, files);
      const wasEmpty = images.length === 0;
      fill(r.product);
      // The first photo makes the product publishable — publish it right away if the box is ticked.
      if (wasEmpty && form.isPublished && !r.product.isPublished) {
        const p = await api.patch(`/seller/products/${id}`, { isPublished: true });
        fill(p.product);
      }
    } catch (err) {
      setImgError(err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function removeImage(img) {
    setImgError(null);
    try {
      const r = await api.del(`/seller/products/${id}/images/${img.id}`);
      fill(r.product);
    } catch (err) {
      setImgError(err);
    }
  }

  async function makeMain(img) {
    setImgError(null);
    try {
      const order = [img.id, ...images.filter((i) => i.id !== img.id).map((i) => i.id)];
      const r = await api.patch(`/seller/products/${id}`, { imageOrder: order });
      fill(r.product);
    } catch (err) {
      setImgError(err);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 880 }}>
      <Link to="/seller/products" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}><Icon name="back" size={16} /> {t('editor.back')}</Link>
      <div className="spread">
        <h1 style={{ margin: 0 }}>{isNew ? t('editor.new') : t('editor.edit')}</h1>
        {!isNew && <Link to={`/products/${id}`} className="btn btn-sm"><Icon name="eye" size={16} /> {t('editor.viewInStore')}</Link>}
      </div>

      <form className="card card-pad" onSubmit={save} noValidate>
        <div className="form-grid">
          <Field label={t('editor.title')} error={fe.title} htmlFor="title" className="full">
            <input id="title" className="input" value={form.title} onChange={set('title')} maxLength={120} required />
          </Field>
          <Field label={t('editor.category')} error={fe.categoryId} htmlFor="category">
            <select id="category" className="select" value={form.categoryId} onChange={set('categoryId')} required>
              <option value="">{t('editor.chooseCategory')}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{category(c.slug, c.name)}</option>)}
            </select>
          </Field>
          <div className="form-grid" style={{ gap: 12 }}>
            <Field label={t('editor.price')} error={fe.priceAmd} htmlFor="price">
              <input id="price" className="input" inputMode="numeric" value={form.priceAmd} onChange={set('priceAmd')} required />
            </Field>
            <Field label={t('editor.stock')} error={fe.stock} htmlFor="stock">
              <input id="stock" className="input" inputMode="numeric" value={form.stock} onChange={set('stock')} required />
            </Field>
          </div>
          <Field label={t('editor.description')} error={fe.description} htmlFor="desc" className="full">
            <textarea id="desc" className="textarea" rows={6} value={form.description} onChange={set('description')} maxLength={5000} required />
          </Field>
          {!isNew && (
            <div className="full">
              <label className="checkbox">
                <input type="checkbox" checked={form.isPublished} onChange={set('isPublished')} />
                {t('editor.publishedLabel')}
              </label>
              {form.isPublished && images.length === 0 && <div className="small" style={{ color: 'var(--warn)', fontWeight: 600, marginTop: 4 }}>{t('editor.needImage')}</div>}
            </div>
          )}
        </div>
        {error && error.code !== 'VALIDATION' && <div style={{ marginTop: 14 }}><ErrorAlert error={error} /></div>}
        <div className="row" style={{ marginTop: 18 }}>
          <button className="btn btn-primary btn-lg" type="submit" disabled={saving}>{isNew ? t('editor.saveContinue') : t('editor.save')}</button>
        </div>
      </form>

      <section className="card card-pad">
        <h2>{t('editor.images')}</h2>
        <p className="small muted">{t('editor.imagesHint')}</p>
        {isNew ? (
          <div className="alert alert-info">{t('editor.firstSave')}</div>
        ) : (
          <>
            <div className="image-manager">
              {images.map((img, i) => (
                <div key={img.id} className={`image-slot ${i === 0 ? 'main' : ''}`}>
                  <img src={img.thumb} alt="" />
                  {i === 0 && <span className="main-tag">{t('editor.main')}</span>}
                  <div className="tools">
                    {i !== 0 ? <button type="button" onClick={() => makeMain(img)}>{t('editor.makeMain')}</button> : <span />}
                    <button type="button" onClick={() => removeImage(img)} aria-label={t('editor.delete')}>✕</button>
                  </div>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <label className="image-add">
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => upload(e.target.files)} disabled={uploading} />
                  <span>{uploading ? t('editor.uploading') : <><Icon name="plus" size={26} /><br />{t('editor.addPhotos')}</>}</span>
                </label>
              )}
            </div>
            {imgError && <div style={{ marginTop: 12 }}><ErrorAlert error={imgError} /></div>}
          </>
        )}
      </section>
    </div>
  );
}
