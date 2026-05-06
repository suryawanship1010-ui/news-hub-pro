import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthGuard } from "@/guards/AuthGuard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/StatCard";
import { Newspaper, Plus, Activity, Eye, Clock, CheckCircle2, XCircle, FileText } from "lucide-react";
import { memo } from "react";

export const Route = createFileRoute("/_app/workspace")({
  component: () => (
    <AuthGuard require={["reporter", "admin"]}>
      <WorkspacePage />
    </AuthGuard>
  ),
});

interface RecentItem { id: string; title: string | null; created_at: string | null; category: string | null; status: string | null }

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  pending: { label: "Pending", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

const RecentRow = memo(function RecentRow({ a }: { a: RecentItem }) {
  const s = STATUS_BADGE[a.status ?? "draft"] ?? STATUS_BADGE.draft;
  return (
    <div className="flex items-center justify-between p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{a.title ?? "Untitled"}</p>
          <Badge variant={s.variant} className="shrink-0">{s.label}</Badge>
        </div>
        <p className="mt-1 text-xs capitalize text-muted-foreground">{a.category ?? "general"} · {a.created_at ? new Date(a.created_at).toLocaleDateString() : ""}</p>
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

  // Combined stats by status
  const stats = useQuery({
    queryKey: ["workspace-stats-detail", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("status,created_at")
        .eq("created_by", userId!);
      if (error) throw error;
      const rows = data ?? [];
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return {
        total: rows.length,
        recent: rows.filter((r) => r.created_at && new Date(r.created_at).getTime() >= sevenDaysAgo).length,
        draft: rows.filter((r) => r.status === "draft").length,
        pending: rows.filter((r) => r.status === "pending").length,
        approved: rows.filter((r) => r.status === "approved").length,
        rejected: rows.filter((r) => r.status === "rejected").length,
      };
    },
  });

  const recent = useQuery({
    queryKey: ["workspace-recent", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news").select("id,title,created_at,category,status")
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

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Newspaper} label="My total" value={stats.data?.total ?? 0} tone="primary" loading={statsLoading} />
        <StatCard icon={Activity} label="Last 7 days" value={stats.data?.recent ?? 0} tone="success" loading={statsLoading} />
        <StatCard icon={CheckCircle2} label="Approved" value={stats.data?.approved ?? 0} tone="success" loading={statsLoading} />
        <StatCard icon={Clock} label="Pending" value={stats.data?.pending ?? 0} tone="warning" loading={statsLoading} />
        <StatCard icon={XCircle} label="Rejected" value={stats.data?.rejected ?? 0} tone="warning" loading={statsLoading} />
        <StatCard icon={FileText} label="Drafts" value={stats.data?.draft ?? 0} tone="accent" loading={statsLoading} />
      </div>

      {/* Rejected callout */}
      {(stats.data?.rejected ?? 0) > 0 && (
        <Card className="mt-6 border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium">You have {stats.data?.rejected} rejected article(s)</p>
                <p className="text-sm text-muted-foreground">Review admin remarks and resubmit.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/news" search={{ status: "rejected", scope: "mine" }}>View</Link>
            </Button>
          </div>
        </Card>
      )}

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
