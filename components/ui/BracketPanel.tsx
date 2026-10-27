import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface BracketPanelProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  label?: string;
}

/** 1px hairline panel with 8px copper L-brackets at top-left and bottom-right. */
export function BracketPanel({ children, className, as: Tag = "div", label }: BracketPanelProps) {
  return (
    <Tag
      className={cn(
        "relative border border-line bg-bg-elev/70 p-6 backdrop-blur-md [-webkit-backdrop-filter:blur(12px)]",
        className,
      )}
    >
      <span aria-hidden="true" className="pointer-events-none absolute -left-px -top-px h-2 w-2 border-l border-t border-copper" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-px -right-px h-2 w-2 border-b border-r border-copper" />
      {label ? <p className="t-label mb-4 text-text-faint">{label}</p> : null}
      {children}
    </Tag>
  );
}
