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
  display_name: string | null;
  created_at: string;
  roles: AppRole[];
}

function UsersPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<UserRow[]>({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id,display_name,created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      const rolesByUser = new Map<string, AppRole[]>();
      for (const r of rolesRes.data ?? []) {
        const arr = rolesByUser.get(r.user_id) ?? [];
        arr.push(r.role as AppRole);
        rolesByUser.set(r.user_id, arr);
      }
      return (profilesRes.data ?? []).map((p) => ({
        id: p.id, display_name: p.display_name, created_at: p.created_at,
        roles: rolesByUser.get(p.id) ?? [],
      }));
    },
  });

  const toggleRole = useMutation({
    mutationFn: async ({ userId, role, grant }: { userId: string; role: AppRole; grant: boolean }) => {
      if (grant) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error && !error.message.includes("duplicate")) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
        if (error) throw error;
      }
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
            {data.map((u) => {
              const isAdmin = u.roles.includes("admin");
              const isReporter = u.roles.includes("reporter");
              return (
                <div key={u.id} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{u.display_name ?? "Unnamed"}</p>
                    <p className="truncate text-xs text-muted-foreground">Joined {new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant={isAdmin ? "default" : "outline"} size="sm"
                      onClick={() => toggleRole.mutate({ userId: u.id, role: "admin", grant: !isAdmin })}
                      disabled={toggleRole.isPending}
                    >
                      <Shield className="mr-1.5 h-3.5 w-3.5" /> Admin
                    </Button>
                    <Button
                      variant={isReporter ? "default" : "outline"} size="sm"
                      onClick={() => toggleRole.mutate({ userId: u.id, role: "reporter", grant: !isReporter })}
                      disabled={toggleRole.isPending}
                    >
                      Reporter
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
