import { copy } from "@/content/copy";
import { BlueprintGrid, Eyebrow } from "@/components/ui";
import { SettlementLivePanel } from "./live/SettlementLivePanel";
import { MonetizationIcon } from "./MonetizationIcon";

/** 08 // SETTLEMENT — Ledger scene behind; identity → wallets → on-chain stack + live ledger panel. */
export function Settlement() {
  const c = copy.home.settlement;
  return (
    <section
      id="settlement"
      data-scene="Ledger"
      aria-label={c.title}
      className="relative section-pad"
    >
      <BlueprintGrid cropMarks className="opacity-60" />
      <p className="sr-only">{c.sceneDescription}</p>

      <div className="container-site relative grid gap-16 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-6">
          <header className="flex flex-col gap-5">
            <Eyebrow>{c.eyebrow}</Eyebrow>
            <h2 className="t-h2 max-w-[20ch] text-balance text-text lg:text-[52px]">{c.title}</h2>
            <p className="max-w-[32ch] text-balance font-display text-[20px] font-medium italic leading-snug text-copper-soft lg:text-[24px]">
              {c.tagline}
            </p>
            <p className="t-body">{c.body}</p>
          </header>

          <div className="mt-12">
            <p className="t-label text-text-faint">{c.stackLabel}</p>
            <ol className="mt-4 border-l border-line">
              {c.stack.map((s, i) => (
                <li key={s.index} className="relative pb-8 pl-8 last:pb-0">
                  <span
                    aria-hidden="true"
                    className="absolute -left-[5px] top-[7px] h-[9px] w-[9px] rotate-45 border border-copper bg-bg"
                  />
                  <div className="glass flex items-start gap-5 border border-line p-5">
                    <span className="t-num pt-1 font-mono text-[12px] text-copper">{s.index}</span>
                    <div>
                      <h3 className="t-h3 text-text">{s.title}</h3>
                      <p className="mt-2 text-[15px] leading-relaxed text-text-dim">{s.body}</p>
                    </div>
                  </div>
                  {i < c.stack.length - 1 ? (
                    <span aria-hidden="true" className="t-label absolute bottom-1 left-8 text-text-faint">↓</span>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="lg:col-span-5 lg:col-start-8 lg:self-end">
          <SettlementLivePanel labels={c.live} />
        </div>

        {/* 07.1 Token economy & monetization */}
        <div className="glass relative border border-line p-6 md:p-10 lg:col-span-12 lg:mt-16">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-data-gold/60 to-transparent" />
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-5">
              <p className="t-label text-copper">{c.economy.label}</p>
              <h3 className="mt-4 max-w-[24ch] text-balance font-display text-[28px] font-medium leading-[1.12] text-text lg:text-[36px]">
                {c.economy.title}
              </h3>
              <p className="mt-4 max-w-[30ch] text-balance font-display text-[19px] font-medium italic leading-snug text-copper-soft lg:text-[22px]">
                {c.economy.tagline}
              </p>
            </div>
            <div className="lg:col-span-7 lg:pt-8">
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {c.economy.models.map((m, i) => (
                  <li
                    key={m}
                    className="group flex items-center gap-4 border border-line bg-bg/60 px-4 py-3.5 text-[14px] leading-snug text-text-dim transition-colors duration-300 hover:border-data-gold/50 hover:text-text"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-data-gold/40 bg-gradient-to-br from-data-gold/[0.16] via-copper/[0.06] to-transparent text-data-gold shadow-[inset_0_0_12px_rgb(var(--data-gold-rgb)/0.08)] transition-[box-shadow,border-color] duration-300 group-hover:border-data-gold/80 group-hover:shadow-[0_0_18px_rgb(var(--data-gold-rgb)/0.25)]">
                      <MonetizationIcon index={i} />
                    </span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
