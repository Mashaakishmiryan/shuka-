import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';
import { useStore } from '../lib/store.jsx';
import { UserAvatar } from '../components/Avatars.jsx';
import { ErrorAlert, Field, Icon, fieldsOf } from '../components/ui.jsx';

export default function BecomeSeller() {
  const { t } = useI18n();
  const { user, refreshUser } = useStore();
  const nav = useNavigate();
  const [form, setForm] = useState({ storeName: '', phone: user.phone || '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  if (user.isSeller) return <Navigate to="/seller" replace />;
  const fe = fieldsOf(error);

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 860 }}>
        <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', overflow: 'hidden' }}>
          <div style={{ background: 'var(--pomegranate)', color: '#fff', padding: 28 }}>
            <UserAvatar user={user} size={110} />
            <h1 style={{ marginTop: 18 }}>{t('sell.title')}</h1>
            <p style={{ color: '#f3d6d6' }}>{t('sell.lead')}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="stack">
              {['sell.point1', 'sell.point2', 'sell.point3'].map((k) => (
                <li key={k} className="row" style={{ gap: 10, flexWrap: 'nowrap' }}><span style={{ color: 'var(--apricot)' }}><Icon name="check" /></span>{t(k)}</li>
              ))}
            </ul>
          </div>
          <form
            className="card-pad stack" style={{ padding: 28 }} noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              try {
                await api.post('/seller/activate', form);
                await refreshUser();
                nav('/seller/products/new');
              } catch (err) {
                setError(err);
                setBusy(false);
              }
            }}
          >
            <Field label={t('sell.storeName')} error={fe.storeName} htmlFor="storeName">
              <input id="storeName" className="input" value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} required />
            </Field>
            <Field label={t('sell.phone')} error={fe.phone} hint={t('auth.phoneHint')} htmlFor="sphone">
              <input id="sphone" className="input" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </Field>
            {error && error.code !== 'VALIDATION' && <ErrorAlert error={error} />}
            <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>{t('sell.submit')}</button>
          </form>
        </div>
      </div>
    </main>
  );
}
