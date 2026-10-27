import { cn } from "@/lib/cn";

const mark = "absolute h-3 w-3 border-text/40";

/** Decorative 80px blueprint grid with optional 12px crop marks at the corners. */
export function BlueprintGrid({ className, cropMarks = true }: { className?: string; cropMarks?: boolean }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(var(--text-rgb) / 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--text-rgb) / 0.06) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          backgroundPosition: "-1px -1px",
        }}
      />
      {cropMarks ? (
        <>
          <span className={cn(mark, "left-4 top-4 border-l border-t")} />
          <span className={cn(mark, "right-4 top-4 border-r border-t")} />
          <span className={cn(mark, "bottom-4 left-4 border-b border-l")} />
          <span className={cn(mark, "bottom-4 right-4 border-b border-r")} />
        </>
      ) : null}
    </div>
  );
}
