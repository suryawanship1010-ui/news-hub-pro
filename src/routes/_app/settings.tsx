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
import { InlineLoader } from "@/components/loaders";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  component: () => <AuthGuard require="admin"><SettingsPage /></AuthGuard>,
});

function SettingsPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const userId = auth.user?.id;

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [initialized, setInitialized] = useState(false);

  const profileQ = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profileQ.data && !initialized) {
      setDisplayName(profileQ.data.display_name ?? "");
      setBio(profileQ.data.bio ?? "");
      setAvatarUrl(profileQ.data.avatar_url ?? "");
      setInitialized(true);
    }
  }, [profileQ.data, initialized]);

  const save = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("No user");
      const { error } = await supabase.from("profiles").upsert({
        id: userId, display_name: displayName || null, bio: bio || null, avatar_url: avatarUrl || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["profile", userId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  if (profileQ.isLoading) return <InlineLoader />;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-muted-foreground">Manage your admin profile.</p>

      <Card className="mt-6 p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="dn">Display name</Label>
            <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="av">Avatar URL</Label>
            <Input id="av" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="mt-1.5" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={auth.user?.email ?? ""} disabled className="mt-1.5" />
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </Card>
    </div>
  );
}
