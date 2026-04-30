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
import { useState } from "react";

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  page: z.number().int().min(1).optional(),
});

const PAGE_SIZE = 15;

export const Route = createFileRoute("/_app/news/")({
  validateSearch: searchSchema,
  component: () => (
    <AuthGuard require={["admin", "user"]}>
      <NewsList />
    </AuthGuard>
  ),
});

function NewsList() {
  const auth = useAuth();
  const isAdmin = auth.role === "admin";
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const page = search.page ?? 1;
  const category = search.category ?? "all";
  const q = search.q ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["news", { category, q, page }],
    queryFn: async () => {
      let query = supabase
        .from("news")
        .select("id,title,description,image_url,category,source,created_at,city,country", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (category !== "all") query = query.eq("category", category);
      if (q) query = query.ilike("title", `%${q}%`);
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const categoriesQ = useQuery({
    queryKey: ["news-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("news").select("category").not("category", "is", null).limit(500);
      if (error) throw error;
      const set = new Set<string>();
      for (const r of data ?? []) if (r.category) set.add(r.category);
      return Array.from(set).sort();
    },
  });

  const delMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("news").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("News deleted");
      qc.invalidateQueries({ queryKey: ["news"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">News</h1>
          <p className="mt-1 text-muted-foreground">
            {isAdmin ? "Manage all news articles." : "Browse the latest news."}
          </p>
        </div>
        {isAdmin && (
          <Button asChild><Link to="/news/editor/new"><Plus className="mr-2 h-4 w-4" /> New article</Link></Button>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title…"
            defaultValue={q}
            onChange={(e) => navigate({ search: (p) => ({ ...p, q: e.target.value || undefined, page: 1 }) })}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={category === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => navigate({ search: (p) => ({ ...p, category: undefined, page: 1 }) })}
          >All</Button>
          {(categoriesQ.data ?? []).slice(0, 8).map((c) => (
            <Button
              key={c}
              variant={category === c ? "default" : "outline"}
              size="sm"
              onClick={() => navigate({ search: (p) => ({ ...p, category: c, page: 1 }) })}
              className="capitalize"
            >{c}</Button>
          ))}
        </div>
      </div>

      <Card className="mt-4 overflow-hidden">
        {isLoading ? <InlineLoader /> : data?.rows.length ? (
          <div className="divide-y divide-border">
            {data.rows.map((a) => (
              <div key={a.id} className="flex items-center gap-4 p-4 hover:bg-muted/40">
                <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                  {a.image_url ? (
                    <img src={a.image_url} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No image</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.title ?? "(untitled)"}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {a.category && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium capitalize text-primary">
                        {a.category}
                      </span>
                    )}
                    {a.source && <span>· {a.source}</span>}
                    {(a.city || a.country) && <span>· {[a.city, a.country].filter(Boolean).join(", ")}</span>}
                    <span>· {new Date(a.created_at!).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/news/preview/$id" params={{ id: a.id }}><Eye className="h-4 w-4" /></Link>
                  </Button>
                  {isAdmin && (
                    <>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/news/editor/$id" params={{ id: a.id }}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(a.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No news found.</p>
            {isAdmin && (
              <Button className="mt-4" asChild><Link to="/news/editor/new">Create your first article</Link></Button>
            )}
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
