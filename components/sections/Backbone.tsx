"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { BracketPanel, Eyebrow } from "@/components/ui";
import { SectionIntro } from "./SectionIntro";

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

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="t-label inline-flex items-center gap-2 border border-copper/40 bg-copper/[0.07] px-2 py-1 text-[10px] text-copper-soft">
      <span aria-hidden="true" className="h-1 w-1 rotate-45 bg-copper" />
      {children}
    </span>
  );
}

function Check({ premium = false }: { premium?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className={cn("mt-[5px] h-3 w-3 flex-none", premium ? "text-data-gold" : "text-text-faint")}
    >
      <path d="M2 6.2 4.8 9 10 3" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

/** 02 // THE_BACKBONE — platform diagram (what Agentium runs) + revenue model (how it earns). */
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
              <SectionIntro id={c.id} eyebrow={c.eyebrow} title={c.title} body={c.body} />
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
                    <p className="font-display text-[19px] font-medium leading-snug text-text transition-colors duration-300 group-hover:text-copper-soft">
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
            aria-label={`${d.top.label} connect to the ${d.core.label}, which runs ${d.core.modules.map((m) => m.name).join(", ")} and ${d.core.ai.name}, joined to ${d.aggregation.label} and ${d.settlement.label}.`}
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
                <div
                  className="bb-reveal mt-2 flex items-center gap-3 border border-data-gold/30 bg-gradient-to-r from-data-gold/[0.10] via-copper/[0.05] to-transparent p-3"
                  style={delay(7)}
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
                  <p className="font-display text-[19px] font-medium leading-snug text-text">{d.aggregation.title}</p>
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
                    <span className="bb-wire-h flex-1" style={{ "--pd": "0.2s" } as CSSProperties} />
                    <span className="t-label text-[10px] text-copper">1 API</span>
                  </div>
                </BracketPanel>

                {/* Settlement */}
                <BracketPanel className="bb-reveal glass" label={`${d.settlement.index} · ${d.settlement.label}`}>
                  <p className="font-display text-[19px] font-medium leading-snug text-text">{d.settlement.title}</p>
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

      {/* ---------------- Part 2: revenue model ---------------- */}
      <div ref={rev.ref} data-in={rev.inView} className="container-site relative pb-16 lg:pb-24">
        <div className="mb-12 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent lg:mb-20" />

        <header className="grid grid-cols-12 gap-x-6 gap-y-6">
          <div className="bb-reveal col-span-12 lg:col-span-7">
            <Eyebrow>{r.eyebrow}</Eyebrow>
            <h3 id={r.id} className="t-h2 mt-5 max-w-[18ch] text-balance text-text">
              {r.title}
            </h3>
          </div>
          <p className="t-body bb-reveal col-span-12 self-end lg:col-span-5" style={delay(1)}>
            {r.body}
          </p>
        </header>

        <div className="mt-12 grid grid-cols-12 gap-3 lg:mt-16">
          {/* R1 Subscription — the hero card */}
          <BracketPanel as="article" className="bb-reveal col-span-12 flex flex-col p-6 md:p-8 lg:col-span-7">
            <div className="flex items-center justify-between">
              <span className="t-num text-[13px] text-copper">{r.subscription.index}</span>
              <Tag>{r.subscription.tag}</Tag>
            </div>
            <h4 className="t-h3 mt-6 text-text">{r.subscription.title}</h4>
            <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-text-dim">{r.subscription.body}</p>

            <p className="t-label mt-8 text-[10px] text-text-faint">{r.subscription.gamesLabel}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {r.subscription.games.map((g, i) => (
                <li
                  key={g}
                  className={cn(
                    "border px-3 py-1.5 text-[13px]",
                    i === r.subscription.games.length - 1
                      ? "border-dashed border-line-strong text-text-faint"
                      : "border-line-strong text-text",
                  )}
                >
                  {g}
                </li>
              ))}
            </ul>

            <div className="mt-8 grid flex-1 gap-3 sm:grid-cols-2">
              <div className="border border-line bg-bg/40 p-5">
                <p className="t-label text-[10px] text-text-dim">{r.subscription.baseLabel}</p>
                <ul className="mt-4 space-y-2.5">
                  {r.subscription.base.map((b) => (
                    <li key={b} className="flex gap-2.5 text-[14px] text-text-dim">
                      <Check />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative overflow-hidden border border-data-gold/40 bg-gradient-to-br from-data-gold/[0.10] via-copper/[0.05] to-transparent p-5">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-data-gold/20 blur-3xl"
                />
                <p className="t-label text-[10px] text-data-gold">{r.subscription.premiumLabel}</p>
                <ul className="mt-4 space-y-2.5">
                  {r.subscription.premium.map((p) => (
                    <li key={p} className="flex gap-2.5 text-[14px] text-text">
                      <Check premium />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </BracketPanel>

          <div className="col-span-12 flex flex-col gap-3 lg:col-span-5">
            {/* R2 Credits */}
            <BracketPanel as="article" className="bb-reveal p-6 md:p-8">
              <div className="flex items-center justify-between">
                <span className="t-num text-[13px] text-copper">{r.credits.index}</span>
                <Tag>{r.credits.tag}</Tag>
              </div>
              <h4 className="t-h3 mt-6 text-text">{r.credits.title}</h4>
              <p className="mt-3 text-[15px] leading-relaxed text-text-dim">{r.credits.body}</p>
              <ol className="mt-6 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-0">
                {r.credits.steps.map((s, i) => (
                  <li key={s} className="flex items-center gap-3 sm:flex-1 sm:gap-0 sm:last:flex-none">
                    <span aria-hidden="true" className="t-num text-[10px] text-copper sm:hidden">0{i + 1}</span>
                    <span className="t-label text-[10px] leading-snug text-text">{s}</span>
                    {i < r.credits.steps.length - 1 ? (
                      <span
                        aria-hidden="true"
                        className="bb-wire-h mx-2 hidden min-w-4 flex-1 sm:block"
                        style={{ "--pd": `${i * 1.1}s` } as CSSProperties}
                      />
                    ) : null}
                  </li>
                ))}
              </ol>
              <div aria-hidden="true" className="mt-5">
                <div className="flex items-center justify-between">
                  <span className="t-label text-[10px] text-text-faint">{r.credits.meterLabel}</span>
                  <span className="t-num text-[11px] text-data-gold">CR</span>
                </div>
                <div className="bb-meter mt-2 h-2 border border-line bg-bg/60 p-px">
                  <span className="block h-full bg-gradient-to-r from-copper via-data-gold to-copper-soft" />
                </div>
              </div>
            </BracketPanel>

            {/* R3 + R4 */}
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              {[r.whiteLabel, r.revenueShare].map((s) => (
                <BracketPanel
                  key={s.index}
                  as="article"
                  className="bb-reveal group flex flex-col p-6 transition-colors duration-300 hover:border-line-strong"
                >
                  <div className="flex items-center justify-between">
                    <span className="t-num text-[13px] text-copper">{s.index}</span>
                    <Tag>{s.tag}</Tag>
                  </div>
                  <h4 className="mt-5 font-display text-[20px] font-medium leading-snug text-text transition-colors duration-300 group-hover:text-copper-soft">
                    {s.title}
                  </h4>
                  <p className="mt-2 text-[14px] leading-relaxed text-text-dim">{s.body}</p>
                </BracketPanel>
              ))}
            </div>
          </div>
        </div>

        {/* AI intelligence ribbon */}
        <div className="bb-reveal bb-core mt-3 border border-copper/30 bg-bg-elev/80 p-6 backdrop-blur-md md:p-8">
          <div className="grid items-center gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="t-label bb-shimmer text-[12px]">{r.intelligence.label}</p>
              <p className="mt-3 font-display text-[22px] font-medium leading-snug text-text text-balance">
                {r.intelligence.title}
              </p>
            </div>
            <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr] lg:col-span-8">
              <ul className="space-y-2">
                {r.intelligence.inputs.map((x) => (
                  <li key={x} className="border border-line bg-bg/50 px-4 py-3 text-[14px] text-text-dim">
                    {x}
                  </li>
                ))}
              </ul>
              <div aria-hidden="true" className="flex items-center justify-center gap-2 sm:flex-col">
                <span className="bb-wire-h w-10 sm:w-14" />
                <span className="grid h-12 w-12 rotate-45 place-items-center border border-data-gold/60 bg-data-gold/10 shadow-[0_0_24px_rgb(var(--data-gold-rgb)/0.35)]">
                  <span className="t-num -rotate-45 text-[11px] text-data-gold">AI</span>
                </span>
                <span className="bb-wire-h w-10 sm:w-14" style={{ "--pd": "1.2s" } as CSSProperties} />
              </div>
              <ul className="space-y-2">
                {r.intelligence.outputs.map((x) => (
                  <li
                    key={x}
                    className="flex items-center gap-3 border border-copper/30 bg-copper/[0.06] px-4 py-2.5 text-[14px] text-text"
                  >
                    <span aria-hidden="true" className="h-1.5 w-1.5 rotate-45 bg-data-gold" />
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <p className="t-label mt-8 max-w-[90ch] text-[10px] leading-relaxed text-text-faint">{r.footnote}</p>
      </div>
    </section>
  );
}
