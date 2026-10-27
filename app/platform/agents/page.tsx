import { pages } from "@/content/copy/pages";
import traces from "@/content/data/reasoning-traces.json";
import { PageHero, StepRing, CompareTable, BracketPanel, Faq, CtaBand } from "@/components/ui";
import { InnerSection, CardGrid, pageMeta } from "@/components/sections/inner";

const c = pages.agents;

export const metadata = pageMeta(c.meta);

type Phase = keyof typeof c.traces.phaseLabels;
const isPhase = (p: string): p is Phase => p in c.traces.phaseLabels;

export default function AgentsPage() {
  const [c0, c1, c2] = c.compare.columns;
  return (
    <>
      <PageHero scene="AgentField" eyebrow={c.hero.eyebrow} title={c.hero.title} sub={c.hero.sub} />

      <InnerSection eyebrow={c.loop.eyebrow} title={c.loop.title} body={c.loop.body}>
        <StepRing steps={[...c.loop.steps]} />
      </InnerSection>

      <InnerSection eyebrow={c.compare.eyebrow} title={c.compare.title}>
        <CompareTable columns={[c0, c1, c2]} rows={[...c.compare.rows]} />
      </InnerSection>

      <InnerSection eyebrow={c.traces.eyebrow} title={c.traces.title} body={c.traces.body}>
        <ul role="list" className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          {traces.map((t) => (
            <li key={t.preset} className="flex">
              <BracketPanel label={c.traces.panelLabel} className="flex w-full flex-col gap-5">
                <h3 className="t-h3 text-text">{t.label}</h3>
                <div className="border-y border-line py-4">
                  <p className="t-label mb-2 text-text-faint">{c.traces.stateLabel}</p>
                  <p className="font-mono text-[13px] leading-relaxed text-text">{t.state}</p>
                </div>
                <ol className="flex flex-col gap-4">
                  {t.steps.map((s) => (
                    <li key={s.phase} className="grid grid-cols-[92px_1fr] gap-3">
                      <span className="t-label pt-[2px] text-copper">{isPhase(s.phase) ? c.traces.phaseLabels[s.phase] : s.phase}</span>
                      <span
                        className={
                          s.phase === "execute"
                            ? "font-mono text-[13px] leading-relaxed text-text"
                            : "text-[14px] leading-relaxed text-text-dim"
                        }
                      >
                        {s.text}
                      </span>
                    </li>
                  ))}
                </ol>
              </BracketPanel>
            </li>
          ))}
        </ul>
      </InnerSection>

      <InnerSection eyebrow={c.formats.eyebrow} title={c.formats.title} body={c.formats.body}>
        <CardGrid items={c.formats.items} columns={4} />
      </InnerSection>

      <InnerSection eyebrow={c.guardrails.eyebrow} title={c.guardrails.title} body={c.guardrails.body}>
        <CardGrid items={c.guardrails.items} columns={2} />
      </InnerSection>

      <InnerSection eyebrow={c.faq.eyebrow} title={c.faq.title} layout="split">
        <Faq items={[...c.faq.items]} />
      </InnerSection>

      <CtaBand title={c.cta.title} body={c.cta.body} />
    </>
  );
}
