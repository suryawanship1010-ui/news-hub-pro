import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthGuard } from "@/guards/AuthGuard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/StatCard";
import { Newspaper, Plus, Activity, Eye } from "lucide-react";
import { memo } from "react";

export const Route = createFileRoute("/_app/workspace")({
  component: () => (
    <AuthGuard require={["reporter", "admin"]}>
      <WorkspacePage />
    </AuthGuard>
  ),
});

interface RecentItem { id: string; title: string | null; created_at: string | null; category: string | null }

const RecentRow = memo(function RecentRow({ a }: { a: RecentItem }) {
  return (
    <div className="flex items-center justify-between p-4">
      <div>
        <p className="font-medium">{a.title ?? "Untitled"}</p>
        <p className="text-xs capitalize text-muted-foreground">{a.category ?? "general"} · {a.created_at ? new Date(a.created_at).toLocaleDateString() : ""}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" asChild><Link to="/news/preview/$id" params={{ id: a.id }}><Eye className="h-4 w-4" /></Link></Button>
        <Button variant="outline" size="sm" asChild><Link to="/news/editor/$id" params={{ id: a.id }}>Edit</Link></Button>
      </div>
    </div>
  );
});

function WorkspacePage() {
  const auth = useAuth();
  const userId = auth.user?.id;

  const stats = useQuery({
    queryKey: ["workspace-stats", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_workspace_stats");
      if (error) throw error;
      const d = (data ?? {}) as { total?: number; recent?: number };
      return { total: d.total ?? 0, recent: d.recent ?? 0 };
    },
  });

  const recent = useQuery({
    queryKey: ["workspace-recent", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news").select("id,title,created_at,category")
        .eq("created_by", userId!).order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data as RecentItem[];
    },
  });

  const statsLoading = stats.isLoading;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Workspace</h1>
          <p className="mt-1 text-muted-foreground">Your articles at a glance.</p>
        </div>
        <Button asChild>
          <Link to="/news/editor/new"><Plus className="mr-2 h-4 w-4" /> New article</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <StatCard icon={Newspaper} label="My total" value={stats.data?.total ?? 0} tone="primary" loading={statsLoading} />
        <StatCard icon={Activity} label="Last 7 days" value={stats.data?.recent ?? 0} tone="success" loading={statsLoading} />
      </div>

      <h2 className="mt-10 text-xl font-semibold">Recent</h2>
      <Card className="mt-3 divide-y divide-border">
        {recent.isLoading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          ))
        ) : recent.data?.length ? (
          recent.data.map((a) => <RecentRow key={a.id} a={a} />)
        ) : (
          <p className="p-6 text-sm text-muted-foreground">No articles yet. Click "New article" to get started.</p>
        )}
      </Card>
    </div>
  );
}
