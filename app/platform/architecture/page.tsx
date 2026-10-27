import { pages } from "@/content/copy/pages";
import { PageHero, Faq, CtaBand, BracketPanel } from "@/components/ui";
import { InnerSection, CardGrid, SpecTable, DataFlowDiagram, pageMeta } from "@/components/sections/inner";

const c = pages.architecture;

export const metadata = pageMeta(c.meta);

export default function ArchitecturePage() {
  return (
    <>
      <PageHero scene="ExplodedStack" eyebrow={c.hero.eyebrow} title={c.hero.title} sub={c.hero.sub} />

      <InnerSection eyebrow={c.layers.eyebrow} title={c.layers.title} body={c.layers.body}>
        <ol className="flex flex-col gap-4">
          {c.layers.items.map((layer) => (
            <li key={layer.title}>
              <BracketPanel label={layer.label} className="grid gap-6 md:grid-cols-12 md:items-start">
                <h3 className="t-h3 text-text md:col-span-4">{layer.title}</h3>
                <p className="text-[15px] leading-relaxed text-text-dim md:col-span-5">{layer.body}</p>
                <ul role="list" className="flex flex-col gap-2 md:col-span-3">
                  {layer.points.map((p) => (
                    <li key={p} className="t-label text-text-dim">
                      {p}
                    </li>
                  ))}
                </ul>
              </BracketPanel>
            </li>
          ))}
        </ol>
      </InnerSection>

      <InnerSection eyebrow={c.foundations.eyebrow} title={c.foundations.title}>
        <CardGrid items={c.foundations.items} columns={3} />
      </InnerSection>

      <InnerSection eyebrow={c.flow.eyebrow} title={c.flow.title} body={c.flow.body}>
        <DataFlowDiagram nodes={c.flow.nodes} label={c.flow.diagramLabel} title={c.flow.diagramTitle} desc={c.flow.diagramDesc} />
      </InnerSection>

      <InnerSection eyebrow={c.targets.eyebrow} title={c.targets.title} body={c.targets.body}>
        <SpecTable label={c.targets.label} columns={c.targets.columns} rows={c.targets.rows} />
      </InnerSection>

      <InnerSection eyebrow={c.deployment.eyebrow} title={c.deployment.title} body={c.deployment.body}>
        <CardGrid items={c.deployment.items} columns={3} />
      </InnerSection>

      <InnerSection eyebrow={c.faq.eyebrow} title={c.faq.title} layout="split">
        <Faq items={[...c.faq.items]} />
      </InnerSection>

      <CtaBand title={c.cta.title} body={c.cta.body} />
    </>
  );
}
