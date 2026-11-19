import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useI18n } from '../lib/i18n.jsx';
import { useStore } from '../lib/store.jsx';
import { AvatarPicker, UserAvatar } from '../components/Avatars.jsx';
import { ErrorAlert, Field, fieldsOf } from '../components/ui.jsx';

export default function Account() {
  const { t, date } = useI18n();
  const { user, setUser, toast } = useStore();
  const [form, setForm] = useState({ name: user.name, phone: user.phone, avatar: user.avatar });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const fe = fieldsOf(error);

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 620 }}>
        <div className="card card-pad">
          <div className="row" style={{ gap: 18, marginBottom: 20 }}>
            <UserAvatar user={{ ...user, avatar: form.avatar }} size={96} />
            <div>
              <h1 style={{ marginBottom: 2 }}>{user.name}</h1>
              <div className="muted">{user.email}</div>
              <div className="small muted">
                {user.isSeller ? <>{user.storeName} · </> : null}
                {t('profile.memberSince', { date: date(user.createdAt, { month: 'long', year: 'numeric' }) })}
              </div>
            </div>
          </div>
          <form
            className="stack" noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              try {
                const r = await api.patch('/me', { name: form.name, phone: form.phone, ...(form.avatar ? { avatar: form.avatar } : {}) });
                setUser(r.user);
                toast(t('profile.saved'));
              } catch (err) {
                setError(err);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div>
              <div className="label" style={{ marginBottom: 4 }}>{t('avatar.title')}</div>
              <p className="small muted" style={{ margin: '0 0 8px' }}>{t('avatar.hint')}</p>
              <AvatarPicker value={form.avatar} onChange={(avatar) => setForm({ ...form, avatar })}
                labels={{ title: t('avatar.title'), anahit: t('avatar.anahit'), aram: t('avatar.aram') }} />
            </div>
            <Field label={t('auth.name')} error={fe.name} htmlFor="name">
              <input id="name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label={t('auth.phone')} error={fe.phone} hint={t('auth.phoneHint')} htmlFor="phone">
              <input id="phone" className="input" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            {error && error.code !== 'VALIDATION' && <ErrorAlert error={error} />}
            <div className="row">
              <button className="btn btn-brand" type="submit" disabled={busy}>{t('profile.save')}</button>
              <Link to="/orders" className="btn btn-ghost">{t('nav.myOrders')}</Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
