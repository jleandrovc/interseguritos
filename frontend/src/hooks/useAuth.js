import { useCallback, useEffect, useState } from 'react';
import { requestToken } from '../api/client.js';

const STORAGE_KEY = 'interseguritos.session';

// Session storage keeps the token per tab and drops it when the tab is closed.
function readSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    return session && session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [session, setSession] = useState(readSession);

  useEffect(() => {
    if (!session) return undefined;
    const timer = setTimeout(() => setSession(null), session.expiresAt - Date.now());
    return () => clearTimeout(timer);
  }, [session]);

  useEffect(() => {
    if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(STORAGE_KEY);
  }, [session]);

  const login = useCallback(async (clientId, clientSecret) => {
    const { data } = await requestToken(clientId, clientSecret);
    setSession({
      token: data.accessToken,
      clientId,
      scope: data.scope,
      expiresAt: Date.now() + data.expiresIn * 1000,
    });
  }, []);

  const logout = useCallback(() => setSession(null), []);

  return { session, login, logout };
}
