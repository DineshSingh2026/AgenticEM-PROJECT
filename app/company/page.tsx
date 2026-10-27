import { pages } from "@/content/copy/pages";
import { PageHero, StepRing, BracketPanel, CtaBand } from "@/components/ui";
import { InnerSection, CardGrid, PointsPanel, pageMeta } from "@/components/sections/inner";

const c = pages.company;

export const metadata = pageMeta(c.meta);

export default function CompanyPage() {
  return (
    <>
      <PageHero scene="FlywheelScene" eyebrow={c.hero.eyebrow} title={c.hero.title} sub={c.hero.sub} />

      <InnerSection id="mission" eyebrow={c.mission.eyebrow} title={c.mission.title} body={c.mission.body}>
        <CardGrid items={c.mission.principles} columns={3} />
      </InnerSection>

      <InnerSection eyebrow={c.flywheel.eyebrow} title={c.flywheel.title}>
        <StepRing steps={[...c.flywheel.steps]} />
      </InnerSection>

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

      <InnerSection id="group" eyebrow={c.group.eyebrow} title={c.group.title} body={c.group.body}>
        <CardGrid items={c.group.items} columns={3} />
      </InnerSection>

      <InnerSection id="careers" eyebrow={c.careers.eyebrow} title={c.careers.title} body={c.careers.body} layout="split">
        <PointsPanel label={c.careers.label} points={c.careers.points} />
        <p className="mt-6 flex flex-col gap-1">
          <span className="t-label text-text-faint">{c.careers.emailLabel}</span>
          <span className="font-mono text-[14px] text-text">{c.careers.email}</span>
        </p>
      </InnerSection>

      <CtaBand title={c.cta.title} body={c.cta.body} />
    </>
  );
}
