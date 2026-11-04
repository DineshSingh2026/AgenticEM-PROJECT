import { copy } from "@/content/copy";
import { BlueprintGrid, Eyebrow } from "@/components/ui";
import { SettlementLivePanel } from "./live/SettlementLivePanel";

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
            <p className="max-w-[32ch] text-balance font-display text-[20px] font-medium italic leading-snug text-copper-soft lg:text-[24px]">
              {c.kicker}
            </p>
            <h2 className="t-h2 max-w-[20ch] text-balance text-text">{c.title}</h2>
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

        {/* 07.1 Token economy & B2B monetization */}
        <div className="glass relative border border-line p-6 md:p-10 lg:col-span-12 lg:mt-16">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-data-gold/60 to-transparent" />
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-5">
              <p className="t-label text-copper">{c.economy.label}</p>
              <h3 className="mt-4 max-w-[18ch] text-balance font-display text-[30px] font-medium leading-[1.1] text-text lg:text-[40px]">
                {c.economy.title}
              </h3>
              <p className="mt-4 max-w-[30ch] text-balance font-display text-[19px] font-medium italic leading-snug text-copper-soft lg:text-[22px]">
                {c.economy.tagline}
              </p>
            </div>
            <div className="lg:col-span-7">
              <p className="t-body max-w-none">{c.economy.body}</p>
              <ul className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {c.economy.models.map((m) => (
                  <li key={m} className="flex items-center gap-3 border border-line bg-bg/60 px-4 py-3 text-[14px] text-text-dim">
                    <span aria-hidden="true" className="h-[7px] w-[7px] shrink-0 rotate-45 border border-data-gold" />
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
