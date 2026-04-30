import { createFileRoute } from "@tanstack/react-router";
import { AuthGuard } from "@/guards/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InlineLoader } from "@/components/loaders";
import { Bookmark, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/saved")({
  component: () => (
    <AuthGuard require={["admin", "user"]}>
      <SavedPage />
    </AuthGuard>
  ),
});

function SavedPage() {
  const auth = useAuth();
  const isAdmin = auth.role === "admin";
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["saved-articles", { isAdmin, uid: auth.user?.id }],
    queryFn: async () => {
      let q = supabase
        .from("saved_articles")
        .select("id,user_id,article_id,title,description,image_url,source,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!isAdmin && auth.user) q = q.eq("user_id", auth.user.id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("saved_articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["saved-articles"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center gap-3">
        <Bookmark className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">{isAdmin ? "All Saved Articles" : "My Saved Articles"}</h1>
      </div>
      <p className="mt-1 text-muted-foreground">
        {isAdmin ? "Bookmarks across all users." : "Your bookmarked stories."}
      </p>

      {isLoading ? <InlineLoader /> : data && data.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {data.map((s) => (
            <Card key={s.id} className="overflow-hidden">
              {s.image_url && (
                <img src={s.image_url} alt="" className="aspect-video w-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = "none")} />
              )}
              <div className="p-5">
                {s.source && <p className="text-xs font-medium uppercase tracking-wide text-primary">{s.source}</p>}
                <h2 className="mt-1 font-semibold leading-tight">{s.title ?? "(untitled)"}</h2>
                {s.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}
                <div className="mt-3 flex items-center justify-between">
                  {s.article_id && (
                    <Button variant="link" size="sm" className="h-auto p-0" asChild>
                      <a href={s.article_id} target="_blank" rel="noreferrer">
                        Open <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </Button>
                  )}
                  {(isAdmin || s.user_id === auth.user?.id) && (
                    <Button variant="ghost" size="sm" onClick={() => del.mutate(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mt-6 p-12 text-center">
          <p className="text-muted-foreground">No saved articles yet.</p>
        </Card>
      )}
    </div>
  );
}
