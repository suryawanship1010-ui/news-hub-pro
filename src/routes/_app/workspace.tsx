import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthGuard } from "@/guards/AuthGuard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InlineLoader } from "@/components/loaders";
import { Newspaper, Plus, Activity, Eye } from "lucide-react";

export const Route = createFileRoute("/_app/workspace")({
  component: () => (
    <AuthGuard require={["reporter", "admin"]}>
      <WorkspacePage />
    </AuthGuard>
  ),
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
      return data;
    },
  });

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

      {stats.isLoading ? <InlineLoader /> : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center gap-3"><Newspaper className="h-5 w-5 text-primary" /><p className="text-sm text-muted-foreground">My total</p></div>
            <p className="mt-2 text-3xl font-bold">{stats.data?.total ?? 0}</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3"><Activity className="h-5 w-5 text-success" /><p className="text-sm text-muted-foreground">Last 7 days</p></div>
            <p className="mt-2 text-3xl font-bold">{stats.data?.recent ?? 0}</p>
          </Card>
        </div>
      )}

      <h2 className="mt-10 text-xl font-semibold">Recent</h2>
      <Card className="mt-3 divide-y divide-border">
        {recent.isLoading ? <InlineLoader /> : recent.data?.length ? recent.data.map((a) => (
          <div key={a.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{a.title ?? "Untitled"}</p>
              <p className="text-xs capitalize text-muted-foreground">{a.category ?? "general"} · {a.created_at ? new Date(a.created_at).toLocaleDateString() : ""}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" asChild><Link to="/news/preview/$id" params={{ id: a.id }}><Eye className="h-4 w-4" /></Link></Button>
              <Button variant="outline" size="sm" asChild><Link to="/news/editor/$id" params={{ id: a.id }}>Edit</Link></Button>
            </div>
          </div>
        )) : <p className="p-6 text-sm text-muted-foreground">No articles yet. Click "New article" to get started.</p>}
      </Card>
    </div>
  );
}
