import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/store';
import { onUnauthorized, setToken } from '../api/client';
import { readToken, saveToken, removeToken } from '../storage/session';
const Context = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState('');
  const clear = async () => { setToken(null); setUser(null); setStartupError(''); await removeToken(); };
  const restore = async () => {
    setLoading(true); setStartupError('');
    try {
      const token = await readToken();
      setToken(token);
      if (token) setUser(await api.me());
    } catch (e) {
      if (e.status === 401) await clear();
      else setStartupError(e.message);
    } finally { setLoading(false); }
  };
  useEffect(() => { onUnauthorized(clear); restore(); return () => onUnauthorized(null); }, []);
  const authenticate = async (operation, body) => {
    const session = await operation(body);
    if (session.user.role !== 'customer') throw new Error('Ứng dụng dành cho khách hàng. Nhân viên và quản trị viên vui lòng sử dụng web.');
    await saveToken(session.token); setToken(session.token); setUser(session.user);
  };
  const logout = async () => { try { await api.logout(); } finally { await clear(); } };
  return <Context.Provider value={{ user, loading, startupError, restore, clear, login: (body) => authenticate(api.login, body), register: (body) => authenticate(api.register, body), logout, updateUser: (next) => setUser((u) => ({ ...u, ...next })) }}>{children}</Context.Provider>;
}
export const useAuth = () => useContext(Context);
