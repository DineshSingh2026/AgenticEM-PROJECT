import { pages } from "@/content/copy/pages";
import { PageHero, CtaBand } from "@/components/ui";
import { InnerSection, PointsPanel, SpecTable, pageMeta } from "@/components/sections/inner";

const c = pages.trust;

export const metadata = pageMeta(c.meta);

export default function TrustPage() {
  return (
    <>
      <PageHero scene="Ledger" eyebrow={c.hero.eyebrow} title={c.hero.title} sub={c.hero.sub} />

      <InnerSection id="policy" eyebrow={c.policy.eyebrow} title={c.policy.title} body={c.policy.body} layout="split">
        <PointsPanel label={c.policy.label} points={c.policy.points} />
      </InnerSection>

      {c.sections.map((s) => (
        <InnerSection key={s.id} id={s.id} eyebrow={s.eyebrow} title={s.title} body={s.body} layout="split">
          <PointsPanel label={s.label} points={s.points} />
        </InnerSection>
      ))}

      <InnerSection id="certification" eyebrow={c.certifications.eyebrow} title={c.certifications.title} body={c.certifications.body}>
        <SpecTable label={c.certifications.title} columns={c.certifications.columns} rows={c.certifications.rows} />
      </InnerSection>

      <CtaBand title={c.cta.title} body={c.cta.body} />
    </>
  );
}
