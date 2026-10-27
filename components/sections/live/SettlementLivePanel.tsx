"use client";

import { useEffect, useState } from "react";
import { BracketPanel, SimLabel, StatTicker } from "@/components/ui";
import { useSimEvents } from "@/lib/sim/useSimFeed";
import { cn } from "@/lib/cn";

const CONFIG = {
  rows: 6,
  /** How long the newest block shows as PENDING before flipping to CONFIRMED */
  pendingMs: 1200,
} as const;

/** Shared column template: TX column is hidden below sm so the hash stays readable at 360px. */
const ROW = "grid grid-cols-[64px_minmax(0,1fr)_92px] gap-3 sm:grid-cols-[88px_minmax(0,1fr)_52px_112px]";

export interface SettlementLiveLabels {
  panelLabel: string;
  latestBlock: string;
  txCount: string;
  listLabel: string;
  colHeight: string;
  colHash: string;
  colTx: string;
  colStatus: string;
  pending: string;
  confirmed: string;
  awaiting: string;
}

function truncateHash(hash: string) {
  const h = hash.startsWith("0x") ? hash.slice(2) : hash;
  return `0x${h.slice(0, 8)}…${h.slice(-6)}`;
}

/** Live Pending → Confirmed ledger panel driven by sim "block.confirmed" events. */
export function SettlementLivePanel({ labels }: { labels: SettlementLiveLabels }) {
  const blocks = useSimEvents("block.confirmed", CONFIG.rows);
  const latest = blocks[0];
  const latestHeight = latest?.height;
  const [pendingHeight, setPendingHeight] = useState<number | null>(null);

  useEffect(() => {
    if (latestHeight === undefined) return;
    setPendingHeight(latestHeight);
    const t = window.setTimeout(() => setPendingHeight(null), CONFIG.pendingMs);
    return () => window.clearTimeout(t);
  }, [latestHeight]);

  const placeholders = Math.max(0, CONFIG.rows - blocks.length);

  return (
    <BracketPanel label={labels.panelLabel} className="bg-bg-elev/60">
      <div className="absolute right-6 top-6">
        <SimLabel />
      </div>

      <div className="grid grid-cols-2 gap-px border border-line bg-line">
        <div className="bg-bg-elev p-4">
          <StatTicker value={latest?.height ?? 0} format="int" label={labels.latestBlock} />
        </div>
        <div className="bg-bg-elev p-4">
          <StatTicker value={latest?.txCount ?? 0} format="int" label={labels.txCount} />
        </div>
      </div>

      <p className="t-label mt-6 text-text-faint">{labels.listLabel}</p>
      <div role="table" aria-label={labels.listLabel} className="t-num mt-3 font-mono text-[12px]">
        <div role="rowgroup">
          <div
            role="row"
            className={cn(ROW, "border-b border-line pb-2 text-[11px] md:text-[10px] uppercase tracking-[0.08em] text-text-faint")}
          >
            <span role="columnheader">{labels.colHeight}</span>
            <span role="columnheader">{labels.colHash}</span>
            <span role="columnheader" className="hidden text-right sm:block">{labels.colTx}</span>
            <span role="columnheader" className="text-right">{labels.colStatus}</span>
          </div>
        </div>
        <div role="rowgroup">
          {blocks.map((b) => {
            const pending = b.height === pendingHeight;
            return (
              <div
                role="row"
                key={b.height}
                className={cn(
                  ROW,
                  "items-center border-b border-line/60 py-2 transition-colors duration-500 ease-out",
                  pending ? "text-text" : "text-text-dim",
                )}
              >
                <span role="cell">{b.height.toLocaleString("en-US")}</span>
                <span role="cell" className="truncate text-text-faint">{truncateHash(b.hash)}</span>
                <span role="cell" className="hidden text-right sm:block">{b.txCount}</span>
                <span role="cell" className="flex items-center justify-end gap-2 text-[11px] md:text-[10px] uppercase tracking-[0.08em]">
                  <span
                    aria-hidden="true"
                    className={cn("h-1.5 w-1.5 rounded-full", pending ? "animate-pulse bg-copper" : "bg-data-green")}
                  />
                  <span className={pending ? "text-copper" : "text-data-green"}>
                    {pending ? labels.pending : labels.confirmed}
                  </span>
                </span>
              </div>
            );
          })}
          {Array.from({ length: placeholders }).map((_, i) => (
            <div role="row" key={`ph-${i}`} className={cn(ROW, "border-b border-line/40 py-2 text-text-faint/60")}>
              <span role="cell">———</span>
              <span role="cell" className="truncate">{labels.awaiting}</span>
              <span role="cell" className="hidden text-right sm:block">—</span>
              <span role="cell" className="text-right">—</span>
            </div>
          ))}
        </div>
      </div>
    </BracketPanel>
  );
}
