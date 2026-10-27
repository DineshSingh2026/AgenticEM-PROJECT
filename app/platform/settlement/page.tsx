import { pages } from "@/content/copy/pages";
import { PageHero, Faq, CtaBand } from "@/components/ui";
import { InnerSection, CardGrid, PointsPanel, SpecTable, pageMeta } from "@/components/sections/inner";

const c = pages.settlement;

export const metadata = pageMeta(c.meta);

export default function SettlementPage() {
  const splits = [c.wallets, c.ledger, c.reconciliation] as const;
  return (
    <>
      <PageHero scene="Ledger" eyebrow={c.hero.eyebrow} title={c.hero.title} sub={c.hero.sub} />

      <InnerSection eyebrow={c.identity.eyebrow} title={c.identity.title} body={c.identity.body}>
        <CardGrid items={c.identity.items} columns={3} />
      </InnerSection>

      {splits.map((s) => (
        <InnerSection key={s.title} eyebrow={s.eyebrow} title={s.title} body={s.body} layout="split">
          <PointsPanel label={s.label} points={s.points} />
        </InnerSection>
      ))}

      <InnerSection eyebrow={c.networks.eyebrow} title={c.networks.title} body={c.networks.body}>
        <SpecTable label={c.networks.title} columns={c.networks.columns} rows={c.networks.rows} />
      </InnerSection>

      <InnerSection eyebrow={c.faq.eyebrow} title={c.faq.title} layout="split">
        <Faq items={[...c.faq.items]} />
      </InnerSection>

      <CtaBand title={c.cta.title} body={c.cta.body} />
    </>
  );
}
