import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';

/*
 * App-wide state: the signed-in user, the cart, categories, and toasts.
 * Pages call refreshCart() after changing the cart so the header count updates.
 */
const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still loading, null = signed out
  const [cart, setCart] = useState(null);
  const [categories, setCategories] = useState([]);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  const toast = useCallback((text, kind = 'ok') => {
    const id = ++toastId.current;
    setToasts((ts) => [...ts, { id, text, kind }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3800);
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      const r = await api.get('/cart');
      setCart(r.cart);
      return r.cart;
    } catch {
      setCart(null);
      return null;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const r = await api.get('/me');
      setUser(r.user);
      return r.user;
    } catch (e) {
      if (e.status === 401) setUser(null);
      else setUser((u) => (u === undefined ? null : u));
      return null;
    }
  }, []);

  useEffect(() => {
    refreshUser();
    api.get('/categories').then((r) => setCategories(r.categories)).catch(() => {});
  }, [refreshUser]);

  useEffect(() => {
    if (user) refreshCart();
    else setCart(null);
  }, [user, refreshCart]);

  const login = useCallback(async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    setUser(r.user);
    return r.user;
  }, []);

  const register = useCallback(async (data) => {
    const r = await api.post('/auth/register', data);
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {});
    setUser(null);
    setCart(null);
  }, []);

  const value = useMemo(
    () => ({
      user, setUser, refreshUser, login, register, logout,
      cart, setCart, refreshCart, cartCount: cart?.itemCount || 0,
      categories, toast, toasts,
    }),
    [user, refreshUser, login, register, logout, cart, refreshCart, categories, toast, toasts],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);

/** Small data-loading hook: { data, error, loading, reload, setData }. */
export function useLoad(fn, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn();
      setState({ data, error: null, loading: false });
    } catch (error) {
      setState({ data: null, error, loading: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data })) };
}
