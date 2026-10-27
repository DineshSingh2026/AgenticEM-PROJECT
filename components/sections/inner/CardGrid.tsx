import { BracketPanel } from "@/components/ui";
import { cn } from "@/lib/cn";

export interface CardGridItem {
  readonly id?: string;
  readonly label?: string;
  readonly title: string;
  readonly body: string;
  readonly points?: readonly string[];
}

export interface CardGridProps {
  items: readonly CardGridItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

const colClass = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 lg:grid-cols-3",
  4: "md:grid-cols-2 lg:grid-cols-4",
} as const;

/** Grid of BracketPanels with mono label, title, body and an optional point list. */
export function CardGrid({ items, columns = 3, className }: CardGridProps) {
  return (
    <ul role="list" className={cn("grid grid-cols-1 gap-4 md:gap-6", colClass[columns], className)}>
      {items.map((item, i) => (
        <li key={`${item.title}-${i}`} id={item.id} className="flex scroll-mt-24">
          <BracketPanel label={item.label} className="flex w-full flex-col gap-3">
            <h3 className="t-h3 text-text">{item.title}</h3>
            <p className="text-[15px] leading-relaxed text-text-dim">{item.body}</p>
            {item.points && item.points.length > 0 ? (
              <ul role="list" className="mt-3 flex flex-col gap-2 border-t border-line pt-4">
                {item.points.map((p) => (
                  <li key={p} className="flex gap-3 text-[14px] text-text-dim">
                    <span aria-hidden="true" className="mt-[9px] h-px w-3 shrink-0 bg-copper" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </BracketPanel>
        </li>
      ))}
    </ul>
  );
}
