import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-shimmer rounded-md bg-muted", className)} />;
}

/** A stack of row-shaped skeletons with an sr-only loading label. */
export function SkeletonRows({ rows = 3, label, className }: { rows?: number; label: string; className?: string }) {
  return (
    <div role="status" className={cn("space-y-2", className)}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}
