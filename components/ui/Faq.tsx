import { cn } from "@/lib/cn";

export interface FaqProps {
  items: { q: string; a: string }[];
  className?: string;
}

/** Native details/summary accordion: keyboard and screen-reader friendly, no JS. */
export function Faq({ items, className }: FaqProps) {
  return (
    <div className={cn("border-t border-line", className)}>
      {items.map((it) => (
        <details key={it.q} className="group border-b border-line">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 text-left [&::-webkit-details-marker]:hidden">
            <span className="font-display text-[18px] font-medium text-text md:text-[20px]">{it.q}</span>
            <span aria-hidden="true" className="relative mt-2 h-3 w-3 shrink-0">
              <span className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-copper" />
              <span className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-copper transition-transform duration-300 ease-out group-open:scale-y-0" />
            </span>
          </summary>
          <p className="t-body pb-6">{it.a}</p>
        </details>
      ))}
    </div>
  );
}
