import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthGuard } from "@/guards/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineLoader } from "@/components/loaders";
import { Plus, Eye, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEffect, useState } from "react";

const searchSchema = z.object({
  q: z.string().optional(),
  scope: z.enum(["all", "mine"]).optional(),
  page: z.number().int().min(1).optional(),
});

const PAGE_SIZE = 15;

export const Route = createFileRoute("/_app/news/")({
  validateSearch: searchSchema,
  component: () => (
    <AuthGuard require={["admin", "reporter"]}>
      <NewsList />
    </AuthGuard>
  ),
});

function NewsList() {
  const auth = useAuth();
  const isAdmin = auth.roles.includes("admin");
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const page = search.page ?? 1;
  const scope = search.scope ?? (isAdmin ? "all" : "mine");
  const q = search.q ?? "";
  const [qInput, setQInput] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => {
      if (qInput !== q) navigate({ search: (p) => ({ ...p, q: qInput || undefined, page: 1 }) });
    }, 300);
    return () => clearTimeout(t);
  }, [qInput]);

  const { data, isLoading } = useQuery({
    queryKey: ["news-list", { isAdmin, uid: auth.user?.id, scope, q, page }],
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      let query = supabase
        .from("news")
        .select("id,title,description,created_by,created_at,image_url,category,city,state", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (!isAdmin || scope === "mine") query = query.eq("created_by", auth.user!.id);
      if (q) query = query.ilike("title", `%${q}%`);
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const delMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("news").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Article deleted");
      qc.invalidateQueries({ queryKey: ["news-list"] });
      qc.invalidateQueries({ queryKey: ["workspace-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">News</h1>
          <p className="mt-1 text-muted-foreground">
            {isAdmin ? (scope === "mine" ? "Articles you created." : "All articles across the newsroom.") : "Your articles."}
          </p>
        </div>
        <Button asChild><Link to="/news/editor/new"><Plus className="mr-2 h-4 w-4" /> New article</Link></Button>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title…"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            className="pl-9"
          />
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            {(["all", "mine"] as const).map((s) => (
              <Button
                key={s}
                variant={scope === s ? "default" : "outline"}
                size="sm"
                onClick={() => navigate({ search: (p) => ({ ...p, scope: s, page: 1 }) })}
                className="capitalize"
              >{s === "all" ? "All articles" : "My articles"}</Button>
            ))}
          </div>
        )}
      </div>

      <Card className="mt-4 overflow-hidden">
        {isLoading ? <InlineLoader /> : data?.rows.length ? (
          <div className="divide-y divide-border">
            {data.rows.map((a) => (
              <div key={a.id} className="flex items-center gap-4 p-4 hover:bg-muted/40">
                <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                  {a.image_url ? (
                    <img src={a.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No image</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.title ?? "Untitled"}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {a.category && <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium capitalize text-primary">{a.category}</span>}
                    {(a.city || a.state) && <span>· {[a.city, a.state].filter(Boolean).join(", ")}</span>}
                    {a.created_at && <span>· {new Date(a.created_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/news/preview/$id" params={{ id: a.id }}><Eye className="h-4 w-4" /></Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/news/editor/$id" params={{ id: a.id }}><Pencil className="h-4 w-4" /></Link>
                  </Button>
                  {(isAdmin || a.created_by === auth.user?.id) && (
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(a.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No articles found.</p>
            <Button className="mt-4" asChild><Link to="/news/editor/new">Create your first article</Link></Button>
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-muted-foreground">Page {page} of {totalPages} · {total} total</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1}
              onClick={() => navigate({ search: (p) => ({ ...p, page: page - 1 }) })}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages}
              onClick={() => navigate({ search: (p) => ({ ...p, page: page + 1 }) })}>Next</Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this article?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) delMutation.mutate(deleteId); setDeleteId(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
