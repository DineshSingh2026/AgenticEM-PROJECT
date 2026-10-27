import { copy } from "@/content/copy";
import { BracketPanel, BriefingForm, SectionHeader } from "@/components/ui";

/** 14 // BRIEFING — SplitWorld scene behind; closing statement + operator briefing form. */
export function FinalCta() {
  const c = copy.home.finalCta;
  return (
    <section id="briefing" data-scene="SplitWorld" aria-label={c.title} className="relative section-pad">
      <p className="sr-only">{c.sceneDescription}</p>

      <div className="container-site relative grid gap-12 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-5 lg:self-center">
          <SectionHeader eyebrow={c.eyebrow} title={c.title} body={c.body} />
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <BracketPanel label={c.panelLabel} className="glass p-6 md:p-10">
            <BriefingForm variant="briefing" />
          </BracketPanel>
        </div>
      </div>
    </section>
  );
}
