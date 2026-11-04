import { pages } from "@/content/copy/pages";
import { PageHero, BracketPanel, CtaBand } from "@/components/ui";
import { InnerSection, pageMeta } from "@/components/sections/inner";

const c = pages.company;

export const metadata = pageMeta(c.meta);

export default function CompanyPage() {
  return (
    <>
      <PageHero scene="FlywheelScene" eyebrow={c.hero.eyebrow} title={c.hero.title} sub={c.hero.sub} />

      <InnerSection id="mission" eyebrow={c.mission.eyebrow} title={c.mission.title} tagline={c.mission.tagline} body={c.mission.body} />

      <InnerSection id="leadership" eyebrow={c.leadership.eyebrow} title={c.leadership.title} body={c.leadership.body}>
        <ul role="list" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
          {c.leadership.people.map((p) => (
            <li key={p.role} className="flex">
              <BracketPanel className="flex w-full flex-col gap-4">
                <div aria-hidden="true" className="aspect-square w-full border border-line bg-bg-elev-2 [background-image:linear-gradient(rgb(var(--line-rgb)/0.6)_1px,transparent_1px),linear-gradient(90deg,rgb(var(--line-rgb)/0.6)_1px,transparent_1px)] [background-size:20px_20px]" />
                <p className="t-label text-copper">{p.role}</p>
                <h3 className="t-h3 text-text">{p.name}</h3>
                <p className="text-[14px] text-text-dim">{p.bio}</p>
              </BracketPanel>
            </li>
          ))}
        </ul>
      </InnerSection>


      <CtaBand title={c.cta.title} body={c.cta.body} />
    </>
  );
}
