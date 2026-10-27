import { copy } from "@/content/copy";
import { SectionHeader } from "@/components/ui";
import { ResilienceRing } from "./live/ResilienceRing";

/**
 * 11 // RESILIENCE — HeartbeatRing scene behind.
 * Header scrolls normally; the ring overlay lives in a 100svh sticky stage so its centre
 * matches the viewport-centred HeartbeatRing scene while the stage is pinned.
 */
export function Resilience() {
  const c = copy.home.resilience;
  return (
    <section id="resilience" data-scene="HeartbeatRing" aria-label={c.title} className="relative pt-24 lg:pt-40">
      <p className="sr-only">{c.sceneDescription}</p>

      <div className="container-site relative grid gap-10 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-7">
          <SectionHeader eyebrow={c.eyebrow} title={c.title} body={c.body} />
        </div>

        <dl className="glass t-label self-end border border-line text-[11px] lg:col-span-4 lg:col-start-9">
          {c.status.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 last:border-b-0">
              <dt className="text-text-faint">{s.key}:</dt>
              <dd className="flex items-center gap-2 text-text">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-data-green" />
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* sticky stage: 160svh tall track, 100svh pinned stage */}
      <div className="relative h-[160svh]">
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <ResilienceRing
            labels={{
              hubLabel: c.hubLabel,
              nodeAria: c.nodeAria,
              nodePrefix: c.nodePrefix,
              states: c.states,
              instructions: c.instructions,
            }}
          />
        </div>
      </div>
    </section>
  );
}
