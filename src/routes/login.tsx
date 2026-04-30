import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { signIn, signUp } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Newspaper, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FullPageLoader } from "@/components/loaders";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  component: LoginPage,
});

function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { mode } = Route.useSearch();
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  if (auth.status === "loading") return <FullPageLoader />;
  if (auth.status === "authed") return <Navigate to="/" />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        await signUp(email, password, fullName || undefined);
        toast.success("Account created. You can sign in now.");
        navigate({ to: "/login", search: {} });
      } else {
        await signIn(email, password);
        toast.success("Welcome back!");
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/30 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Newspaper className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">NewsAdmin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignup ? "Create your account" : "Sign in to your workspace"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {isSignup && (
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" className="mt-1.5" />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" />
            </div>
            <Button type="submit" disabled={loading} className="mt-2">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {isSignup ? (
              <>Already have an account?{" "}
                <Link to="/login" search={{}} className="font-medium text-primary hover:underline">Sign in</Link>
              </>
            ) : (
              <>New here?{" "}
                <Link to="/login" search={{ mode: "signup" }} className="font-medium text-primary hover:underline">Create an account</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
