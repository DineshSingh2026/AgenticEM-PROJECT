import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Mono label. A string like "03 // INTELLIGENCE_LAYER" renders its index part in copper. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  let content: ReactNode = children;
  if (typeof children === "string" && children.includes("//")) {
    const i = children.indexOf("//");
    content = (
      <>
        <span className="text-copper">{children.slice(0, i).trim()}</span>
        <span className="text-text-faint">{" // "}</span>
        <span>{children.slice(i + 2).trim()}</span>
      </>
    );
  }
  return <p className={cn("t-label text-text-dim", className)}>{content}</p>;
}
