"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { BracketPanel, Eyebrow } from "@/components/ui";
import { SectionIntro } from "./SectionIntro";
import { CAPABILITY_ART } from "./CapabilityArt";

/** Flips data-in to "true" the first time the element scrolls into view (drives .bb-reveal). */
function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}

const delay = (d: number) => ({ "--d": d }) as CSSProperties;

/** 02 // THE_BACKBONE — platform diagram (what Agentium runs) + 02.1 platform capabilities. */
export function Backbone() {
  const c = copy.home.backbone;
  const d = c.diagram;
  const r = c.revenue;
  const top = useInView<HTMLDivElement>();
  const rev = useInView<HTMLDivElement>(0.08);

  return (
    <section
      id="backbone"
      data-scene="CasinoWheel"
      data-scene-variant="calm"
      aria-labelledby={c.id}
      className="relative"
    >
      {/* Dims the calm wheel so the dense diagram stays legible. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgb(var(--bg-rgb)/0.82)_14%,rgb(var(--bg-rgb)/0.82)_86%,transparent)]"
      />

      {/* ---------------- Part 1: the backbone ---------------- */}
      <div ref={top.ref} data-in={top.inView} className="container-site section-pad relative">
        <div className="grid grid-cols-12 gap-x-6 gap-y-16">
          <div className="col-span-12 lg:col-span-5">
            <div className="bb-reveal">
              <SectionIntro id={c.id} eyebrow={c.eyebrow} title={c.title} tagline={c.tagline} body={c.body} />
            </div>

            <p className="t-label bb-reveal mt-12 text-text-faint" style={delay(2)}>
              {c.outcomesLabel}
            </p>
            <ol className="mt-4 border-t border-line">
              {c.outcomes.map((o, i) => (
                <li
                  key={o.index}
                  className="bb-reveal group flex items-baseline gap-5 border-b border-line py-5"
                  style={delay(3 + i)}
                >
                  <span className="t-num text-[12px] text-copper">{o.index}</span>
                  <div>
                    <p className="font-display text-[21px] font-medium leading-snug text-text transition-colors duration-300 group-hover:text-copper-soft">
                      {o.title}
                    </p>
                    <p className="mt-1 text-[15px] text-text-dim">{o.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Platform diagram */}
          <div
            className="col-span-12 lg:col-span-7 lg:pl-6"
            role="img"
            aria-label={`${d.top.label} connect to the ${d.core.label}, which runs ${d.core.modules.map((m) => m.name).join(", ")}, ${d.core.compute.map((m) => m.name).join(", ")} and ${d.core.ai.name}, joined to ${d.aggregation.label} and ${d.settlement.label}.`}
          >
            <div aria-hidden="true">
              {/* Operators */}
              <div
                className="bb-reveal glass flex flex-wrap items-center justify-between gap-3 border border-line px-5 py-4"
                style={delay(1)}
              >
                <span className="t-label text-text-dim">{d.top.label}</span>
                <div className="flex gap-2">
                  {d.top.items.map((it) => (
                    <span key={it} className="t-label border border-line-strong px-2.5 py-1 text-[10px] text-text">
                      {it}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-center">
                <div className="bb-wire-v h-12" />
              </div>

              {/* Core */}
              <div
                className="bb-reveal bb-core border border-copper/30 bg-bg-elev/80 p-5 backdrop-blur-md md:p-6"
                style={delay(2)}
              >
                <div className="flex items-center justify-between">
                  <span className="t-label bb-shimmer text-[13px]">{d.core.label}</span>
                  <span className="t-label flex items-center gap-2 text-[10px] text-data-green">
                    <span className="bb-live h-1.5 w-1.5 rounded-full bg-data-green shadow-[0_0_8px_rgb(var(--data-green-rgb))]" />
                    {d.core.status}
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
                  {d.core.modules.map((m, i) => (
                    <div
                      key={m.code}
                      className="bb-reveal group border border-line bg-bg/60 p-3 transition-colors duration-300 hover:border-copper/60"
                      style={delay(3 + i)}
                    >
                      <span className="t-num text-[11px] text-copper">{m.code}</span>
                      <p className="mt-2 text-[13px] leading-snug text-text-dim transition-colors duration-300 group-hover:text-text">
                        {m.name}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {d.core.compute.map((m, i) => (
                    <div
                      key={m.code}
                      className="bb-reveal group border border-line bg-bg/60 p-3 transition-colors duration-300 hover:border-copper/60"
                      style={delay(7 + i)}
                    >
                      <span className="t-num text-[11px] text-copper">{m.code}</span>
                      <p className="mt-2 text-[13px] leading-snug text-text-dim transition-colors duration-300 group-hover:text-text">
                        {m.name}
                      </p>
                    </div>
                  ))}
                </div>
                <div
                  className="bb-reveal mt-2 flex items-center gap-3 border border-data-gold/30 bg-gradient-to-r from-data-gold/[0.10] via-copper/[0.05] to-transparent p-3"
                  style={delay(9)}
                >
                  <span className="t-num border border-data-gold/50 px-1.5 text-[11px] text-data-gold">
                    {d.core.ai.code}
                  </span>
                  <p className="text-[13px] text-text">{d.core.ai.name}</p>
                </div>
              </div>

              {/* Branch connectors (desktop: fork; mobile: single drop) */}
              <div className="relative hidden h-12 md:block">
                <div className="bb-wire-v absolute left-1/2 top-0 h-6" />
                <div className="absolute left-1/4 right-1/4 top-6 h-px bg-line-strong" />
                <div className="bb-wire-v absolute left-1/4 top-6 h-6" style={{ "--pd": "0.4s" } as CSSProperties} />
                <div className="bb-wire-v absolute right-1/4 top-6 h-6" style={{ "--pd": "1.1s" } as CSSProperties} />
              </div>
              <div className="flex justify-center md:hidden">
                <div className="bb-wire-v h-10" />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {/* Aggregation */}
                <BracketPanel className="bb-reveal glass" label={`${d.aggregation.index} · ${d.aggregation.label}`}>
                  <p className="font-display text-[21px] font-medium leading-snug text-text">{d.aggregation.title}</p>
                  <p className="mt-2 text-[14px] leading-relaxed text-text-dim">{d.aggregation.body}</p>
                  <div className="mt-5 grid grid-cols-3 gap-1.5">
                    {d.aggregation.providers.map((p, i) => (
                      <span
                        key={p}
                        className="t-num border border-line bg-bg/50 py-1.5 text-center text-[10px] text-text-faint"
                        style={{ animation: `bb-blink 3s ${i * 0.45}s steps(2, jump-none) infinite` }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="bb-wire-h min-w-6 flex-1" style={{ "--pd": "0.2s" } as CSSProperties} />
                    <span className="t-label shrink-0 whitespace-nowrap text-[10px] text-copper">{d.aggregation.gatewayLabel}</span>
                  </div>
                </BracketPanel>

                {/* Settlement */}
                <BracketPanel className="bb-reveal glass" label={`${d.settlement.index} · ${d.settlement.label}`}>
                  <p className="font-display text-[21px] font-medium leading-snug text-text">{d.settlement.title}</p>
                  <p className="mt-2 text-[14px] leading-relaxed text-text-dim">{d.settlement.body}</p>
                  <div className="mt-5 flex items-center">
                    {d.settlement.flows.map((f, i) => (
                      <div key={f} className="flex flex-1 items-center last:flex-none">
                        <span className="t-num border border-copper/40 bg-copper/[0.06] px-2 py-1.5 text-[10px] text-copper-soft">
                          {f}
                        </span>
                        {i < d.settlement.flows.length - 1 ? (
                          <span className="bb-wire-h mx-1 flex-1" style={{ "--pd": `${i * 0.8}s` } as CSSProperties} />
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-1" title="blocks">
                    {Array.from({ length: 12 }, (_, i) => (
                      <span
                        key={i}
                        className="h-2 flex-1 border border-line bg-data-gold/20"
                        style={{ animation: `bb-blink 2.4s ${i * 0.2}s steps(2, jump-none) infinite` }}
                      />
                    ))}
                  </div>
                </BracketPanel>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- Part 2: platform capabilities ---------------- */}
      <div ref={rev.ref} data-in={rev.inView} className="container-site relative pb-16 lg:pb-24">
        <div className="mb-12 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent lg:mb-20" />

        <header className="grid grid-cols-12 gap-x-6 gap-y-6 lg:gap-x-12">
          <div className="bb-reveal col-span-12 lg:col-span-6">
            <Eyebrow>{r.eyebrow}</Eyebrow>
            <h3 id={r.id} className="t-h2 mt-5 max-w-[20ch] text-balance text-text">
              {r.title}
            </h3>
          </div>
          <p className="t-body bb-reveal col-span-12 lg:col-span-6 lg:mt-[42px] lg:max-w-none lg:text-[16px] lg:leading-[1.7]" style={delay(1)}>
            {r.body}
          </p>
        </header>

        <ul aria-labelledby={r.id} className="mt-12 grid gap-3 md:grid-cols-2 lg:mt-16 lg:grid-cols-3">
          {r.capabilities.map((cap, i) => {
            const Art = CAPABILITY_ART[i % CAPABILITY_ART.length]!;
            const wide = i === 0 || i === r.capabilities.length - 1;
            return (
              <li
                key={cap.index}
                className={cn(
                  "bb-reveal cap-tile group relative flex flex-col overflow-hidden border border-line bg-bg-elev/70 backdrop-blur-md [-webkit-backdrop-filter:blur(12px)]",
                  "transition-[border-color,box-shadow,translate] duration-500 ease-out hover:-translate-y-1 hover:border-copper/50 hover:shadow-[0_18px_48px_-24px_rgb(var(--data-gold-rgb)/0.45)]",
                  i === 0 && "md:col-span-2",
                  wide && i !== 0 && "lg:col-span-2",
                )}
                style={delay(2 + i)}
              >
                <span aria-hidden="true" className="pointer-events-none absolute -left-px -top-px z-10 h-2 w-2 border-l border-t border-copper" />
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-px -right-px z-10 h-2 w-2 border-b border-r border-copper" />

                <div className="cap-art relative h-[200px] overflow-hidden border-b border-line lg:h-[220px]">
                  <Art />
                </div>

                <div className="relative flex flex-1 items-start gap-4 overflow-hidden p-5 md:p-6">
                  <span className="t-num whitespace-nowrap pt-[5px] text-[13px] text-copper">
                    {cap.index}
                    <span aria-hidden="true" className="text-text-faint lg:max-xl:hidden"> / {String(r.capabilities.length).padStart(2, "0")}</span>
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-display text-[22px] font-medium leading-snug text-text text-balance transition-colors duration-300 group-hover:text-copper-soft lg:text-[24px]">
                      {cap.title}
                    </h4>
                    {"sub" in cap && cap.sub ? (
                      <p className="t-label mt-2 text-[11px] leading-relaxed text-copper-soft/80">{cap.sub}</p>
                    ) : null}
                  </div>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-data-gold/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
