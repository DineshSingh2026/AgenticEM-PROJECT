import { pages } from "@/content/copy/pages";
import { PageHero, CodeTabs, BriefingForm, BracketPanel, Eyebrow } from "@/components/ui";
import { InnerSection, CardGrid, PointsPanel, SpecTable, pageMeta } from "@/components/sections/inner";

const c = pages.developers;

export const metadata = pageMeta(c.meta);

export default function DevelopersPage() {
  return (
    <>
      <PageHero scene="HeartbeatRing" eyebrow={c.hero.eyebrow} title={c.hero.title} sub={c.hero.sub} />

      <InnerSection eyebrow={c.overview.eyebrow} title={c.overview.title} body={c.overview.body}>
        <CardGrid items={c.overview.items} columns={3} />
      </InnerSection>

      <InnerSection eyebrow={c.auth.eyebrow} title={c.auth.title} body={c.auth.body} layout="split">
        <PointsPanel label={c.auth.label} points={c.auth.points} />
      </InnerSection>

      <InnerSection eyebrow={c.webhooks.eyebrow} title={c.webhooks.title} body={c.webhooks.body} layout="split">
        <PointsPanel label={c.webhooks.label} points={c.webhooks.points} />
      </InnerSection>

      <InnerSection eyebrow={c.events.eyebrow} title={c.events.title} body={c.events.body}>
        <SpecTable label={c.events.title} columns={c.events.columns} rows={c.events.rows} />
      </InnerSection>

      <InnerSection eyebrow={c.code.eyebrow} title={c.code.title} body={c.code.body}>
        <CodeTabs label={c.code.label} tabs={[...c.code.tabs]} />
      </InnerSection>

      <InnerSection eyebrow={c.links.eyebrow} title={c.links.title}>
        <CardGrid items={c.links.items} columns={2} />
      </InnerSection>

      <section id="sandbox" aria-labelledby="sandbox-title" className="section-pad relative scroll-mt-24">
        <div className="container-site grid gap-10 lg:grid-cols-12 lg:gap-6">
          <div className="flex flex-col gap-5 lg:col-span-5">
            <Eyebrow>{c.sandbox.eyebrow}</Eyebrow>
            <h2 id="sandbox-title" className="t-h2 max-w-[18ch] text-balance text-text">
              {c.sandbox.title}
            </h2>
            <p className="t-body">{c.sandbox.body}</p>
          </div>
          <BracketPanel className="p-5 md:p-8 lg:col-span-7">
            <BriefingForm variant="sandbox" />
          </BracketPanel>
        </div>
      </section>
    </>
  );
}
