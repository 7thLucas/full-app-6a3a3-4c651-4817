/**
 * Shared auth state. A tiny module-level store fetches /api/auth/me once and
 * shares it across every useAuth() consumer (no provider wiring in root.tsx
 * required). Mutating actions update the store and notify subscribers.
 */

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  type AuthUser,
} from "~/lib/auth.client";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  loaded: boolean;
}

let state: AuthState = { user: null, loading: false, loaded: false };
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;

function setState(next: Partial<AuthState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

const SERVER_SNAPSHOT: AuthState = { user: null, loading: false, loaded: false };
function serverSnapshot(): AuthState {
  return SERVER_SNAPSHOT;
}

async function refresh(): Promise<void> {
  if (inflight) return inflight;
  setState({ loading: true });
  inflight = fetchMe()
    .then((user) => setState({ user, loading: false, loaded: true }))
    .catch(() => setState({ user: null, loading: false, loaded: true }))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useAuth() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);

  useEffect(() => {
    if (!state.loaded && !state.loading) void refresh();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const user = await apiLogin({ email, password });
    setState({ user, loaded: true });
    return user;
  }, []);

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const user = await apiRegister({ email, password, name });
      setState({ user, loaded: true });
      return user;
    },
    [],
  );

  const logout = useCallback(async () => {
    await apiLogout();
    setState({ user: null, loaded: true });
  }, []);

  return {
    user: snap.user,
    loading: snap.loading,
    loaded: snap.loaded,
    isAuthenticated: Boolean(snap.user),
    login,
    register,
    logout,
    refresh,
  };
}
