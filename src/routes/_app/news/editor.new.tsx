import { createFileRoute } from "@tanstack/react-router";
import { AuthGuard } from "@/guards/AuthGuard";
import { Editor } from "./editor.$id";

export const Route = createFileRoute("/_app/news/editor/new")({
  component: () => (
    <AuthGuard require="admin">
      <Editor forceNew />
    </AuthGuard>
  ),
});
