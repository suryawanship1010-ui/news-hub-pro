import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthGuard } from "@/guards/AuthGuard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InlineLoader } from "@/components/loaders";
import { Newspaper, Plus, FileText, CheckCircle2, Eye } from "lucide-react";

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
    queryFn: async () => {
      const [{ count: total }, { count: published }, { count: drafts }] = await Promise.all([
        supabase.from("articles").select("*", { count: "exact", head: true }).eq("author_id", userId!),
        supabase.from("articles").select("*", { count: "exact", head: true }).eq("author_id", userId!).eq("status", "published"),
        supabase.from("articles").select("*", { count: "exact", head: true }).eq("author_id", userId!).eq("status", "draft"),
      ]);
      return { total: total ?? 0, published: published ?? 0, drafts: drafts ?? 0 };
    },
  });

  const recent = useQuery({
    queryKey: ["workspace-recent", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles").select("id,title,status,updated_at")
        .eq("author_id", userId!).order("updated_at", { ascending: false }).limit(5);
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
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <div className="flex items-center gap-3"><Newspaper className="h-5 w-5 text-primary" /><p className="text-sm text-muted-foreground">Total</p></div>
            <p className="mt-2 text-3xl font-bold">{stats.data?.total ?? 0}</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-success" /><p className="text-sm text-muted-foreground">Published</p></div>
            <p className="mt-2 text-3xl font-bold">{stats.data?.published ?? 0}</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3"><FileText className="h-5 w-5 text-warning" /><p className="text-sm text-muted-foreground">Drafts</p></div>
            <p className="mt-2 text-3xl font-bold">{stats.data?.drafts ?? 0}</p>
          </Card>
        </div>
      )}

      <h2 className="mt-10 text-xl font-semibold">Recent</h2>
      <Card className="mt-3 divide-y divide-border">
        {recent.isLoading ? <InlineLoader /> : recent.data?.length ? recent.data.map((a) => (
          <div key={a.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{a.title}</p>
              <p className="text-xs capitalize text-muted-foreground">{a.status} · {new Date(a.updated_at).toLocaleDateString()}</p>
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
