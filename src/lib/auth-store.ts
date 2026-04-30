// Lightweight auth store with sessionStorage role cache.
// Subscribers re-render on auth/role changes.
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "user";
const ROLE_CACHE_KEY = "nms:role";

export interface AuthState {
  status: "loading" | "authed" | "anon";
  user: User | null;
  session: Session | null;
  role: AppRole | null;
}

type Listener = (s: AuthState) => void;

let state: AuthState = {
  status: "loading",
  user: null,
  session: null,
  role: readCachedRole(),
};
const listeners = new Set<Listener>();

function readCachedRole(): AppRole | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ROLE_CACHE_KEY);
    if (raw === "admin" || raw === "user") return raw;
    return null;
  } catch {
    return null;
  }
}

function writeCachedRole(role: AppRole | null) {
  if (typeof window === "undefined") return;
  try {
    if (role) sessionStorage.setItem(ROLE_CACHE_KEY, role);
    else sessionStorage.removeItem(ROLE_CACHE_KEY);
  } catch {}
}

function setState(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
}

export function getAuthState() {
  return state;
}

export function subscribeAuth(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

async function fetchRole(userId: string): Promise<AppRole | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("fetch role error", error);
    return null;
  }
  const r = data?.role;
  if (r === "admin" || r === "user") return r;
  return null;
}

async function refreshRole(userId: string) {
  const role = await fetchRole(userId);
  writeCachedRole(role);
  setState({ role });
}

let initPromise: Promise<void> | null = null;

export function initAuth() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    // Listener FIRST (sync-only inside callback per Supabase docs)
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setState({ status: "authed", user: session.user, session });
        // Revalidate role in background
        refreshRole(session.user.id);
      } else {
        writeCachedRole(null);
        setState({ status: "anon", user: null, session: null, role: null });
      }
    });

    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      setState({ status: "authed", user: data.session.user, session: data.session });
      await refreshRole(data.session.user.id);
    } else {
      setState({ status: "anon", user: null, session: null, role: null });
    }
  })();
  return initPromise;
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, password: string, fullName?: string) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      data: { full_name: fullName ?? email.split("@")[0] },
    },
  });
  if (error) throw error;
}

export async function signOut() {
  writeCachedRole(null);
  await supabase.auth.signOut();
}

export function hasRole(role: AppRole) {
  return state.role === role;
}
export function isAdmin() { return state.role === "admin"; }
