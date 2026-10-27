"use client";

import { useRef } from "react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { CompareTable } from "@/components/ui";
import { SectionIntro } from "./SectionIntro";
import { usePinned, useSectionProgress } from "./useSectionProgress";

const CONFIG = {
  /** progress at which the human line fractures into agent volume (matches VolumeBreak midpoint) */
  split: 0.5,
} as const;

/** 02 // THE_SHIFT — pinned 200vh band over the VolumeBreak scene. */
export function Shift() {
  const c = copy.home.shift;
  const bandRef = useRef<HTMLDivElement>(null);
  const progress = useSectionProgress(bandRef);
  const pinned = usePinned(1024);
  const split = !pinned || progress >= CONFIG.split;

  return (
    <section data-scene="VolumeBreak" aria-labelledby={c.id} className="relative">
      <div ref={bandRef} className="relative motion-safe:lg:min-h-[200vh]">
        <div className="relative motion-safe:lg:sticky motion-safe:lg:top-0 motion-safe:lg:h-screen motion-safe:lg:overflow-hidden">
          <div className="container-site section-pad relative flex h-full flex-col justify-center motion-safe:lg:py-24">
            <div className="grid grid-cols-12 gap-x-6 gap-y-12">
              <div className="col-span-12 lg:col-span-5">
                <SectionIntro id={c.id} eyebrow={c.eyebrow} title={c.title} body={c.body} />
                <p className="sr-only">{c.sceneAlt}</p>
              </div>
              <div className="col-span-12 lg:col-span-6 lg:col-start-7 lg:self-end">
                <CompareTable columns={c.columns} rows={[...c.rows]} />
              </div>
            </div>

            {/* Chart axis labels for the VolumeBreak scene */}
            <div
              aria-hidden="true"
              className="pointer-events-none mt-12 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-t border-line pt-4 lg:absolute lg:inset-x-6 lg:bottom-10 lg:mt-0"
            >
              <span
                className={cn(
                  "t-label flex items-center gap-2 transition-colors duration-500 ease-out",
                  split ? "text-text-faint" : "text-text",
                )}
              >
                <span className="inline-block h-px w-6 bg-text" />
                {c.axisHuman}
              </span>
              <span className="t-num hidden text-[11px] text-text-faint sm:inline">
                {Math.round(progress * 100)
                  .toString()
                  .padStart(3, "0")}
              </span>
              <span
                className={cn(
                  "t-label flex items-center gap-2 text-right transition-[color,opacity] duration-500 ease-out",
                  split ? "text-copper opacity-100" : "text-text-faint opacity-50",
                )}
              >
                {c.axisAgent}
                <span className="inline-block h-px w-6 bg-copper" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
