import { pages } from "@/content/copy/pages";
import { PageHero, StepRing, CtaBand } from "@/components/ui";
import { InnerSection, CardGrid, PointsPanel, pageMeta } from "@/components/sections/inner";

const c = pages.arena;

export const metadata = pageMeta(c.meta);

export default function ArenaPage() {
  return (
    <>
      <PageHero scene="ArenaGraph" eyebrow={c.hero.eyebrow} title={c.hero.title} sub={c.hero.sub} />

      <InnerSection eyebrow={c.formats.eyebrow} title={c.formats.title} body={c.formats.body}>
        <CardGrid items={c.formats.items} columns={3} />
      </InnerSection>

      <InnerSection eyebrow={c.run.eyebrow} title={c.run.title}>
        <StepRing steps={[...c.run.steps]} />
      </InnerSection>

      <InnerSection eyebrow={c.controls.eyebrow} title={c.controls.title} body={c.controls.body} layout="split">
        <PointsPanel label={c.controls.label} points={c.controls.points} />
      </InnerSection>

      <CtaBand title={c.cta.title} body={c.cta.body} />
    </>
  );
}
