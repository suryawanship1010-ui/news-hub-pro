import { createFileRoute } from "@tanstack/react-router";
import { AuthGuard } from "@/guards/AuthGuard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InlineLoader } from "@/components/loaders";
import { Shield, User } from "lucide-react";
import { toast } from "sonner";
import type { AppRole } from "@/lib/auth-store";

export const Route = createFileRoute("/_app/users")({
  component: () => <AuthGuard require="admin"><UsersPage /></AuthGuard>,
});

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string | null;
  role: string | null;
}

function UsersPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<UserRow[]>({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email,created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      const roleByUser = new Map<string, string>();
      for (const r of rolesRes.data ?? []) {
        if (r.user_id && r.role) roleByUser.set(r.user_id, r.role);
      }
      return (profilesRes.data ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        created_at: p.created_at,
        role: roleByUser.get(p.id) ?? "user",
      }));
    },
  });

  // user_roles has UNIQUE(user_id), so we upsert a single role per user.
  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole | "user" }) => {
      const { error } = await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["users-with-roles"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold tracking-tight">Users</h1>
      <p className="mt-1 text-muted-foreground">Manage roles for members of your newsroom.</p>

      <Card className="mt-6 overflow-hidden">
        {isLoading ? <InlineLoader /> : data && data.length > 0 ? (
          <div className="divide-y divide-border">
            {data.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{u.full_name ?? u.email ?? "Unnamed"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.email}{u.created_at ? ` · Joined ${new Date(u.created_at).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(["user", "reporter", "admin"] as const).map((r) => {
                    const active = u.role === r;
                    return (
                      <Button
                        key={r}
                        variant={active ? "default" : "outline"}
                        size="sm"
                        onClick={() => !active && setRole.mutate({ userId: u.id, role: r })}
                        disabled={setRole.isPending}
                        className="capitalize"
                      >
                        {r === "admin" && <Shield className="mr-1.5 h-3.5 w-3.5" />}
                        {r}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-12 text-center text-muted-foreground">No users yet.</p>
        )}
      </Card>
    </div>
  );
}
