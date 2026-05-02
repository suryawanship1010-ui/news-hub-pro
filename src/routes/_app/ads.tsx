import { createFileRoute } from "@tanstack/react-router";
import { AuthGuard } from "@/guards/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { InlineLoader } from "@/components/loaders";
import { Megaphone, Plus, Trash2, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/ads")({
  component: () => <AuthGuard require={["admin", "reporter"]}><AdsPage /></AuthGuard>,
});

interface AdForm {
  title: string;
  description: string;
  image_url: string;
  link_url: string;
  placement: string;
  active: boolean;
}

const EMPTY: AdForm = { title: "", description: "", image_url: "", link_url: "", placement: "feed", active: true };

function AdsPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const isAdmin = auth.roles.includes("admin");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AdForm>(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ["ads", { isAdmin, uid: auth.user?.id }],
    queryFn: async () => {
      let q = supabase.from("ads").select("*").order("created_at", { ascending: false });
      if (!isAdmin) q = q.eq("created_by", auth.user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!auth.user) throw new Error("Not signed in");
      if (!form.title.trim()) throw new Error("Title is required");
      const { error } = await supabase.from("ads").insert({
        title: form.title.trim(),
        description: form.description || null,
        image_url: form.image_url || null,
        link_url: form.link_url || null,
        placement: form.placement || "feed",
        active: form.active,
        created_by: auth.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ad created");
      qc.invalidateQueries({ queryKey: ["ads"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      setOpen(false);
      setForm(EMPTY);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Create failed"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("ads").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ads"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ad deleted");
      qc.invalidateQueries({ queryKey: ["ads"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ads</h1>
            <p className="mt-1 text-muted-foreground">Manage advertising campaigns and placements.</p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> New ad</Button>
      </div>

      <Card className="mt-6 overflow-hidden">
        {isLoading ? <InlineLoader /> : data && data.length > 0 ? (
          <div className="divide-y divide-border">
            {data.map((ad) => (
              <div key={ad.id} className="flex items-center gap-4 p-4">
                <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                  {ad.image_url ? (
                    <img src={ad.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No image</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{ad.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-accent px-2 py-0.5 font-medium capitalize text-accent-foreground">{ad.placement ?? "feed"}</span>
                    {ad.link_url && <span className="truncate">· {ad.link_url}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={ad.active} onCheckedChange={(v) => toggleActive.mutate({ id: ad.id, active: v })} />
                    <span className="text-xs text-muted-foreground">{ad.active ? "Active" : "Paused"}</span>
                  </div>
                  {(isAdmin || ad.created_by === auth.user?.id) && (
                    <Button variant="ghost" size="sm" onClick={() => remove.mutate(ad.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No ads yet.</p>
            <Button className="mt-4" onClick={() => setOpen(true)}>Create your first ad</Button>
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New ad</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="ad-title">Title</Label>
              <Input id="ad-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="ad-desc">Description</Label>
              <Textarea id="ad-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="ad-img">Image URL</Label>
              <Input id="ad-img" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="ad-link">Link URL</Label>
              <Input id="ad-link" value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://…" className="mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ad-place">Placement</Label>
                <Input id="ad-place" value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })} placeholder="feed / sidebar / banner" className="mt-1.5" />
              </div>
              <div className="flex items-end gap-2">
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <span className="text-sm pb-2">{form.active ? "Active" : "Paused"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}><X className="mr-2 h-4 w-4" /> Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
