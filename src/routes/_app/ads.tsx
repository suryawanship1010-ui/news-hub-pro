import { createFileRoute } from "@tanstack/react-router";
import { AuthGuard } from "@/guards/AuthGuard";
import { Card } from "@/components/ui/card";
import { Megaphone, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/ads")({
  component: () => <AuthGuard require={["admin", "reporter"]}><AdsPage /></AuthGuard>,
});

function AdsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center gap-3">
        <Megaphone className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Ads</h1>
      </div>
      <p className="mt-1 text-muted-foreground">Manage advertising campaigns and placements.</p>

      <Card className="mt-8 p-12 text-center">
        <Sparkles className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-4 text-xl font-semibold">Ads module coming soon</h2>
        <p className="mt-2 text-muted-foreground">This module will let you configure sponsored content, banners, and campaign analytics.</p>
      </Card>
    </div>
  );
}
