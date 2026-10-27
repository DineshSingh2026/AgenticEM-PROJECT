import { copy } from "@/content/copy";
import { BlueprintGrid, SectionHeader } from "@/components/ui";
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
          <SectionHeader eyebrow={c.eyebrow} title={c.title} body={c.body} />

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
      </div>
    </section>
  );
}
