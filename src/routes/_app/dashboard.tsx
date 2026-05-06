import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthGuard } from "@/guards/AuthGuard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, Users, Megaphone, Activity, Clock, ArrowRight } from "lucide-react";

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
      const d = (data ?? {}) as { total?: number; recent?: number; ads?: number; users?: number; pending?: number };
      return { total: d.total ?? 0, recent: d.recent ?? 0, ads: d.ads ?? 0, users: d.users ?? 0, pending: d.pending ?? 0 };
    },
  });

  const pending = useQuery({
    queryKey: ["news-list", "pending-preview"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id,title,created_at,created_by,category")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const loading = stats.isLoading;

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Overview of your newsroom.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Newspaper} label="Total articles" value={stats.data?.total ?? 0} tone="primary" loading={loading} />
        <StatCard icon={Clock} label="Pending review" value={stats.data?.pending ?? 0} tone="warning" loading={loading} />
        <StatCard icon={Activity} label="Last 7 days" value={stats.data?.recent ?? 0} tone="success" loading={loading} />
        <StatCard icon={Megaphone} label="Active ads" value={stats.data?.ads ?? 0} tone="warning" loading={loading} />
        <StatCard icon={Users} label="Users" value={stats.data?.users ?? 0} tone="accent" loading={loading} />
      </div>

      {/* Pending approvals section */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Pending Approvals
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/news" search={{ status: "pending" }}>
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <Card className="mt-3 divide-y divide-border">
          {pending.isLoading ? (
            [0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))
          ) : pending.data?.length ? (
            pending.data.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{a.title ?? "Untitled"}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">Pending</Badge>
                    {a.category && <span className="capitalize">· {a.category}</span>}
                    {a.created_at && <span>· {new Date(a.created_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <Button size="sm" asChild>
                  <Link to="/news/editor/$id" params={{ id: a.id }}>Review</Link>
                </Button>
              </div>
            ))
          ) : (
            <p className="p-6 text-sm text-muted-foreground">No articles pending review. 🎉</p>
          )}
        </Card>
      </div>
    </div>
  );
}
