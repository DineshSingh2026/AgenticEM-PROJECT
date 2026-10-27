"use client";

import { useId, useState } from "react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";

export interface FeatureValueTableProps {
  rows: { feature: string; benefit: string; detail: string; chart: number[] }[];
  className?: string;
}

function MiniBars({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div aria-hidden="true" className="flex h-16 items-end gap-1.5">
      {data.map((v, i) => (
        <span
          key={i}
          className={cn("w-3", i === data.length - 1 ? "bg-copper" : "bg-steel/40")}
          style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export function FeatureValueTable({ rows, className }: FeatureValueTableProps) {
  const [open, setOpen] = useState<number | null>(0);
  const uid = useId();
  const t = copy.site.featureTable;
  return (
    <div className={cn("border-t border-line", className)}>
      <div className="t-label hidden grid-cols-[1fr_1fr_24px] gap-6 border-b border-line px-4 py-3 text-text-faint md:grid">
        <span>{t.feature}</span>
        <span>{t.benefit}</span>
        <span />
      </div>
      {rows.map((r, i) => {
        const isOpen = open === i;
        const panelId = `${uid}-p-${i}`;
        const btnId = `${uid}-b-${i}`;
        return (
          <div key={r.feature} className={cn("border-b border-line transition-colors duration-300 ease-out", isOpen && "bg-bg-elev/60")}>
            <h3>
              <button
                id={btnId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
                className="grid w-full grid-cols-[1fr_24px] items-start gap-x-6 gap-y-2 px-2 py-5 text-left md:grid-cols-[1fr_1fr_24px] md:px-4"
              >
                <span className="font-display text-[18px] font-medium text-text md:text-[20px]">{r.feature}</span>
                <span className="col-start-1 row-start-2 text-[15px] text-text-dim md:col-start-2 md:row-start-1">{r.benefit}</span>
                <span aria-hidden="true" className="relative col-start-2 row-start-1 mt-2 h-3 w-3 md:col-start-3">
                  <span className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-copper" />
                  <span
                    className={cn(
                      "absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-copper transition-transform duration-300 ease-out",
                      isOpen && "scale-y-0",
                    )}
                  />
                </span>
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={btnId} hidden={!isOpen} className="px-2 pb-6 md:px-4">
              <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
                <p className="t-body">{r.detail}</p>
                <div className="flex flex-col gap-2">
                  <MiniBars data={r.chart} />
                  <span className="t-label text-[11px] md:text-[10px] text-text-faint">{t.chartLabel}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
