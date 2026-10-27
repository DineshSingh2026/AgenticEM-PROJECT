import type { ReactNode } from "react";
import { SectionHeader } from "@/components/ui";
import { cn } from "@/lib/cn";

export interface InnerSectionProps {
  id?: string;
  eyebrow?: string;
  title: string;
  body?: string;
  /** "stack": header above content. "split": header left, content right on large screens. */
  layout?: "stack" | "split";
  children?: ReactNode;
  className?: string;
}

/** Standard inner-page content section: container, section padding, header and content slot. */
export function InnerSection({ id, eyebrow, title, body, layout = "stack", children, className }: InnerSectionProps) {
  const split = layout === "split";
  return (
    <section id={id} className={cn("section-pad relative scroll-mt-24", className)}>
      <div className={cn("container-site", split && "grid gap-10 lg:grid-cols-12 lg:gap-6")}>
        <SectionHeader eyebrow={eyebrow} title={title} body={body} className={cn(split && "lg:col-span-5")} />
        {children ? <div className={cn(split ? "lg:col-span-6 lg:col-start-7" : "mt-12 md:mt-16")}>{children}</div> : null}
      </div>
    </section>
  );
}
