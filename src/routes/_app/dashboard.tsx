import { createFileRoute } from "@tanstack/react-router";
import { AuthGuard } from "@/guards/AuthGuard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { Newspaper, Users, Megaphone, Activity } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  component: () => (
    <AuthGuard require="admin">
      <DashboardPage />
    </AuthGuard>
  ),
});

function DashboardPage() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_stats");
      if (error) throw error;
      const d = (data ?? {}) as { total?: number; recent?: number; ads?: number; users?: number };
      return { total: d.total ?? 0, recent: d.recent ?? 0, ads: d.ads ?? 0, users: d.users ?? 0 };
    },
  });

  const loading = stats.isLoading;

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Overview of your newsroom.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Newspaper} label="Total articles" value={stats.data?.total ?? 0} tone="primary" loading={loading} />
        <StatCard icon={Activity} label="Last 7 days" value={stats.data?.recent ?? 0} tone="success" loading={loading} />
        <StatCard icon={Megaphone} label="Active ads" value={stats.data?.ads ?? 0} tone="warning" loading={loading} />
        <StatCard icon={Users} label="Users" value={stats.data?.users ?? 0} tone="accent" loading={loading} />
      </div>
    </div>
  );
}
