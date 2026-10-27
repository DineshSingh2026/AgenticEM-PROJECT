import { cn } from "@/lib/cn";

export interface StepRingProps {
  steps: { index: string; title: string; body: string }[];
  active?: number;
  orientation?: "row" | "column";
  className?: string;
}

/** Ordered steps joined by a hairline track; each marker is a small ring, copper when active or passed. */
export function StepRing({ steps, active, orientation = "row", className }: StepRingProps) {
  const row = orientation === "row";
  return (
    <ol
      className={cn(
        "relative grid gap-6",
        row ? "grid-cols-1 lg:auto-cols-fr lg:grid-flow-col" : "grid-cols-1",
        className,
      )}
    >
      {steps.map((s, i) => {
        const isActive = active === i;
        const done = typeof active === "number" && i < active;
        const last = i === steps.length - 1;
        return (
          <li
            key={s.index}
            aria-current={isActive ? "step" : undefined}
            className={cn("relative flex gap-4", row && "lg:flex-col")}
          >
            <div className={cn("relative flex shrink-0 flex-col items-center", row && "lg:flex-row")}>
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-[border-color,background-color,box-shadow] duration-500 ease-out",
                  isActive
                    ? "border-copper bg-copper/15 shadow-[0_0_16px_rgb(var(--copper-rgb)/0.35)]"
                    : done
                      ? "border-copper/60 bg-bg-elev"
                      : "border-line-strong bg-bg-elev",
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", isActive || done ? "bg-copper" : "bg-line-strong")} />
              </span>
              {!last ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-2 w-px flex-1",
                    row && "lg:ml-3 lg:mt-0 lg:h-px lg:w-auto",
                    done || isActive ? "bg-copper/50" : "bg-line",
                  )}
                />
              ) : null}
            </div>
            <div className="flex flex-col gap-2 pb-4">
              <span className={cn("t-label", isActive ? "text-copper" : "text-text-faint")}>{s.index}</span>
              <h3 className="font-display text-[20px] font-medium leading-tight text-text">{s.title}</h3>
              <p className="text-[15px] leading-relaxed text-text-dim">{s.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
