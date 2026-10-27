import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";

export interface AlertRowProps {
  rule: string;
  severity: "low" | "med" | "high";
  agentId: string;
  time: string;
  score?: number;
  className?: string;
}

const dot = { low: "bg-text-dim", med: "bg-data-gold", high: "bg-data-red" } as const;
const tone = { low: "text-text-dim", med: "text-data-gold", high: "text-data-red" } as const;

export function AlertRow({ rule, severity, agentId, time, score, className }: AlertRowProps) {
  const a = copy.site.alert;
  return (
    <div className={cn("grid grid-cols-[8px_1fr_auto] items-center gap-x-3 gap-y-1 border-b border-line py-3 last:border-b-0", className)}>
      <span
        aria-hidden="true"
        className={cn("h-2 w-2 rounded-full", dot[severity], severity === "high" && "shadow-[0_0_8px_rgb(var(--data-red-rgb)/0.7)]")}
      />
      <span className="min-w-0 truncate text-[14px] text-text">{rule}</span>
      <span className="t-num text-[12px] text-text-faint">{time}</span>
      <span className="t-label col-start-2 col-end-4 flex flex-wrap gap-x-3 text-[11px] text-text-faint">
        <span className={tone[severity]}>{a.severity[severity]}</span>
        <span>{agentId}</span>
        {typeof score === "number" ? (
          <span>
            {a.score} {score.toFixed(2)}
          </span>
        ) : null}
      </span>
    </div>
  );
}
