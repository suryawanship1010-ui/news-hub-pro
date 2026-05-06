import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/lib/auth-store";
import { FullPageLoader } from "@/components/loaders";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const auth = useAuth();
  if (auth.status === "loading") return <FullPageLoader />;
  if (auth.status === "anon") return <Navigate to="/login" />;

  const isAdmin = auth.roles.includes("admin");
  const isReporter = auth.roles.includes("reporter");

  if (!isAdmin && !isReporter) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold">No panel access</h1>
          <p className="mt-2 text-muted-foreground">
            This account doesn't have admin or reporter permissions. Please use the mobile app, or contact an administrator.
          </p>
          <Button className="mt-6" onClick={() => signOut()}>Sign out</Button>
        </div>
      </div>
    );
  }

  return <Navigate to={isAdmin ? "/dashboard" : "/workspace"} />;
}
