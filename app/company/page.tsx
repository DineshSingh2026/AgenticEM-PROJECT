import { pages } from "@/content/copy/pages";
import { PageHero, CtaBand } from "@/components/ui";
import { InnerSection, pageMeta } from "@/components/sections/inner";

const c = pages.company;

export const metadata = pageMeta(c.meta);

export default function CompanyPage() {
  return (
    <>
      <PageHero scene="FlywheelScene" eyebrow={c.hero.eyebrow} title={c.hero.title} />

      <InnerSection id="mission" eyebrow={c.mission.eyebrow} title={c.mission.title} tagline={c.mission.tagline} body={c.mission.body} />

      <CtaBand title={c.cta.title} body={c.cta.body} />
    </>
  );
}
