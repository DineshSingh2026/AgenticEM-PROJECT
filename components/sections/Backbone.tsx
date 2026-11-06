"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { BracketPanel, Eyebrow } from "@/components/ui";
import { SectionIntro } from "./SectionIntro";
import { CAPABILITY_ART } from "./CapabilityArt";
import { IconAggregation, IconIntelligence, IconSettlement } from "./PillarIcon";

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

const ICON = "-mr-1 -mt-1 h-14 w-14 md:h-16 md:w-16";

/** One pillar card: label + heading, corner illustration, body and mini diagram, arranged by .bb-card (globals.css). */
function PillarCard({
  index,
  label,
  title,
  body,
  icon,
  className,
  style,
  children,
}: {
  index: string;
  label: string;
  title: string;
  body: string;
  icon: ReactNode;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <BracketPanel className={cn("bb-reveal bb-card glass h-full", className)} style={style}>
      <div className="bb-card-head">
        <p className="t-label mb-4 text-text-faint">{`${index} · ${label}`}</p>
        <p className="font-display text-[21px] font-medium leading-snug text-text">{title}</p>
      </div>
      <div className="bb-card-icon">{icon}</div>
      <p className="bb-card-body mt-2 text-[14px] leading-relaxed text-text-dim">{body}</p>
      <div className="bb-card-diag">{children}</div>
    </BracketPanel>
  );
}

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
              <SectionIntro id={c.id} eyebrow={c.eyebrow} title={c.title} tagline={c.tagline} />
            </div>

            <ol aria-label="What operators get" className="mt-12 border-t border-line">
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

          {/* Pillars A · B · C: stacked in the right column on lg+, 2 + full-width C on md, 1 col on mobile. */}
          <div
            className="col-span-12 lg:col-span-7 lg:pl-6 xl:pl-10"
            role="img"
            aria-label={`One platform: ${d.aggregation.label}, ${d.settlement.label} and ${d.intelligence.label}.`}
          >
            <div aria-hidden="true" className="grid gap-3 md:grid-cols-2 lg:h-full lg:auto-rows-fr lg:grid-cols-1 lg:gap-4">
              {/* Aggregation */}
              <PillarCard {...d.aggregation} icon={<IconAggregation className={ICON} />} style={delay(1)}>
                <div className="grid grid-cols-3 gap-1.5">
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
              </PillarCard>

              {/* Settlement */}
              <PillarCard {...d.settlement} icon={<IconSettlement className={ICON} />} style={delay(2)}>
                <div className="flex flex-1 flex-col md:justify-between">
                  <div className="flex items-center">
                    {d.settlement.flows.map((f, i) => (
                      <div key={f} className="flex flex-1 items-center last:flex-none">
                        <span className="t-num border border-copper/40 bg-copper/[0.06] px-2 py-1.5 text-[10px] text-copper-soft">
                          {f}
                        </span>
                        {i < d.settlement.flows.length - 1 ? (
                          <span className="bb-wire-h mx-1 min-w-3 flex-1" style={{ "--pd": `${i * 0.8}s` } as CSSProperties} />
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
                </div>
              </PillarCard>

              {/* AI intelligence */}
              <PillarCard
                {...d.intelligence}
                icon={<IconIntelligence className={ICON} />}
                className="bb-card-wide md:col-span-2 lg:col-span-1"
                style={delay(3)}
              >
                <div className="grid grid-cols-4 gap-1.5">
                  {d.intelligence.agents.map((a, i) => (
                    <span
                      key={a}
                      className="t-num flex items-center justify-center gap-1.5 border border-line bg-bg/50 py-1.5 text-[10px] text-text-faint"
                    >
                      <span
                        className="h-1 w-1 shrink-0 rounded-full bg-data-gold shadow-[0_0_6px_rgb(var(--data-gold-rgb)/0.8)]"
                        style={{ animation: `bb-blink 2.2s ${i * 0.55}s steps(2, jump-none) infinite` }}
                      />
                      {a}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center">
                  <span className="bb-wire-h min-w-4 flex-1" style={{ "--pd": "0.3s" } as CSSProperties} />
                  <span className="t-label mx-1.5 shrink-0 whitespace-nowrap border border-data-gold/50 bg-data-gold/[0.08] px-2 py-[3px] text-[10px] text-data-gold">
                    {d.intelligence.engineLabel}
                  </span>
                  <span className="bb-wire-h bb-rev min-w-4 flex-1" style={{ "--pd": "1.1s" } as CSSProperties} />
                </div>
                <div className="t-label mt-3 flex items-center justify-between text-[10px]">
                  {d.intelligence.loop.map((s, i) => (
                    <span key={s} className="contents">
                      {i > 0 ? <span className="h-px flex-1 bg-line" /> : null}
                      <span className="bb-step px-1.5" style={{ "--pd": `${i * 1.2}s` } as CSSProperties}>
                        {s}
                      </span>
                    </span>
                  ))}
                </div>
              </PillarCard>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- Part 2: platform capabilities ---------------- */}
      <div ref={rev.ref} data-in={rev.inView} className="container-site relative pb-16 lg:pb-24">
        <div className="mb-12 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent lg:mb-20" />

        <header className="bb-reveal">
          <Eyebrow>{r.eyebrow}</Eyebrow>
          <h3 id={r.id} className="t-h2 mt-5 max-w-[20ch] text-balance text-text">
            {r.title}
          </h3>
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
