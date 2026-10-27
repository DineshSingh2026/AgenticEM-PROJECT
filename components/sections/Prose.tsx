import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Long-form typography wrapper for MDX content (insights, legal). No typography plugin needed. */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "max-w-[68ch] text-[17px] leading-[1.7] text-text-dim",
        "[&_h2]:mt-14 [&_h2]:font-display [&_h2]:text-[28px] [&_h2]:font-semibold [&_h2]:leading-tight [&_h2]:tracking-[-0.02em] [&_h2]:text-text md:[&_h2]:text-[32px]",
        "[&_h3]:mt-10 [&_h3]:font-display [&_h3]:text-[21px] [&_h3]:font-medium [&_h3]:text-text",
        "[&_p]:mt-5 [&_strong]:font-medium [&_strong]:text-text",
        "[&_a]:text-copper [&_a]:underline [&_a]:decoration-copper/40 [&_a]:underline-offset-4 hover:[&_a]:decoration-copper",
        "[&_ul]:mt-5 [&_ul]:flex [&_ul]:list-none [&_ul]:flex-col [&_ul]:gap-2 [&_ul>li]:relative [&_ul>li]:pl-6",
        "[&_ul>li]:before:absolute [&_ul>li]:before:left-0 [&_ul>li]:before:top-[0.85em] [&_ul>li]:before:h-px [&_ul>li]:before:w-3 [&_ul>li]:before:bg-copper [&_ul>li]:before:content-['']",
        "[&_ol]:mt-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol>li]:mt-2 [&_ol>li]:marker:font-mono [&_ol>li]:marker:text-copper",
        "[&_blockquote]:mt-8 [&_blockquote]:border-l [&_blockquote]:border-copper [&_blockquote]:pl-6 [&_blockquote]:text-text",
        "[&_code]:font-mono [&_code]:text-[0.88em] [&_code]:text-copper-soft",
        "[&_hr]:my-12 [&_hr]:border-line",
        "[&>*:first-child]:mt-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
