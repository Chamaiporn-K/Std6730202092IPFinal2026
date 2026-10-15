import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiCall, clearAuthSession, loadAuthToken, setAuthToken } from '../lib/api';
export type User = { user_id: number; username: string; role: string; email?: string };
type Session = { user: User | null; ready: boolean; login: (username: string, password: string) => Promise<void>; register: (username: string, password: string, confirm: string, email: string) => Promise<void>; logout: () => Promise<void> };
const Context = createContext<Session | null>(null);
export function AuthProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { (async () => {
    try { if (await loadAuthToken()) setUser((await apiCall('/auth/me')).user); }
    catch { await clearAuthSession(); setUser(null); }
    finally { setReady(true); }
  })().catch(() => setReady(true)); }, []);
  async function authenticate(endpoint: string, body: object) {
    const response = await apiCall(endpoint, {method: 'POST', body: JSON.stringify(body)});
    await setAuthToken(response.token);
    setUser(response.user);
  }
  async function logout() {
    try { await apiCall('/auth/logout', {method: 'POST'}); }
    finally { try { await clearAuthSession(); } finally { setUser(null); } }
  }
  return <Context.Provider value={{user, ready,
    login: (username, password) => authenticate('/auth/login', {username, password}),
    register: async (username, password, confirm, email) => {
      if (password !== confirm) throw new Error('Passwords do not match.');
      await authenticate('/auth/register', {username, password, email});
    }, logout}}>{children}</Context.Provider>;
}
export function useAuth() {
  const session = useContext(Context);
  if (!session) throw new Error('AuthProvider is required');
  return session;
}
