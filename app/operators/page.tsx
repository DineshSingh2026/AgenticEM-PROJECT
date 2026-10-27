import { pages } from "@/content/copy/pages";
import { PageHero, StepRing, Faq, CtaBand } from "@/components/ui";
import { InnerSection, CardGrid, PointsPanel, pageMeta } from "@/components/sections/inner";

const c = pages.operators;

export const metadata = pageMeta(c.meta);

export default function OperatorsPage() {
  return (
    <>
      <PageHero scene="SplitWorld" eyebrow={c.hero.eyebrow} title={c.hero.title} sub={c.hero.sub} />

      <InnerSection eyebrow={c.segments.eyebrow} title={c.segments.title}>
        <CardGrid items={c.segments.items} columns={3} />
      </InnerSection>

      <InnerSection eyebrow={c.journey.eyebrow} title={c.journey.title}>
        <StepRing steps={[...c.journey.steps]} />
      </InnerSection>

      <InnerSection eyebrow={c.pilot.eyebrow} title={c.pilot.title} body={c.pilot.body} layout="split">
        <PointsPanel label={c.pilot.label} points={c.pilot.points} />
      </InnerSection>

      <InnerSection eyebrow={c.roi.eyebrow} title={c.roi.title} body={c.roi.body}>
        <CardGrid items={c.roi.items} columns={4} />
      </InnerSection>

      <InnerSection eyebrow={c.faq.eyebrow} title={c.faq.title} layout="split">
        <Faq items={[...c.faq.items]} />
      </InnerSection>

      <CtaBand title={c.cta.title} body={c.cta.body} />
    </>
  );
}
