import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../lib/i18n.jsx';
import { useStore } from '../lib/store.jsx';
import { SteppedDiamond } from '../components/Motifs.jsx';
import { ErrorAlert, Field, fieldsOf } from '../components/ui.jsx';

/** Only allow redirects to paths on this site. */
const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/');

function AuthShell({ title, lead, children, footer }) {
  return (
    <main className="page">
      <div className="container auth-wrap">
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <SteppedDiamond size={48} />
            <h1 style={{ marginTop: 10, marginBottom: 4 }}>{title}</h1>
            <p className="muted" style={{ margin: 0 }}>{lead}</p>
          </div>
          {children}
        </div>
        <p style={{ textAlign: 'center', marginTop: 16 }}>{footer}</p>
      </div>
    </main>
  );
}

export function Login() {
  const { t } = useI18n();
  const { login, user } = useStore();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const next = safeNext(params.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;
  const fe = fieldsOf(error);

  return (
    <AuthShell
      title={t('auth.loginTitle')} lead={t('auth.loginLead')}
      footer={<>{t('auth.noAccount')} <Link to={`/register?next=${encodeURIComponent(next)}`}>{t('auth.register')}</Link></>}
    >
      <form
        className="stack" noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await login(email, password);
            nav(next, { replace: true });
          } catch (err) {
            setError(err);
            setBusy(false);
          }
        }}
      >
        <Field label={t('auth.email')} error={fe.email} htmlFor="email">
          <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label={t('auth.password')} error={fe.password} htmlFor="password">
          <input id="password" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && error.code !== 'VALIDATION' && <ErrorAlert error={error} />}
        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>{t('auth.login')}</button>
        <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>{t('auth.demo')}</p>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const { t } = useI18n();
  const { register, user } = useStore();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;
  const fe = fieldsOf(error);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <AuthShell
      title={t('auth.registerTitle')} lead={t('auth.registerLead')}
      footer={<>{t('auth.haveAccount')} <Link to={`/login?next=${encodeURIComponent(next)}`}>{t('auth.login')}</Link></>}
    >
      <form
        className="stack" noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await register(form);
            nav(next, { replace: true });
          } catch (err) {
            setError(err);
            setBusy(false);
          }
        }}
      >
        <Field label={t('auth.name')} error={fe.name} htmlFor="name">
          <input id="name" className="input" autoComplete="name" value={form.name} onChange={set('name')} required />
        </Field>
        <Field label={t('auth.email')} error={fe.email} htmlFor="email">
          <input id="email" className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
        </Field>
        <Field label={t('auth.phone')} error={fe.phone} hint={t('auth.phoneHint')} htmlFor="phone">
          <input id="phone" className="input" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} required />
        </Field>
        <Field label={t('auth.password')} error={fe.password} hint={t('auth.passwordHint')} htmlFor="password">
          <input id="password" className="input" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required minLength={8} />
        </Field>
        {error && error.code !== 'VALIDATION' && <ErrorAlert error={error} />}
        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>{t('auth.register')}</button>
      </form>
    </AuthShell>
  );
}
