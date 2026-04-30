import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthGuard } from "@/guards/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InlineLoader } from "@/components/loaders";
import { ArrowLeft, Pencil, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_app/news/preview/$id")({
  component: () => (
    <AuthGuard require={["admin", "user"]}>
      <PreviewPage />
    </AuthGuard>
  ),
});

function PreviewPage() {
  const auth = useAuth();
  const isAdmin = auth.role === "admin";
  const { id } = Route.useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["news-item", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("news").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Article not found");
      return data;
    },
  });

  if (isLoading) return <InlineLoader label="Loading preview…" />;
  if (isError || !data) {
    return (
      <div className="mx-auto max-w-2xl text-center py-16">
        <h1 className="text-2xl font-bold">Article not found</h1>
        <Button className="mt-6" asChild><Link to="/news">Back to news</Link></Button>
      </div>
    );
  }

  const keyPoints = Array.isArray(data.key_points) ? (data.key_points as unknown[]).filter((x) => typeof x === "string") as string[] : [];
  const actionPoints = Array.isArray(data.action_points) ? (data.action_points as unknown[]).filter((x) => typeof x === "string") as string[] : [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild><Link to="/news"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>
        {isAdmin && (
          <Button variant="outline" size="sm" asChild>
            <Link to="/news/editor/$id" params={{ id: data.id }}><Pencil className="mr-1 h-4 w-4" /> Edit</Link>
          </Button>
        )}
      </div>

      <article className="mt-6">
        {data.image_url && (
          <img src={data.image_url} alt="" className="aspect-video w-full rounded-xl object-cover"
            onError={(e) => (e.currentTarget.style.display = "none")} />
        )}
        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          {data.category && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium capitalize text-primary">
              {data.category}
            </span>
          )}
          {data.source && <span className="text-muted-foreground">{data.source}</span>}
          {data.created_at && <span className="text-muted-foreground">· {new Date(data.created_at).toLocaleDateString()}</span>}
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">{data.title ?? "(untitled)"}</h1>
        {data.summary && <p className="mt-3 text-lg text-muted-foreground">{data.summary}</p>}

        {data.description && (
          <div className="mt-8 whitespace-pre-wrap text-base leading-relaxed">{data.description}</div>
        )}

        {keyPoints.length > 0 && (
          <Card className="mt-8 p-5">
            <h3 className="font-semibold">Key points</h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
              {keyPoints.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </Card>
        )}

        {actionPoints.length > 0 && (
          <Card className="mt-4 p-5">
            <h3 className="font-semibold">Action points</h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
              {actionPoints.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </Card>
        )}

        {(data.city || data.district || data.state || data.country) && (
          <Card className="mt-4 p-5">
            <h3 className="font-semibold">Location</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {[data.city, data.taluka, data.district, data.state, data.country, data.pincode].filter(Boolean).join(", ")}
            </p>
          </Card>
        )}

        {data.url && (
          <div className="mt-6">
            <Button variant="outline" asChild>
              <a href={data.url} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" /> Original source
              </a>
            </Button>
          </div>
        )}
      </article>
    </div>
  );
}
