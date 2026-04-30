import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Newspaper, Bookmark, Users, Settings, LogOut, Menu, X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const ADMIN_NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/saved", label: "Saved", icon: Bookmark },
  { to: "/users", label: "Users", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
];

const USER_NAV: NavItem[] = [
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/saved", label: "My Saved", icon: Bookmark },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = auth.role === "admin";
  const items = isAdmin ? ADMIN_NAV : USER_NAV;
  const displayName =
    (auth.user?.user_metadata?.full_name as string | undefined) ??
    auth.user?.email ??
    "User";

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform md:static md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Newspaper className="h-4 w-4" />
            </div>
            NewsAdmin
          </Link>
          <button className="md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {items.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-sidebar-border p-3">
          <div className="mb-2 flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="text-xs capitalize text-muted-foreground">{auth.role ?? "user"}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className="flex flex-1 flex-col md:pl-0">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
          <button className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <span className="hidden rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium capitalize text-secondary-foreground sm:inline">
            {auth.role ?? "user"}
          </span>
        </header>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
