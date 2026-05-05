import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Tone = "primary" | "success" | "warning" | "accent";

const toneMap: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  accent: "bg-accent text-accent-foreground",
};

export const StatCard = memo(function StatCard({
  icon: Icon, label, value, tone, loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: Tone;
  loading?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-9 w-20" />
          ) : (
            <p className="mt-2 text-3xl font-bold">{value}</p>
          )}
        </div>
        <div className={`rounded-lg p-2.5 ${toneMap[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
});
