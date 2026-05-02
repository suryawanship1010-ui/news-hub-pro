import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthGuard } from "@/guards/AuthGuard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InlineLoader } from "@/components/loaders";
import { Rss } from "lucide-react";

export const Route = createFileRoute("/_app/feed")({
  component: () => <AuthGuard require={["admin", "reporter"]}><FeedPage /></AuthGuard>,
});

function FeedPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["feed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id,title,description,image_url,category,created_at,city,state")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center gap-3">
        <Rss className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Feed</h1>
      </div>
      <p className="mt-1 text-muted-foreground">Latest stories across the newsroom.</p>

      {isLoading ? <InlineLoader /> : data && data.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {data.map((a) => (
            <Card key={a.id} className="overflow-hidden transition-shadow hover:shadow-md">
              {a.image_url && <img src={a.image_url} alt="" className="aspect-video w-full object-cover" />}
              <div className="p-5">
                {a.category && <p className="text-xs font-medium uppercase tracking-wide text-primary">{a.category}</p>}
                <h2 className="mt-1 font-semibold leading-tight">{a.title ?? "Untitled"}</h2>
                {a.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{a.description}</p>}
                {(a.city || a.state) && (
                  <p className="mt-2 text-xs text-muted-foreground">📍 {[a.city, a.state].filter(Boolean).join(", ")}</p>
                )}
                <Button variant="link" size="sm" className="mt-2 h-auto p-0" asChild>
                  <Link to="/news/preview/$id" params={{ id: a.id }}>Read →</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mt-6 p-12 text-center">
          <p className="text-muted-foreground">No articles yet.</p>
        </Card>
      )}
    </div>
  );
}
