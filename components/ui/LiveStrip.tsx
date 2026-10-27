"use client";

import { copy } from "@/content/copy";
import { useSimSnapshot } from "@/lib/sim/useSimFeed";
import { cn } from "@/lib/cn";
import { StatTicker } from "./StatTicker";
import { SimLabel } from "./SimLabel";

export function LiveStrip({ className }: { className?: string }) {
  const s = useSimSnapshot();
  const l = copy.site.liveStrip;
  return (
    <div aria-live="off" aria-label={l.ariaLabel} role="group" className={cn("border-y border-line bg-bg/60 backdrop-blur-sm", className)}>
      <div className="container-site flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:flex lg:flex-1 lg:justify-between lg:gap-8">
          <StatTicker value={s.roundsPerSec} format="int" label={l.roundsPerSec} />
          <StatTicker value={s.activeAgents} format="int" label={l.activeAgents} />
          <StatTicker value={s.settlements24h} format="compact" label={l.settlements24h} />
          <StatTicker value={s.anomaliesFlagged24h} format="int" label={l.anomalies24h} />
          <StatTicker value={s.medianDecisionMs} format="ms" label={l.medianDecision} />
        </div>
        <SimLabel className="lg:ml-8" />
      </div>
    </div>
  );
}
