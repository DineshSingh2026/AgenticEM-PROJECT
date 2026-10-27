import { pages } from "@/content/copy/pages";
import features from "@/content/data/features.json";
import { PageHero, StepRing, FeatureValueTable, Faq, CtaBand } from "@/components/ui";
import { InnerSection, PointsPanel, pageMeta } from "@/components/sections/inner";

const c = pages.platform;

export const metadata = pageMeta(c.meta);

export default function PlatformPage() {
  return (
    <>
      <PageHero scene="Convergence" eyebrow={c.hero.eyebrow} title={c.hero.title} sub={c.hero.sub} />

      {c.capabilities.map((cap) => (
        <InnerSection key={cap.title} eyebrow={cap.eyebrow} title={cap.title} body={cap.body} layout="split">
          <PointsPanel label={cap.label} points={cap.points} />
        </InnerSection>
      ))}

      <InnerSection eyebrow={c.lifecycle.eyebrow} title={c.lifecycle.title} body={c.lifecycle.body}>
        <StepRing steps={[...c.lifecycle.steps]} />
      </InnerSection>

      <InnerSection eyebrow={c.features.eyebrow} title={c.features.title} body={c.features.body}>
        <FeatureValueTable rows={features} />
      </InnerSection>

      <InnerSection eyebrow={c.faq.eyebrow} title={c.faq.title} layout="split">
        <Faq items={[...c.faq.items]} />
      </InnerSection>

      <CtaBand title={c.cta.title} body={c.cta.body} />
    </>
  );
}
