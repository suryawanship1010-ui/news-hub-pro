// /news/editor/new handler — shares editor component via $id=new
import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/news/editor/new")({
  component: () => <Navigate to="/news/editor/$id" params={{ id: "new" }} replace />,
});
