"use client";

import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { AlertRow, BracketPanel, SimLabel, Sparkline } from "@/components/ui";
import { useSimEvents } from "@/lib/sim/useSimFeed";
import type { SimEventOf } from "@/lib/sim/types";
import riskRadarJson from "@/content/data/risk-radar.json";
import { SectionIntro } from "./SectionIntro";
import { usePrefersReducedMotion } from "./useSectionProgress";

/** Client request: no data figures shown in this section; every value renders as this placeholder. */
const MASK = "XXX";

const CONFIG = {
  alertCount: 6,
  /** seconds a marker takes to cross the filter band (match AnomalyStream scroll speed) */
  markerTravelS: 14,
} as const;

interface RiskRow {
  label: string;
  pct: number;
  spark: number[];
}
const RISK_ROWS = riskRadarJson as unknown as RiskRow[];
const RISK_MAX = Math.max(1, ...RISK_ROWS.map((r) => r.pct));

type Anomaly = SimEventOf<"anomaly.detected">;

/** 07 // RISK_RADAR — dashboard over the AnomalyStream scene. */
export function RiskIntel() {
  const c = copy.home.risk;
  const alerts = useSimEvents("anomaly.detected", CONFIG.alertCount);
  const reduced = usePrefersReducedMotion();

  return (
    <section id="risk-radar" data-scene="AnomalyStream" aria-labelledby={c.id} className="relative">
      <div className="container-site section-pad relative">
        <div className="grid grid-cols-12 gap-x-6">
          <div className="col-span-12 lg:col-span-7">
            <SectionIntro id={c.id} eyebrow={c.eyebrow} title={c.title} body={c.body} />
            <p className="sr-only">{c.sceneAlt}</p>
          </div>
        </div>

        {/* Anomaly stream: the scene shows through this frosted filter band */}
        <div className="mt-16 lg:mt-24">
          <div className="mb-3 flex items-center justify-between gap-4">
            <p className="t-label text-text-faint">{c.panels.stream}</p>
            <SimLabel />
          </div>
          <FilterBand label={c.filterLabel} tag={c.filterTag} alerts={alerts} reduced={reduced} />
        </div>

        <div className="mt-6 grid grid-cols-12 gap-4 md:gap-6">
          {/* Calculated risk exposure */}
          <BracketPanel label={c.panels.exposure} className="glass col-span-12 lg:col-span-5">
            <div className="-mt-2 mb-5 flex items-center justify-between gap-4">
              <span className="t-label text-[11px] md:text-[10px] text-text-faint">{c.exposureUnit}</span>
              <SimLabel />
            </div>
            <ul className="flex flex-col gap-3.5">
              {RISK_ROWS.map((row) => (
                <li key={row.label} className="grid grid-cols-[minmax(0,1fr)_56px_64px] items-center gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] text-text-dim">{row.label}</p>
                    <div className="mt-1.5 h-[3px] w-full bg-line" aria-hidden="true">
                      <div
                        className="h-full bg-data-red"
                        style={{ width: `${(row.pct / RISK_MAX) * 100}%`, opacity: 0.45 + 0.55 * (row.pct / RISK_MAX) }}
                      />
                    </div>
                  </div>
                  <span className="t-num text-right text-[13px] text-text">{MASK}%</span>
                  <Sparkline data={row.spark} className="h-6 w-16" color="rgb(var(--data-red-rgb) / 0.8)" />
                </li>
              ))}
            </ul>
          </BracketPanel>

          {/* Suspicious activity flagged */}
          <BracketPanel label={c.panels.suspicious} className="glass col-span-12 md:col-span-7 lg:col-span-4">
            <div className="-mt-1 flex items-end justify-between gap-4">
              <MaskedStat label={c.flaggedLabel} />
              <SimLabel />
            </div>
            <ul className="mt-5 flex flex-col border-t border-line" aria-label={c.panels.suspicious}>
              {alerts.length === 0 ? (
                <li className="t-label flex items-center gap-2.5 py-4 text-text-faint">
                  <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-copper/60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-copper" />
                  </span>
                  {c.alertsEmpty}
                </li>
              ) : (
                alerts.map((a) => (
                  <li key={a.id} className="border-b border-line/70">
                    <AlertRow rule={a.rule} severity={a.severity} agentId={a.agentId} time={`${MASK} AGO`} score={MASK} />
                  </li>
                ))
              )}
            </ul>
          </BracketPanel>

          {/* Automated interventions approved */}
          <BracketPanel label={c.panels.interventions} className="glass col-span-12 md:col-span-5 lg:col-span-3">
            <div className="flex h-full flex-col">
              <MaskedStat label={c.interventionsLabel} />
              <div className="mt-6 flex items-baseline justify-between gap-3 border-t border-line pt-4">
                <span className="t-label text-text-faint">{c.pendingLabel}</span>
                <span className="font-display text-[22px] font-medium leading-none tabular-nums lining-nums text-data-gold">{MASK}</span>
              </div>
              <p className="mt-6 text-[14px] leading-relaxed text-text-dim">{c.interventionsNote}</p>
              <SimLabel className="mt-auto pt-6" />
            </div>
          </BracketPanel>
        </div>
      </div>
    </section>
  );
}

/** Static stand-in for StatTicker (same markup), showing the placeholder instead of a counted-up value. */
function MaskedStat({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-display text-[26px] font-medium leading-none tabular-nums lining-nums text-text md:text-[28px]">{MASK}</span>
      <span className="t-label text-[11px] text-text-faint">{label}</span>
    </div>
  );
}

/** Frosted "STREAMING ANALYTICS & ML FILTER" band; a triangle marker appears for each caught anomaly. */
function FilterBand({ label, tag, alerts, reduced }: { label: string; tag: string; alerts: Anomaly[]; reduced: boolean }) {
  return (
    <div aria-hidden="true" className="relative h-28 overflow-hidden border-y border-line-strong/70 lg:h-36">
      <div className="glass absolute inset-0" style={{ background: "rgb(var(--bg-elev-rgb) / 0.35)" }} />
      <div
        className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2"
        style={{ background: "linear-gradient(90deg, transparent, rgb(var(--copper-rgb) / 0.35), transparent)" }}
      />
      <p className="t-label absolute bottom-3 left-4 text-[11px] text-text-dim md:left-6">{label}</p>
      <p className="t-num absolute bottom-3 right-4 hidden text-[11px] text-text-faint sm:block md:right-6">{tag}</p>

      {alerts.map((a, i) => {
        const high = a.severity === "high";
        const size = 6 + Math.round(a.score * 6);
        return (
          <span
            key={a.id}
            className="absolute top-3"
            style={
              reduced
                ? { left: `${88 - i * 14}%` }
                : { left: "100%", animation: `agem-risk-marker ${CONFIG.markerTravelS}s linear forwards` }
            }
          >
            <svg width={size * 2} height={size * 2} viewBox="0 0 12 12" className="-translate-x-1/2">
              <polygon
                points="6,11 1,2 11,2"
                fill={high ? "rgb(var(--data-red-rgb))" : "rgb(var(--copper-rgb))"}
                opacity={0.6 + a.score * 0.4}
              />
            </svg>
            <span
              className={cn(
                "absolute left-0 top-full h-10 w-px -translate-x-1/2",
                high ? "bg-data-red/50" : "bg-copper/40",
              )}
            />
          </span>
        );
      })}

      <style>{`@keyframes agem-risk-marker { 0% { left: 96%; opacity: 0 } 6% { opacity: 1 } 85% { opacity: 1 } 100% { left: 0%; opacity: 0 } }`}</style>
    </div>
  );
}
