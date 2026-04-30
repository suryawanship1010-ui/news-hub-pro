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
  email: string | null;
  full_name: string | null;
  city: string | null;
  country: string | null;
  created_at: string | null;
  role: AppRole | null;
}

function UsersPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<UserRow[]>({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id,email,full_name,city,country,created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      const roleByUser = new Map<string, AppRole>();
      for (const r of rolesRes.data ?? []) {
        if (r.role === "admin" || r.role === "user") roleByUser.set(r.user_id, r.role);
      }
      return (profilesRes.data ?? []).map((p) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        city: p.city,
        country: p.country,
        created_at: p.created_at,
        role: roleByUser.get(p.id) ?? null,
      }));
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
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
      <p className="mt-1 text-muted-foreground">Manage roles for app users.</p>

      <Card className="mt-6 overflow-hidden">
        {isLoading ? <InlineLoader /> : data && data.length > 0 ? (
          <div className="divide-y divide-border">
            {data.map((u) => {
              const isAdmin = u.role === "admin";
              const isUser = u.role === "user";
              return (
                <div key={u.id} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{u.full_name ?? u.email ?? "Unnamed"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.email}
                      {(u.city || u.country) && ` · ${[u.city, u.country].filter(Boolean).join(", ")}`}
                      {u.created_at && ` · Joined ${new Date(u.created_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant={isAdmin ? "default" : "outline"} size="sm"
                      onClick={() => setRole.mutate({ userId: u.id, role: "admin" })}
                      disabled={setRole.isPending || isAdmin}
                    >
                      <Shield className="mr-1.5 h-3.5 w-3.5" /> Admin
                    </Button>
                    <Button
                      variant={isUser ? "default" : "outline"} size="sm"
                      onClick={() => setRole.mutate({ userId: u.id, role: "user" })}
                      disabled={setRole.isPending || isUser}
                    >
                      User
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="p-12 text-center text-muted-foreground">No users yet.</p>
        )}
      </Card>
    </div>
  );
}
