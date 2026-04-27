import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_app/")({
  component: () => {
    const auth = useAuth();
    const target = auth.roles.includes("admin") ? "/dashboard" : "/workspace";
    return <Navigate to={target} />;
  },
});
