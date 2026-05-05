import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "@tanstack/react-router";
import { FullPageLoader } from "@/components/loaders";
import type { AppRole } from "@/lib/auth-store";

interface Props {
  children: React.ReactNode;
  require?: AppRole | AppRole[];
}

export function AuthGuard({ children, require }: Props) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "loading") return <FullPageLoader label="Loading your workspace…" />;
  if (auth.status === "anon") {
    return <Navigate to="/login" search={{ redirect: location.href }} />;
  }

  if (require) {
    const required = Array.isArray(require) ? require : [require];
    if (auth.roles.length === 0) return <FullPageLoader label="Checking permissions…" />;
    const hasAny = required.some((r) => auth.roles.includes(r));
    if (!hasAny) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="max-w-md text-center">
            <h1 className="text-3xl font-bold">Access denied</h1>
            <p className="mt-2 text-muted-foreground">You don't have permission to view this page.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
