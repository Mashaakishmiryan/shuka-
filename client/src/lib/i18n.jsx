import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { messages } from './messages.js';

const extra = {
  en: {
    'err.stockLeft': 'Only {n} of “{title}” left.',
    'err.soldOutTitle': '“{title}” is sold out.',
    'err.unavailable': '“{title}” is no longer available.',
    'err.priceChangedTitle': 'The price of “{title}” changed from {old} to {new}.',
    'err.ownProduct': 'You cannot buy your own product.',
    'err.upload': 'This file was not accepted: {msg}',
  },
  hy: {
    'err.stockLeft': '«{title}» ապրանքից մնացել է ընդամենը {n}։',
    'err.soldOutTitle': '«{title}» ապրանքը սպառված է։',
    'err.unavailable': '«{title}» ապրանքն այլևս հասանելի չէ։',
    'err.priceChangedTitle': '«{title}» ապրանքի գինը փոխվել է՝ {old} → {new}։',
    'err.ownProduct': 'Չեք կարող գնել ձեր սեփական ապրանքը։',
    'err.upload': 'Ֆայլը չընդունվեց՝ {msg}',
  },
};

const LANGS = ['hy', 'en'];
const I18nContext = createContext(null);

function initialLang() {
  try {
    const saved = localStorage.getItem('shuka.lang');
    if (LANGS.includes(saved)) return saved;
  } catch { /* storage unavailable */ }
  return (navigator.language || '').toLowerCase().startsWith('hy') ? 'hy' : 'en';
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);

  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem('shuka.lang', l); } catch { /* ignore */ }
  }, []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const value = useMemo(() => {
    const dict = { ...messages[lang], ...extra[lang] };
    const fallback = { ...messages.en, ...extra.en };
    const t = (key, vars) => {
      let s = dict[key] ?? fallback[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
      return s;
    };
    const locale = lang === 'hy' ? 'hy-AM' : 'en-GB';
    const amd = (n) => {
      const num = Math.round(Number(n) || 0);
      const s = lang === 'hy'
        ? num.toLocaleString('en-US').replace(/,/g, ' ')
        : num.toLocaleString('en-US');
      return `${s} ֏`;
    };
    const date = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
      try { return new Intl.DateTimeFormat(locale, opts).format(new Date(iso)); } catch { return iso.slice(0, 10); }
    };
    const dateTime = (iso) => date(iso, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const category = (slug, fallbackName) => dict[`cat.${slug}`] ?? fallbackName ?? slug;
    const region = (key) => t(`region.${key}`);
    const status = (s) => t(`status.${s}`);

    /** Turn an ApiError into one translated sentence. */
    const errorText = (err) => {
      if (!err) return '';
      if (err.network) return t('err.network');
      const e = err.data || {};
      switch (err.code) {
        case 'NOT_ENOUGH_STOCK':
          if (e.title || e.stock !== undefined) {
            return e.stock === 0 ? t('err.soldOutTitle', { title: e.title || '' }) : t('err.stockLeft', { n: e.stock, title: e.title || '' });
          }
          break;
        case 'OUT_OF_STOCK':
          return t('err.OUT_OF_STOCK');
        case 'PRODUCT_UNAVAILABLE':
          return lang === 'en' ? err.message : t('err.generic');
        case 'PRICE_CHANGED':
          if (e.items?.length) {
            return e.items.map((i) => t('err.priceChangedTitle', { title: i.title, old: amd(i.oldPrice), new: amd(i.newPrice) })).join(' ');
          }
          break;
        case 'FORBIDDEN':
          if (/own product/.test(err.message)) return t('err.ownProduct');
          break;
        default:
          if (String(err.code).startsWith('UPLOAD_') || err.code === 'TOO_MANY_IMAGES') {
            return lang === 'en' ? err.message : t('err.upload', { msg: err.message });
          }
      }
      const key = `err.${err.code}`;
      if (dict[key]) return dict[key];
      return lang === 'en' && err.message ? err.message : t('err.generic');
    };

    const fieldError = (code) => (code ? t(`field.${code}`) : null);

    return { lang, setLang, t, amd, date, dateTime, category, region, status, errorText, fieldError, langs: LANGS };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
