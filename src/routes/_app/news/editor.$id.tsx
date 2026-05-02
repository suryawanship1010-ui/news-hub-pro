import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
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
  description: string;
  category: string;
  image_url: string;
  url: string;
  source: string;
  summary: string;
  country: string;
  state: string;
  district: string;
  city: string;
  pincode: string;
}

const EMPTY: FormState = {
  title: "", description: "", category: "general", image_url: "", url: "",
  source: "", summary: "", country: "", state: "", district: "", city: "", pincode: "",
};

function EditorInner({ forceNew }: { forceNew: boolean }) {
  const params = useParams({ strict: false }) as { id?: string };
  const id = forceNew ? "new" : (params?.id ?? "new");
  const isNew = forceNew || id === "new";
  const auth = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loaded, setLoaded] = useState(isNew);

  const articleQ = useQuery({
    queryKey: ["news", id],
    enabled: !isNew,
    queryFn: async () => {
      const { data, error } = await supabase.from("news").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Article not found");
      return data;
    },
  });

  useEffect(() => {
    if (articleQ.data && !loaded) {
      const d = articleQ.data;
      setForm({
        title: d.title ?? "",
        description: d.description ?? "",
        category: d.category ?? "general",
        image_url: d.image_url ?? "",
        url: d.url ?? "",
        source: d.source ?? "",
        summary: d.summary ?? "",
        country: d.country ?? "",
        state: d.state ?? "",
        district: d.district ?? "",
        city: d.city ?? "",
        pincode: d.pincode ?? "",
      });
      setLoaded(true);
    }
  }, [articleQ.data, loaded]);

  const save = useMutation({
    mutationFn: async () => {
      if (!auth.user) throw new Error("Not signed in");
      if (!form.title.trim()) throw new Error("Title is required");

      const payload = {
        title: form.title.trim(),
        description: form.description || null,
        category: form.category || "general",
        image_url: form.image_url || null,
        url: form.url || null,
        source: form.source || null,
        summary: form.summary || null,
        country: form.country || null,
        state: form.state || null,
        district: form.district || null,
        city: form.city || null,
        pincode: form.pincode || null,
      };

      if (isNew) {
        const { data, error } = await supabase.from("news")
          .insert({ ...payload, created_by: auth.user.id })
          .select("id").single();
        if (error) throw error;
        return data.id;
      } else {
        const { error } = await supabase.from("news").update(payload).eq("id", id);
        if (error) throw error;
        return id;
      }
    },
    onSuccess: (newId) => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["news-list"] });
      qc.invalidateQueries({ queryKey: ["news", newId] });
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
            <Label htmlFor="description">Short description</Label>
            <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="One-line summary shown in feed" className="mt-1.5" rows={2} />
          </div>
          <div>
            <Label>Full content / Summary</Label>
            <div className="mt-1.5">
              <RichTextEditor value={form.summary} onChange={(html) => setForm((f) => ({ ...f, summary: html }))} />
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="p-4">
            <h3 className="font-semibold">Publish</h3>
            <div className="mt-3 space-y-3">
              <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
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
                <Input id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="general" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="source">Source</Label>
                <Input id="source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. Reuters" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="url">External URL</Label>
                <Input id="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" className="mt-1.5" />
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

          <Card className="p-4">
            <h3 className="font-semibold">Location</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="country" className="text-xs">Country</Label>
                <Input id="country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="state" className="text-xs">State</Label>
                <Input id="state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="district" className="text-xs">District</Label>
                <Input id="district" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="city" className="text-xs">City</Label>
                <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="pincode" className="text-xs">Pincode</Label>
                <Input id="pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className="mt-1" maxLength={10} />
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
