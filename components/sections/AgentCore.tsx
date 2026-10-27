"use client";

import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { useSceneStore } from "@/lib/scene-store";
import { BracketPanel } from "@/components/ui";
import tracesJson from "@/content/data/reasoning-traces.json";
import { SectionIntro } from "./SectionIntro";
import { usePrefersReducedMotion } from "./useSectionProgress";

const CONFIG = {
  /** ms per loop phase (matches AgentLoop quadrant timing) */
  phaseMs: 900,
  /** portion of each phase spent typing its text */
  typeMs: 620,
} as const;

type Phase = "assess" | "calculate" | "evaluate" | "execute";
type PresetId = "poker" | "blackjack" | "roulette";
interface Trace {
  preset: PresetId;
  label: string;
  state: string;
  steps: { phase: Phase; text: string }[];
}

const TRACES = tracesJson as unknown as Trace[];
const PHASES: Phase[] = ["assess", "calculate", "evaluate", "execute"];

const PHASE_STYLE: Record<Phase, { text: string; bg: string; border: string }> = {
  assess: { text: "text-data-red", bg: "bg-data-red", border: "border-data-red" },
  calculate: { text: "text-data-blue", bg: "bg-data-blue", border: "border-data-blue" },
  evaluate: { text: "text-data-green", bg: "bg-data-green", border: "border-data-green" },
  execute: { text: "text-data-gold", bg: "bg-data-gold", border: "border-data-gold" },
};

/** 05 // AGENT_CORE — scripted flowchart vs the reasoning loop, with runnable illustrative traces. */
export function AgentCore() {
  const c = copy.home.agentCore;
  const reduced = usePrefersReducedMotion();
  const [preset, setPreset] = useState<PresetId | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const raf = useRef(0);

  const total = CONFIG.phaseMs * PHASES.length;
  const trace = preset ? TRACES.find((t) => t.preset === preset) ?? null : null;

  const run = (id: PresetId) => {
    const startedAt = performance.now();
    useSceneStore.getState().setInteraction({ agentPreset: id, agentPresetStartedAt: startedAt });
    setPreset(id);
    cancelAnimationFrame(raf.current);
    if (reduced) {
      setElapsed(total);
      return;
    }
    setElapsed(0);
    const tick = () => {
      const e = performance.now() - startedAt;
      setElapsed(Math.min(total, e));
      if (e < total) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      useSceneStore.getState().setInteraction({ agentPreset: null });
    },
    [],
  );

  const done = trace !== null && elapsed >= total;
  const currentPhase = trace && !done ? Math.min(PHASES.length - 1, Math.floor(elapsed / CONFIG.phaseMs)) : -1;
  const resultText = done && trace ? trace.steps[trace.steps.length - 1]?.text ?? "" : "";

  return (
    <section data-scene="AgentLoop" aria-labelledby={c.id} className="relative">
      <div className="container-site section-pad relative">
        <div className="max-w-3xl">
          <SectionIntro id={c.id} eyebrow={c.eyebrow} title={c.title} />
          <p className="sr-only">{c.sceneAlt}</p>
        </div>

        <div className="mt-16 grid grid-cols-12 gap-x-6 gap-y-10 lg:mt-24">
          {/* Legacy scripted flow */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4">
            <Flowchart />
          </div>

          {/* Agent core loop + presets + trace */}
          <div className="col-span-12 md:col-span-6 lg:col-span-7 lg:col-start-6">
            <p className="t-label text-text-faint">{c.loopLabel}</p>
            <ol className="mt-5 grid grid-cols-1 gap-px overflow-hidden border border-line bg-line sm:grid-cols-2">
              {c.loop.map((step, i) => {
                const s = PHASE_STYLE[step.phase as Phase];
                const active = currentPhase === i || (done && i === PHASES.length - 1);
                return (
                  <li
                    key={step.phase}
                    className={cn(
                      "glass relative p-5 transition-colors duration-300 ease-out",
                      active && "bg-bg-elev-2/80",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-x-0 top-0 h-px transition-opacity duration-300 ease-out",
                        s.bg,
                        active ? "opacity-100" : "opacity-40",
                      )}
                    />
                    <p className="t-label flex items-center gap-2">
                      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", s.bg)} />
                      <span className={s.text}>{step.index}</span>
                    </p>
                    <h3 className="mt-3 font-display text-[19px] font-medium tracking-[-0.01em] text-text">{step.title}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-text-dim">{step.body}</p>
                  </li>
                );
              })}
            </ol>

            <div className="mt-8 flex flex-wrap items-center gap-3" role="group" aria-label={c.presetsLabel}>
              <span className="t-label mr-2 text-text-faint" aria-hidden="true">
                {c.presetsLabel}
              </span>
              {c.presets.map((p) => {
                const selected = preset === p.preset;
                return (
                  <button
                    key={p.preset}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => run(p.preset as PresetId)}
                    className={cn(
                      "t-label h-9 rounded-btn border px-4 transition-colors duration-200 ease-out",
                      selected
                        ? "border-copper bg-copper/10 text-copper-soft"
                        : "border-line-strong text-text-dim hover:border-copper/60 hover:text-text",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <BracketPanel label={c.traceLabel} className="glass mt-6 min-h-[260px] font-mono text-[13px] leading-relaxed">
              {trace ? (
                <div>
                  <p className="t-label text-text-faint">{trace.label}</p>
                  <p className="mt-3 text-text">
                    <span className="text-text-faint">{c.traceStateLabel} › </span>
                    {trace.state}
                  </p>
                  <ol className="mt-4 flex flex-col gap-2.5">
                    {trace.steps.map((step, i) => {
                      const phaseStart = i * CONFIG.phaseMs;
                      if (elapsed < phaseStart && !done) return null;
                      const frac = done ? 1 : Math.min(1, (elapsed - phaseStart) / CONFIG.typeMs);
                      const shown = step.text.slice(0, Math.ceil(step.text.length * frac));
                      const s = PHASE_STYLE[step.phase];
                      const isCurrent = currentPhase === i;
                      return (
                        <li
                          key={step.phase}
                          className={cn(
                            "grid grid-cols-[88px_1fr] gap-3 border-l pl-3 transition-colors duration-300 sm:grid-cols-[104px_1fr]",
                            isCurrent ? s.border : "border-line",
                          )}
                        >
                          <span className={cn("uppercase tracking-[0.08em]", s.text)}>{c.phaseLabels[step.phase]}</span>
                          <span className={cn(step.phase === "execute" ? "text-data-gold" : "text-text-dim")}>
                            {shown}
                            {isCurrent && frac < 1 && <span aria-hidden="true" className="text-text">▍</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ) : (
                <p className="text-text-faint">{c.traceIdle}</p>
              )}
              <p aria-live="polite" className="sr-only">
                {resultText ? `${c.traceResultLabel}: ${resultText}` : ""}
              </p>
            </BracketPanel>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Dimmed copper flowchart representing a predefined, scripted bot. */
function Flowchart() {
  const c = copy.home.agentCore;
  const box = "t-label border border-copper/40 bg-copper/[0.04] px-3 py-2 text-center text-copper/70";
  const vline = "mx-auto h-5 w-px bg-copper/30";
  return (
    <figure className="opacity-80">
      <p className="t-label text-text-faint">{c.scriptLabel}</p>
      <div className="mt-5 border border-line p-5 sm:p-6">
        <div className="grid grid-cols-[1fr_24px_1fr] items-center">
          <div className={cn(box, "col-start-1")}>{c.flow.start}</div>
          <div className="col-span-3 grid grid-cols-[1fr_24px_1fr]">
            <div className={vline} />
          </div>

          <div className={box}>{c.flow.condA}</div>
          <div aria-hidden="true" className="h-px bg-copper/30" />
          <div className={box}>{c.flow.actionB}</div>
          <div className="col-span-3 grid grid-cols-[1fr_24px_1fr]">
            <div className={vline} />
          </div>

          <div className={box}>{c.flow.condC}</div>
          <div aria-hidden="true" className="h-px bg-copper/30" />
          <div className={box}>{c.flow.actionD}</div>
          <div className="col-span-3 grid grid-cols-[1fr_24px_1fr]">
            <div className={vline} />
          </div>

          <div className={box}>{c.flow.stop}</div>
        </div>
      </div>
      <figcaption className="mt-4 text-[15px] text-text-faint">{c.flowCaption}</figcaption>
    </figure>
  );
}
