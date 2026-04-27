import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { FullPageLoader } from "@/components/loaders";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const auth = useAuth();
  if (auth.status === "loading") return <FullPageLoader />;
  if (auth.status === "anon") return <Navigate to="/login" />;
  const target = auth.roles.includes("admin") ? "/dashboard" : "/workspace";
  return <Navigate to={target} />;
}
