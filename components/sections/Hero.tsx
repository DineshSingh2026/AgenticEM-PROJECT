import type { CSSProperties } from "react";
import { Michroma } from "next/font/google";
import { copy } from "@/content/copy";

/** Wide geometric display face matching the silver AGENTIUM logo lettering. Hero-only, so it loads on the homepage only. */
const wordmark = Michroma({ subsets: ["latin"], weight: "400", display: "swap" });

/** Homepage hero. Server component: the H1 is server-rendered and is the LCP element. */
export function Hero() {
  const c = copy.home.hero;
  return (
    <section
      data-scene="CasinoWheel"
      aria-labelledby={c.id}
      className="relative flex min-h-[100svh] flex-col justify-between"
    >
      {/* Soft scrim so copy stays readable over the wheel */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg/85 via-bg/50 to-transparent"
      />

      <div className="container-site relative z-10 flex flex-1 items-center pb-24 pt-28 md:pt-32 lg:pb-24 lg:pt-28">
        <div className="grid w-full grid-cols-12 gap-x-6">
          {/* Title block: same column and left edge as the paragraph, so it never reaches the wheel. */}
          <div className="col-span-12 md:col-span-10 lg:col-span-8 xl:col-span-7">
            {/* One H1, read as "Agentium: Powering the Global Agentic iGaming Economy". */}
            <h1 id={c.id} className="font-medium">
              <span
                className={`hero-rise hero-brand block ${wordmark.className}`}
                style={{ "--d": "0ms" } as CSSProperties}
              >
                {c.brand}
              </span>
              <span className="sr-only">: </span>
              <span aria-hidden="true" className="hero-rise hero-rule mt-6 block md:mt-8" style={{ "--d": "120ms" } as CSSProperties} />
              <span
                className="hero-rise hero-title mt-5 block max-w-[22ch] text-balance font-display text-text md:mt-6"
                style={{ "--d": "200ms" } as CSSProperties}
              >
                {c.title}
              </span>
            </h1>
            <p
              className="hero-rise t-label mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 normal-case tracking-[0.24em] text-text-faint md:mt-6"
              style={{ "--d": "300ms" } as CSSProperties}
            >
              {c.tagline.map((item, i) => (
                <span key={item} className="flex items-center gap-x-3">
                  {i > 0 && (
                    <span aria-hidden="true" className="h-1 w-1 rounded-full bg-data-gold shadow-[0_0_6px_rgb(var(--data-gold-rgb)/0.6)]" />
                  )}
                  <span>{item}</span>
                </span>
              ))}
            </p>
          </div>
          <div
            className="hero-rise col-span-12 mt-8 md:col-span-10 lg:col-span-8 lg:mt-10 xl:col-span-7"
            style={{ "--d": "420ms" } as CSSProperties}
          >
            <p className="t-body text-pretty lg:max-w-[68ch]">{c.sub}</p>
            <p className="t-label mt-6 text-text-faint lg:mt-8">{c.footnote}</p>
          </div>
        </div>
      </div>

      <p className="sr-only">{c.sceneAlt}</p>
    </section>
  );
}
