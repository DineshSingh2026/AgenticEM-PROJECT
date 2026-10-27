import { pages } from "@/content/copy/pages";
import radar from "@/content/data/risk-radar.json";
import { PageHero, BracketPanel, Sparkline, StepRing, AlertRow, Faq, CtaBand } from "@/components/ui";
import { InnerSection, CardGrid, pageMeta } from "@/components/sections/inner";

const c = pages.risk;

export const metadata = pageMeta(c.meta);

const severityDot = {
  low: "bg-steel",
  med: "bg-data-gold",
  high: "bg-data-red",
} as const;

export default function RiskPage() {
  const maxPct = Math.max(...radar.map((r) => r.pct));
  return (
    <>
      <PageHero scene="AnomalyStream" eyebrow={c.hero.eyebrow} title={c.hero.title} sub={c.hero.sub} />

      <InnerSection eyebrow={c.radar.eyebrow} title={c.radar.title} body={c.radar.body} layout="split">
        <BracketPanel label={c.radar.label} className="p-6 md:p-8">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">{c.radar.label}</caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">{c.radar.title}</th>
                <th scope="col">{c.radar.shareLabel}</th>
              </tr>
            </thead>
            <tbody>
              {radar.map((r) => (
                <tr key={r.label} className="border-b border-line last:border-b-0">
                  <th scope="row" className="w-[44%] py-3 pr-4 text-[14px] font-normal text-text">
                    {r.label}
                  </th>
                  <td className="py-3">
                    <div className="flex items-center gap-4">
                      <span aria-hidden="true" className="relative h-1 flex-1 bg-line">
                        <span
                          className="absolute inset-y-0 left-0 bg-data-red/80"
                          style={{ width: `${(r.pct / maxPct) * 100}%` }}
                        />
                      </span>
                      <span className="t-num w-12 text-right text-[13px] text-text">{r.pct.toFixed(1)}%</span>
                      <Sparkline data={r.spark} className="hidden h-6 w-20 sm:block" color="var(--data-red)" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </BracketPanel>
      </InnerSection>

      <InnerSection eyebrow={c.rules.eyebrow} title={c.rules.title} body={c.rules.body}>
        <ul role="list" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
          {c.rules.items.map((r) => (
            <li key={r.rule} className="flex">
              <BracketPanel className="flex w-full flex-col gap-3">
                <p className="t-label flex items-center gap-2 text-text-faint">
                  <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${severityDot[r.severity]}`} />
                  {c.rules.severityLabel}: {c.rules.severityNames[r.severity]}
                </p>
                <h3 className="t-h3 text-text">{r.rule}</h3>
                <p className="text-[15px] leading-relaxed text-text-dim">{r.body}</p>
              </BracketPanel>
            </li>
          ))}
        </ul>
      </InnerSection>

      <InnerSection eyebrow={c.investigation.eyebrow} title={c.investigation.title} body={c.investigation.body}>
        <StepRing steps={[...c.investigation.steps]} />
        <BracketPanel label={c.investigation.sampleLabel} className="mt-10">
          <div className="flex flex-col">
            {c.investigation.sample.map((a) => (
              <AlertRow key={a.agentId} rule={a.rule} severity={a.severity} agentId={a.agentId} time={a.time} score={a.score} />
            ))}
          </div>
        </BracketPanel>
      </InnerSection>

      <InnerSection eyebrow={c.approval.eyebrow} title={c.approval.title} body={c.approval.body}>
        <CardGrid items={c.approval.items} columns={4} />
      </InnerSection>

      <InnerSection eyebrow={c.exports.eyebrow} title={c.exports.title} body={c.exports.body}>
        <CardGrid items={c.exports.items} columns={3} />
      </InnerSection>

      <InnerSection eyebrow={c.faq.eyebrow} title={c.faq.title} layout="split">
        <Faq items={[...c.faq.items]} />
      </InnerSection>

      <CtaBand title={c.cta.title} body={c.cta.body} />
    </>
  );
}
