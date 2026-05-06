import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthGuard } from "@/guards/AuthGuard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InlineLoader } from "@/components/loaders";
import { ArrowLeft, Pencil, ExternalLink, MessageSquare } from "lucide-react";

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  pending: { label: "Pending Review", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export const Route = createFileRoute("/_app/news/preview/$id")({
  component: () => (
    <AuthGuard require={["admin", "reporter"]}>
      <PreviewPage />
    </AuthGuard>
  ),
});

function PreviewPage() {
  const { id } = Route.useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["news", id],
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

  const location = [data.city, data.district, data.state, data.country].filter(Boolean).join(", ");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild><Link to="/news"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/news/editor/$id" params={{ id: data.id }}><Pencil className="mr-1 h-4 w-4" /> Edit</Link>
        </Button>
      </div>

      <article className="mt-6">
        {data.image_url && (
          <img src={data.image_url} alt="" className="aspect-video w-full rounded-xl object-cover" />
        )}
        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          {data.category && <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-primary">{data.category}</span>}
          {data.source && <span className="text-muted-foreground">{data.source}</span>}
          {data.created_at && <span className="text-muted-foreground">· {new Date(data.created_at).toLocaleDateString()}</span>}
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">{data.title ?? "Untitled"}</h1>
        {data.description && <p className="mt-3 text-lg text-muted-foreground">{data.description}</p>}
        {location && <p className="mt-2 text-sm text-muted-foreground">📍 {location}{data.pincode ? ` · ${data.pincode}` : ""}</p>}
        {data.url && (
          <a href={data.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
            Source link <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}

        {data.summary && (
          <div className="tiptap mt-8" dangerouslySetInnerHTML={{ __html: data.summary }} />
        )}

        {Array.isArray(data.key_points) && data.key_points.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold">Key points</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {(data.key_points as unknown[]).map((p, i) => <li key={i}>{String(p)}</li>)}
            </ul>
          </section>
        )}

        {Array.isArray(data.action_points) && data.action_points.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xl font-semibold">Action points</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {(data.action_points as unknown[]).map((p, i) => <li key={i}>{String(p)}</li>)}
            </ul>
          </section>
        )}
      </article>
    </div>
  );
}
