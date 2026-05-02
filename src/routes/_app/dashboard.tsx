import { createFileRoute } from "@tanstack/react-router";
import { AuthGuard } from "@/guards/AuthGuard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { InlineLoader } from "@/components/loaders";
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
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const [{ count: total }, { count: recent }, { count: ads }, { count: users }] = await Promise.all([
        supabase.from("news").select("*", { count: "exact", head: true }),
        supabase.from("news").select("*", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("ads").select("*", { count: "exact", head: true }).eq("active", true),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
      ]);
      return { total: total ?? 0, recent: recent ?? 0, ads: ads ?? 0, users: users ?? 0 };
    },
  });

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Overview of your newsroom.</p>

      {stats.isLoading ? (
        <InlineLoader />
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Newspaper} label="Total articles" value={stats.data?.total ?? 0} tone="primary" />
          <StatCard icon={Activity} label="Last 7 days" value={stats.data?.recent ?? 0} tone="success" />
          <StatCard icon={Megaphone} label="Active ads" value={stats.data?.ads ?? 0} tone="warning" />
          <StatCard icon={Users} label="Users" value={stats.data?.users ?? 0} tone="accent" />
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number;
  tone: "primary" | "success" | "warning" | "accent";
}) {
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning",
    accent: "bg-accent text-accent-foreground",
  } as const;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
        <div className={`rounded-lg p-2.5 ${toneMap[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
