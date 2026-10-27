"use client";

import { useCallback, useEffect } from "react";
import { copy } from "@/content/copy";
import { useSceneStore } from "@/lib/scene-store";
import { BracketPanel } from "@/components/ui";
import { SectionIntro } from "./SectionIntro";

type CardIndex = 0 | 1 | 2;

/** 03 // INTELLIGENCE_LAYER — over the Convergence scene. Cards drive bundle highlighting. */
export function IntelligenceLayer() {
  const c = copy.home.intelligence;

  const setHovered = useCallback((i: CardIndex | null) => {
    useSceneStore.getState().setInteraction({ hoveredCard: i });
  }, []);

  useEffect(() => () => setHovered(null), [setHovered]);

  return (
    <section data-scene="Convergence" aria-labelledby={c.id} className="relative">
      <div className="container-site section-pad relative">
        <div className="grid grid-cols-12 gap-x-6 gap-y-16">
          <div className="col-span-12 lg:col-span-5">
            <SectionIntro id={c.id} eyebrow={c.eyebrow} title={c.title} body={c.body} />
            <p className="sr-only">{c.sceneAlt}</p>

            <ol
              aria-hidden="true"
              className="mt-12 hidden items-center gap-3 lg:flex"
            >
              <li className="t-label text-text-faint">{c.inputLabel}</li>
              <li className="h-px flex-1 bg-gradient-to-r from-text/30 to-copper/60" />
              <li className="t-label text-copper">{c.coreLabel}</li>
              <li className="h-px w-10 bg-copper/60" />
            </ol>
          </div>

          <div className="col-span-12 lg:col-span-4 lg:col-start-9">
            <p className="t-label mb-6 text-text-faint">{c.outputLabel}</p>
            <ul className="flex flex-col gap-4 lg:gap-6">
              {c.cards.map((card, i) => (
                <li key={card.index}>
                  <BracketPanel
                    as="article"
                    className="glass group transition-[border-color,background-color] duration-300 ease-out hover:border-line-strong focus-within:border-copper/70"
                  >
                    <div
                      tabIndex={0}
                      onPointerEnter={() => setHovered(i as CardIndex)}
                      onPointerLeave={() => setHovered(null)}
                      onFocus={() => setHovered(i as CardIndex)}
                      onBlur={() => setHovered(null)}
                      className="-m-6 p-6 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper"
                    >
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="t-num text-[12px] text-copper">{card.index}</span>
                        <span
                          aria-hidden="true"
                          className="h-px flex-1 bg-line transition-colors duration-300 ease-out group-hover:bg-copper/50"
                        />
                      </div>
                      <h3 className="t-h3 mt-5 text-text">{card.title}</h3>
                      <p className="mt-3 text-[15px] leading-relaxed text-text-dim">{card.body}</p>
                    </div>
                  </BracketPanel>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
