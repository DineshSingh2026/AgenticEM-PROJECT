"use client";

import { useRef } from "react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { BracketPanel } from "@/components/ui";
import { SectionIntro } from "./SectionIntro";
import { usePinned, useSectionProgress } from "./useSectionProgress";

const CONFIG = {
  /** progress thresholds at which each layer label reveals (top layer first) */
  reveal: [0.15, 0.35, 0.55, 0.75],
  /** leader line length in SVG units */
  leader: 160,
} as const;

/** 04 // ARCHITECTURE — pinned 300vh band over the ExplodedStack scene, then the foundations row. */
export function Architecture() {
  const c = copy.home.architecture;
  const bandRef = useRef<HTMLDivElement>(null);
  const progress = useSectionProgress(bandRef);
  const pinned = usePinned(768);

  return (
    <section data-scene="ExplodedStack" aria-labelledby={c.id} className="relative">
      <div ref={bandRef} className="relative motion-safe:md:min-h-[300vh]">
        <div className="relative motion-safe:md:sticky motion-safe:md:top-0 motion-safe:md:h-screen motion-safe:md:overflow-hidden">
          <div className="container-site section-pad relative flex h-full flex-col motion-safe:md:py-24">
            <div className="grid grid-cols-12 gap-x-6 gap-y-12 md:h-full">
              <div className="col-span-12 md:col-span-6 lg:col-span-5">
                <SectionIntro id={c.id} eyebrow={c.eyebrow} title={c.title} />
                <p className="sr-only">{c.sceneAlt}</p>
                <p aria-hidden="true" className="t-label mt-10 hidden text-text-faint md:block">
                  {c.stackLabel}
                  <span className="t-num ml-3 text-copper">
                    {String(Math.round(progress * 100)).padStart(3, "0")}
                  </span>
                </p>
              </div>

              <ol className="col-span-12 flex flex-col gap-4 md:col-span-6 md:col-start-7 md:justify-center md:gap-8 lg:col-span-5 lg:col-start-8">
                {c.layers.map((layer, i) => {
                  const shown = !pinned || progress >= CONFIG.reveal[i];
                  return (
                    <li key={layer.index} className="relative">
                      {/* Leader line drawing toward the stack */}
                      <svg
                        aria-hidden="true"
                        viewBox={`0 0 ${CONFIG.leader} 10`}
                        preserveAspectRatio="none"
                        className="pointer-events-none absolute right-full top-4 mr-4 hidden h-2.5 w-24 overflow-visible lg:block xl:w-40"
                      >
                        <line
                          x1={CONFIG.leader}
                          y1="5"
                          x2="0"
                          y2="5"
                          stroke="rgb(var(--copper-rgb) / 0.7)"
                          strokeWidth="1"
                          vectorEffect="non-scaling-stroke"
                          strokeDasharray={CONFIG.leader}
                          strokeDashoffset={shown ? 0 : CONFIG.leader}
                          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)" }}
                        />
                        <circle
                          cx="0"
                          cy="5"
                          r="3"
                          fill="rgb(var(--copper-rgb))"
                          style={{
                            opacity: shown ? 1 : 0,
                            transition: "opacity 300ms cubic-bezier(0.22,1,0.36,1) 400ms",
                          }}
                        />
                      </svg>
                      <div
                        className={cn(
                          "glass border-l px-5 py-4 transition-[opacity,transform,border-color] duration-500 ease-out",
                          shown ? "translate-y-0 border-copper opacity-100" : "translate-y-3 border-line opacity-0",
                        )}
                      >
                        <p className="t-label flex items-center gap-3 text-text-faint">
                          <span className="t-num text-copper">{layer.index}</span>
                          <span aria-hidden="true" className="h-px w-6 bg-line-strong" />
                        </p>
                        <h3 className="mt-2 font-display text-[19px] font-medium leading-tight tracking-[-0.01em] text-text lg:text-[22px]">
                          {layer.title}
                        </h3>
                        <p className="mt-1.5 text-[14px] leading-relaxed text-text-dim lg:text-[15px]">{layer.body}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="container-site relative pb-24 lg:pb-40">
        <p className="t-label mb-6 text-text-faint">{c.foundationsLabel}</p>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {c.foundations.map((f, i) => (
            <li key={f.title}>
              <BracketPanel className="glass h-full">
                <span className="t-num text-[12px] text-copper">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-4 font-display text-[20px] font-medium leading-snug tracking-[-0.01em] text-text">
                  {f.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-text-dim">{f.body}</p>
              </BracketPanel>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
