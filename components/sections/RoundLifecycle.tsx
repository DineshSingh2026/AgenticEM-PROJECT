"use client";

import { useRef } from "react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { SectionIntro } from "./SectionIntro";
import { usePinned, useSectionProgress } from "./useSectionProgress";

const CONFIG = {
  /** progress thresholds at which the Turbine token stops at each step */
  stops: [0.2, 0.4, 0.6, 0.8, 1.0],
  /** small tolerance so the final stop triggers before the pin releases */
  epsilon: 0.015,
} as const;

/** 06 // ROUND_LIFECYCLE — pinned 250vh band over the Turbine scene. */
export function RoundLifecycle() {
  const c = copy.home.roundLifecycle;
  const bandRef = useRef<HTMLDivElement>(null);
  const progress = useSectionProgress(bandRef);
  const pinned = usePinned(768);

  const reached = pinned
    ? CONFIG.stops.filter((s) => progress >= s - CONFIG.epsilon).length
    : CONFIG.stops.length;
  const current = reached - 1;

  return (
    <section data-scene="Turbine" aria-labelledby={c.id} className="relative">
      <div ref={bandRef} className="relative motion-safe:md:min-h-[250vh]">
        <div className="relative motion-safe:md:sticky motion-safe:md:top-0 motion-safe:md:h-screen motion-safe:md:overflow-hidden">
          <div className="container-site section-pad relative flex h-full flex-col justify-between gap-12 motion-safe:md:py-24">
            <div className="grid grid-cols-12 gap-x-6">
              <div className="col-span-12 md:col-span-7 lg:col-span-6">
                <SectionIntro id={c.id} eyebrow={c.eyebrow} title={c.title} />
                <p className="sr-only">{c.sceneAlt}</p>
              </div>
              <div aria-hidden="true" className="col-span-12 mt-6 hidden md:col-span-4 md:col-start-9 md:mt-0 md:block md:text-right">
                <p className="t-label text-text-faint">{c.stepsLabel}</p>
                <p className="t-num mt-2 text-[28px] text-text">
                  <span className="text-copper">{String(Math.max(0, reached)).padStart(2, "0")}</span>
                  <span className="text-text-faint"> / {String(c.steps.length).padStart(2, "0")}</span>
                </p>
              </div>
            </div>

            <ol className="grid grid-cols-1 gap-3 md:grid-cols-5 md:gap-4">
              {c.steps.map((step, i) => {
                const open = i < reached;
                const isCurrent = pinned && i === current;
                return (
                  <li
                    key={step.index}
                    aria-current={isCurrent ? "step" : undefined}
                    className={cn(
                      "glass relative border-t px-4 pb-4 pt-4 transition-[border-color,background-color] duration-500 ease-out",
                      isCurrent ? "border-copper bg-bg-elev/80" : open ? "border-line-strong" : "border-line",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute -top-[3px] left-4 h-1.5 w-1.5 rounded-full transition-colors duration-500",
                        isCurrent ? "bg-copper shadow-[0_0_12px_rgb(var(--copper-rgb)/0.8)]" : open ? "bg-text-dim" : "bg-line-strong",
                      )}
                    />
                    <p className="t-label flex items-baseline justify-between gap-3">
                      <span className={cn("t-num", open ? "text-copper" : "text-text-faint")}>{step.index}</span>
                    </p>
                    <h3
                      className={cn(
                        "mt-3 font-display text-[19px] font-medium tracking-[-0.01em] transition-colors duration-500 lg:text-[22px]",
                        open ? "text-text" : "text-text-faint",
                      )}
                    >
                      {step.title}
                    </h3>
                    <div
                      className={cn(
                        "grid transition-[grid-template-rows,opacity] duration-500 ease-out",
                        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <p className="overflow-hidden pt-2 text-[15px] leading-relaxed text-text-dim">{step.body}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
