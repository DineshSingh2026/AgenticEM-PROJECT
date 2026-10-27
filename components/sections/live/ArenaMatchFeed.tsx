"use client";

import { BracketPanel, SimLabel } from "@/components/ui";
import { useSimEvents } from "@/lib/sim/useSimFeed";
import type { SimEventOf } from "@/lib/sim/types";
import { cn } from "@/lib/cn";

const CONFIG = { rows: 5 } as const;

type MatchAction = SimEventOf<"match.event">["action"];

export interface ArenaFeedLabels {
  label: string;
  awaiting: string;
  match: string;
  actions: Record<MatchAction, string>;
}

/** Small mono feed of agent-to-agent match events (newest first). */
export function ArenaMatchFeed({ labels }: { labels: ArenaFeedLabels }) {
  const events = useSimEvents("match.event", CONFIG.rows);
  const placeholders = Math.max(0, CONFIG.rows - events.length);

  return (
    <BracketPanel label={labels.label} className="bg-bg-elev/60">
      <div className="absolute right-6 top-6">
        <SimLabel />
      </div>
      <ol className="t-num font-mono text-[12px]">
        {events.map((e, i) => (
          <li
            key={i}
            className={cn(
              "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line/60 py-2 transition-colors duration-500 ease-out",
              i === 0 ? "text-text" : "text-text-dim",
            )}
          >
            <span className="truncate">
              <span className="text-data-blue">{e.from}</span>
              <span aria-hidden="true" className="px-2 text-text-faint">→</span>
              <span className="sr-only"> to </span>
              <span className="text-data-blue">{e.to}</span>
              <span className={cn("pl-3 uppercase tracking-[0.08em]", i === 0 ? "text-copper" : "text-text-dim")}>
                {labels.actions[e.action]}
              </span>
            </span>
            <span className="text-[11px] md:text-[10px] uppercase tracking-[0.08em] text-text-faint">
              {labels.match} {e.matchId}
            </span>
          </li>
        ))}
        {Array.from({ length: placeholders }).map((_, i) => (
          <li key={`ph-${i}`} className="border-b border-line/40 py-2 text-text-faint/60">
            {labels.awaiting}
          </li>
        ))}
      </ol>
    </BracketPanel>
  );
}
