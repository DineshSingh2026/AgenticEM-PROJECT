import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";

export function SimLabel({ className }: { className?: string }) {
  return (
    <span className={cn("t-label inline-flex items-center gap-2 text-[10px] text-text-faint", className)}>
      <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-data-green/60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-data-green" />
      </span>
      {copy.site.simulatedNetwork}
    </span>
  );
}
