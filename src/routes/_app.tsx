import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthGuard } from "@/guards/AuthGuard";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_app")({
  component: () => (
    <AuthGuard>
      <AppShell />
    </AuthGuard>
  ),
});
