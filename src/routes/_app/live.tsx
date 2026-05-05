import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthGuard } from "@/guards/AuthGuard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { InlineLoader } from "@/components/loaders";
import { Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/live")({
  component: () => <AuthGuard require={["admin", "reporter"]}><LivePage /></AuthGuard>,
});

function LivePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["live-news"],
    refetchInterval: 30_000,
    staleTime: 15_000,
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from("news")
        .select("id,title,description,created_at,category,city,state")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
          </span>
          <Radio className="h-6 w-6 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Live News</h1>
      </div>
      <p className="mt-1 text-muted-foreground">Stories created in the last 24 hours. Auto-refreshing.</p>

      {isLoading ? <InlineLoader /> : data && data.length > 0 ? (
        <div className="mt-6 space-y-3">
          {data.map((a) => (
            <Card key={a.id} className="p-5 transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium uppercase tracking-wide text-destructive">LIVE</span>
                    {a.category && <span>{a.category}</span>}
                    {(a.city || a.state) && <span>· {[a.city, a.state].filter(Boolean).join(", ")}</span>}
                    {a.created_at && <span>· {new Date(a.created_at).toLocaleTimeString()}</span>}
                  </div>
                  <h2 className="mt-1 font-semibold">{a.title ?? "Untitled"}</h2>
                  {a.description && <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{a.description}</p>}
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/news/preview/$id" params={{ id: a.id }}>Open</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mt-6 p-12 text-center">
          <p className="text-muted-foreground">No new stories in the last 24 hours.</p>
        </Card>
      )}
    </div>
  );
}
