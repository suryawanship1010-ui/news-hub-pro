import { useSyncExternalStore } from "react";
import { getAuthState, subscribeAuth } from "@/lib/auth-store";

export function useAuth() {
  return useSyncExternalStore(
    (cb) => subscribeAuth(cb),
    () => getAuthState(),
    () => getAuthState(),
  );
}
