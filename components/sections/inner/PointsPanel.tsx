import { BracketPanel } from "@/components/ui";
import { cn } from "@/lib/cn";

export interface PointsPanelProps {
  label?: string;
  points: readonly string[];
  className?: string;
}

/** BracketPanel holding a numbered list of short points. */
export function PointsPanel({ label, points, className }: PointsPanelProps) {
  return (
    <BracketPanel label={label} className={cn("p-6 md:p-8", className)}>
      <ol className="flex flex-col">
        {points.map((p, i) => (
          <li key={p} className="flex items-baseline gap-5 border-b border-line py-4 first:pt-0 last:border-b-0 last:pb-0">
            <span className="t-label t-num text-copper">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-[16px] text-text">{p}</span>
          </li>
        ))}
      </ol>
    </BracketPanel>
  );
}
