import { cn } from "@/lib/cn";
import { Eyebrow } from "./Eyebrow";

export interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  /** Optional italic subhead between the heading and the body. */
  tagline?: string;
  body?: string;
  as?: "h1" | "h2";
  align?: "left" | "center";
  className?: string;
}

export function SectionHeader({ eyebrow, title, tagline, body, as = "h2", align = "left", className }: SectionHeaderProps) {
  const Heading = as;
  const centered = align === "center";
  return (
    <header className={cn("flex flex-col gap-5", centered && "items-center text-center", className)}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <Heading className={cn(as === "h1" ? "t-display" : "t-h2", "max-w-[20ch] text-text text-balance")}>{title}</Heading>
      {tagline ? (
        <p className={cn("max-w-[32ch] text-balance font-display text-[20px] font-medium italic leading-snug text-copper-soft lg:text-[25px]", centered && "mx-auto")}>{tagline}</p>
      ) : null}
      {body ? <p className={cn("t-body", centered && "mx-auto")}>{body}</p> : null}
    </header>
  );
}
