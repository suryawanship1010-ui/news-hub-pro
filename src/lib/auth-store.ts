// Lightweight auth store with sessionStorage role cache.
// Subscribers re-render on auth/role changes.
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "reporter";
const ROLE_CACHE_KEY = "nms:roles";

export interface AuthState {
  status: "loading" | "authed" | "anon";
  user: User | null;
  session: Session | null;
  roles: AppRole[];
}

type Listener = (s: AuthState) => void;

let state: AuthState = {
  status: "loading",
  user: null,
  session: null,
  roles: readCachedRoles(),
};
const listeners = new Set<Listener>();

function readCachedRoles(): AppRole[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(ROLE_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((r): r is AppRole => r === "admin" || r === "reporter") : [];
  } catch {
    return [];
  }
}

function writeCachedRoles(roles: AppRole[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ROLE_CACHE_KEY, JSON.stringify(roles));
  } catch {}
}

function clearCachedRoles() {
  if (typeof window === "undefined") return;
  try { sessionStorage.removeItem(ROLE_CACHE_KEY); } catch {}
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

async function fetchRoles(): Promise<AppRole[]> {
  const { data, error } = await supabase.rpc("get_my_roles");
  if (error) {
    console.error("fetch roles error", error);
    return [];
  }
  const arr = (data ?? []) as string[];
  return arr.filter((r): r is AppRole => r === "admin" || r === "reporter");
}

async function refreshRoles() {
  const roles = await fetchRoles();
  writeCachedRoles(roles);
  setState({ roles });
}

let initPromise: Promise<void> | null = null;

export function initAuth() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    // Listener FIRST (sync-only inside callback per Supabase docs)
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setState({ status: "authed", user: session.user, session });
        // Revalidate roles in background
        refreshRoles();
      } else {
        clearCachedRoles();
        setState({ status: "anon", user: null, session: null, roles: [] });
      }
    });

    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      setState({ status: "authed", user: data.session.user, session: data.session });
      await refreshRoles();
    } else {
      setState({ status: "anon", user: null, session: null, roles: [] });
    }
  })();
  return initPromise;
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, password: string, fullName?: string) {
  const name = fullName ?? email.split("@")[0];
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      // include both keys so the auth trigger picks the right one regardless of project
      data: { full_name: name, display_name: name },
    },
  });
  if (error) throw error;
}

export async function signOut() {
  clearCachedRoles();
  await supabase.auth.signOut();
}

export function hasRole(role: AppRole) {
  return state.roles.includes(role);
}
export function isAdmin() { return hasRole("admin"); }
export function isReporter() { return hasRole("reporter"); }
