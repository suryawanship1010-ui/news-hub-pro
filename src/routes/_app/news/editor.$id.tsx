import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { AuthGuard } from "@/guards/AuthGuard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InlineLoader } from "@/components/loaders";
import { ArrowLeft, Save, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/news/editor/$id")({
  component: () => (
    <AuthGuard require="admin">
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
  summary: string;
  category: string;
  source: string;
  url: string;
  image_url: string;
  country: string;
  state: string;
  district: string;
  taluka: string;
  city: string;
  pincode: string;
  key_points: string; // newline-separated
  action_points: string; // newline-separated
}

const EMPTY: FormState = {
  title: "", description: "", summary: "", category: "general", source: "",
  url: "", image_url: "", country: "", state: "", district: "", taluka: "",
  city: "", pincode: "", key_points: "", action_points: "",
};

function parseList(s: string): string[] | null {
  const arr = s.split("\n").map((x) => x.trim()).filter(Boolean);
  return arr.length ? arr : null;
}

function stringifyList(v: unknown): string {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string").join("\n");
  return "";
}

function EditorInner({ forceNew }: { forceNew: boolean }) {
  const params = useParams({ strict: false }) as { id?: string };
  const id = forceNew ? "new" : (params?.id ?? "new");
  const isNew = forceNew || id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loaded, setLoaded] = useState(isNew);

  const articleQ = useQuery({
    queryKey: ["news-item", id],
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
        summary: d.summary ?? "",
        category: d.category ?? "general",
        source: d.source ?? "",
        url: d.url ?? "",
        image_url: d.image_url ?? "",
        country: d.country ?? "",
        state: d.state ?? "",
        district: d.district ?? "",
        taluka: d.taluka ?? "",
        city: d.city ?? "",
        pincode: d.pincode ?? "",
        key_points: stringifyList(d.key_points),
        action_points: stringifyList(d.action_points),
      });
      setLoaded(true);
    }
  }, [articleQ.data, loaded]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title is required");

      const payload = {
        title: form.title.trim(),
        description: form.description || null,
        summary: form.summary || null,
        category: form.category || "general",
        source: form.source || null,
        url: form.url || null,
        image_url: form.image_url || null,
        country: form.country || null,
        state: form.state || null,
        district: form.district || null,
        taluka: form.taluka || null,
        city: form.city || null,
        pincode: form.pincode || null,
        key_points: parseList(form.key_points),
        action_points: parseList(form.action_points),
      };

      if (isNew) {
        const { data, error } = await supabase.from("news").insert(payload).select("id").single();
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
      qc.invalidateQueries({ queryKey: ["news"] });
      qc.invalidateQueries({ queryKey: ["news-item", newId] });
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
        <p className="mt-2 text-muted-foreground">It may have been deleted.</p>
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
          <Card className="p-5 space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Headline" className="mt-1.5 text-lg" />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Full article description / body" className="mt-1.5" rows={8} />
            </div>
            <div>
              <Label htmlFor="summary">Summary</Label>
              <Textarea id="summary" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })}
                placeholder="Short AI/editorial summary" className="mt-1.5" rows={3} />
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="font-semibold">Insights</h3>
            <div>
              <Label htmlFor="key_points">Key points (one per line)</Label>
              <Textarea id="key_points" value={form.key_points} onChange={(e) => setForm({ ...form, key_points: e.target.value })}
                placeholder={"First key point\nSecond key point"} className="mt-1.5 font-mono text-sm" rows={5} />
            </div>
            <div>
              <Label htmlFor="action_points">Action points (one per line)</Label>
              <Textarea id="action_points" value={form.action_points} onChange={(e) => setForm({ ...form, action_points: e.target.value })}
                placeholder={"What readers should do"} className="mt-1.5 font-mono text-sm" rows={5} />
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="font-semibold">Location</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="country">Country</Label><Input id="country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="mt-1.5" /></div>
              <div><Label htmlFor="state">State</Label><Input id="state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="mt-1.5" /></div>
              <div><Label htmlFor="district">District</Label><Input id="district" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className="mt-1.5" /></div>
              <div><Label htmlFor="taluka">Taluka</Label><Input id="taluka" value={form.taluka} onChange={(e) => setForm({ ...form, taluka: e.target.value })} className="mt-1.5" /></div>
              <div><Label htmlFor="city">City</Label><Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1.5" /></div>
              <div><Label htmlFor="pincode">Pincode</Label><Input id="pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} maxLength={10} className="mt-1.5" /></div>
            </div>
          </Card>
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

          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Metadata</h3>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="general" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="source">Source</Label>
              <Input id="source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. Reuters" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="url">Source URL (unique)</Label>
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
          </Card>
        </aside>
      </div>
    </div>
  );
}
