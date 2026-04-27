import { Loader2 } from "lucide-react";

export function FullPageLoader({ label }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {label && <p className="text-sm text-muted-foreground">{label}</p>}
      </div>
    </div>
  );
}

export function InlineLoader({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        {label && <p className="text-xs text-muted-foreground">{label}</p>}
      </div>
    </div>
  );
}
