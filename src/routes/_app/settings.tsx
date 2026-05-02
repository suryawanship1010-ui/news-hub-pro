import { createFileRoute } from "@tanstack/react-router";
import { AuthGuard } from "@/guards/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineLoader } from "@/components/loaders";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  component: () => <AuthGuard require={["admin", "reporter"]}><SettingsPage /></AuthGuard>,
});

function SettingsPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const userId = auth.user?.id;

  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
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
      setFullName(profileQ.data.full_name ?? "");
      setCity(profileQ.data.city ?? "");
      setCountry(profileQ.data.country ?? "");
      setInitialized(true);
    }
  }, [profileQ.data, initialized]);

  const save = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("No user");
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        email: auth.user?.email ?? null,
        full_name: fullName || null,
        city: city || null,
        country: country || null,
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
      <p className="mt-1 text-muted-foreground">Manage your profile.</p>

      <Card className="mt-6 p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="fn">Full name</Label>
            <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1.5" />
            </div>
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
