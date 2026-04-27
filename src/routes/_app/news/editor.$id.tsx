import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthGuard } from "@/guards/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { InlineLoader } from "@/components/loaders";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ArrowLeft, Save, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/news/editor/$id")({
  component: () => (
    <AuthGuard require={["admin", "reporter"]}>
      <Editor />
    </AuthGuard>
  ),
});

export function Editor({ forceNew = false }: { forceNew?: boolean } = {}) {
  return <EditorInner forceNew={forceNew} />;
}

interface FormState {
  title: string;
  excerpt: string;
  category: string;
  image_url: string;
  content: string;
  status: "draft" | "published";
}

const EMPTY: FormState = { title: "", excerpt: "", category: "", image_url: "", content: "", status: "draft" };

function EditorInner({ forceNew }: { forceNew: boolean }) {
  const params = (Route as any).useParams({ shouldThrow: false }) as { id?: string } | undefined;
  const id = forceNew ? "new" : (params?.id ?? "new");
  const isNew = forceNew || id === "new";
  const auth = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loaded, setLoaded] = useState(isNew);

  const articleQ = useQuery({
    queryKey: ["article", id],
    enabled: !isNew,
    queryFn: async () => {
      const { data, error } = await supabase.from("articles").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Article not found");
      return data;
    },
  });

  useEffect(() => {
    if (articleQ.data && !loaded) {
      setForm({
        title: articleQ.data.title ?? "",
        excerpt: articleQ.data.excerpt ?? "",
        category: articleQ.data.category ?? "",
        image_url: articleQ.data.image_url ?? "",
        content: articleQ.data.content ?? "",
        status: articleQ.data.status,
      });
      setLoaded(true);
    }
  }, [articleQ.data, loaded]);

  const save = useMutation({
    mutationFn: async (publish?: boolean) => {
      if (!auth.user) throw new Error("Not signed in");
      if (!form.title.trim()) throw new Error("Title is required");

      const status = publish ? "published" : form.status;
      const published_at = publish && status === "published" ? new Date().toISOString() : undefined;

      const payload = {
        title: form.title.trim(),
        excerpt: form.excerpt || null,
        category: form.category || null,
        image_url: form.image_url || null,
        content: form.content || null,
        status,
        ...(published_at !== undefined ? { published_at } : {}),
      };

      if (isNew) {
        const { data, error } = await supabase.from("articles")
          .insert({ ...payload, author_id: auth.user.id })
          .select("id").single();
        if (error) throw error;
        return data.id;
      } else {
        const { error } = await supabase.from("articles").update(payload).eq("id", id);
        if (error) throw error;
        return id;
      }
    },
    onSuccess: (newId, publish) => {
      toast.success(publish ? "Published" : "Saved");
      qc.invalidateQueries({ queryKey: ["articles"] });
      qc.invalidateQueries({ queryKey: ["article", newId] });
      qc.invalidateQueries({ queryKey: ["workspace-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      if (isNew) navigate({ to: "/news/editor/$id", params: { id: newId } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  if (!isNew && articleQ.isLoading) return <InlineLoader label="Loading article…" />;
  if (!isNew && articleQ.isError) {
    return (
      <div className="mx-auto max-w-2xl text-center py-16">
        <h1 className="text-2xl font-bold">Article not found</h1>
        <p className="mt-2 text-muted-foreground">It may have been deleted, or you don't have access.</p>
        <Button className="mt-6" asChild><Link to="/news">Back to news</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link to="/news"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>
        <h1 className="text-2xl font-bold">{isNew ? "New article" : "Edit article"}</h1>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Your headline" className="mt-1.5 text-lg" />
          </div>
          <div>
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea id="excerpt" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              placeholder="One-line summary" className="mt-1.5" rows={2} />
          </div>
          <div>
            <Label>Content</Label>
            <div className="mt-1.5">
              <RichTextEditor value={form.content} onChange={(html) => setForm((f) => ({ ...f, content: html }))} />
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="p-4">
            <h3 className="font-semibold">Publish</h3>
            <div className="mt-3 space-y-3">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "draft" | "published" })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => save.mutate(undefined)} disabled={save.isPending}>
                {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
              {form.status !== "published" && (
                <Button variant="secondary" className="w-full" onClick={() => save.mutate(true)} disabled={save.isPending}>
                  Publish now
                </Button>
              )}
              {!isNew && (
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/news/preview/$id" params={{ id }}><Eye className="mr-2 h-4 w-4" /> Preview</Link>
                </Button>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold">Metadata</h3>
            <div className="mt-3 space-y-3">
              <div>
                <Label htmlFor="category">Category</Label>
                <Input id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Politics" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="image">Cover image URL</Label>
                <Input id="image" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" className="mt-1.5" />
                {form.image_url && (
                  <div className="mt-2 overflow-hidden rounded-md border border-border">
                    <img src={form.image_url} alt="" className="h-36 w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
