import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthGuard } from "@/guards/AuthGuard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { InlineLoader } from "@/components/loaders";
import { ArrowLeft, Pencil } from "lucide-react";

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
    queryKey: ["article", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*, profiles:author_id(display_name,avatar_url)")
        .eq("id", id).maybeSingle();
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

  // profiles may not be returned if RLS blocks; safe access
  const author = (data as unknown as { profiles?: { display_name?: string | null } }).profiles;

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
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${data.status === "published" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
            {data.status}
          </span>
          {data.category && <span className="text-muted-foreground">{data.category}</span>}
          <span className="text-muted-foreground">· {new Date(data.updated_at).toLocaleDateString()}</span>
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">{data.title}</h1>
        {data.excerpt && <p className="mt-3 text-lg text-muted-foreground">{data.excerpt}</p>}
        {author?.display_name && (
          <p className="mt-4 text-sm text-muted-foreground">By {author.display_name}</p>
        )}
        <div
          className="tiptap mt-8"
          dangerouslySetInnerHTML={{ __html: data.content ?? "<p class='text-muted-foreground'>No content yet.</p>" }}
        />
      </article>
    </div>
  );
}
