import type { Metadata } from "next";
import type { ReactNode } from "react";
import { copy } from "@/content/copy";
import {
  AlertRow,
  BlueprintGrid,
  BracketPanel,
  BriefingForm,
  Button,
  CodeTabs,
  CompareTable,
  CtaBand,
  Eyebrow,
  Faq,
  FeatureValueTable,
  LiveStrip,
  Logo,
  PageHero,
  ScenePoster,
  SectionHeader,
  SimLabel,
  Sparkline,
  StatTicker,
  StepRing,
} from "@/components/ui";
import { SCENE_NAMES } from "@/lib/scene-store";

export const metadata: Metadata = {
  title: copy.site.lab.title,
  robots: { index: false, follow: false },
};

/* Internal fixture data for previewing components (not user-facing copy). */
const DEMO = {
  compare: {
    columns: ["", "Human games", "Agentic games"] as [string, string, string],
    rows: [
      { label: "Speed", a: "Human-paced", b: "Machine-speed execution" },
      { label: "Volume", a: "Linear scale", b: "Exponential scale" },
      { label: "Infrastructure", a: "Traditional server architecture", b: "Casino Verse OS" },
    ],
  },
  features: [
    { feature: "High-volume game execution", benefit: "Run and analyse substantially more game activity.", detail: "Deterministic compute processes every bet and settlement with sub-second latency.", chart: [3, 4, 4, 6, 7, 9, 12, 16] },
    { feature: "Real-time gameplay event capture", benefit: "Instant visibility into game activity and financial performance.", detail: "Every round is captured as a structured event and streamed to analytics.", chart: [5, 6, 6, 7, 8, 8, 9, 11] },
  ],
  steps: [
    { index: "01", title: "Trigger", body: "Game-state delivery." },
    { index: "02", title: "Compute", body: "Agent reasoning and evaluation." },
    { index: "03", title: "Action", body: "Independent decision or bet." },
    { index: "04", title: "Settlement", body: "On-chain transaction processing." },
    { index: "05", title: "Insight", body: "Real-time event capture and analytics." },
  ],
  code: [
    { lang: "TS", code: 'const round = await casinoverse.rounds.create({ table: "bj-07" });' },
    { lang: "Python", code: 'round = casinoverse.rounds.create(table="bj-07")' },
    { lang: "Rust", code: 'let round = casinoverse.rounds().create("bj-07").await?;' },
  ],
  faq: [
    { q: "Who is Casino Verse OS for?", a: "Licensed casino and iGaming operators, B2B game studios and their technical partners." },
    { q: "Can we pilot before committing?", a: "Yes. Pilots run against agreed performance benchmarks." },
  ],
};

function Block({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-6 border-t border-line py-12">
      <p className="t-label text-copper">{name}</p>
      {children}
    </section>
  );
}

export default function UiLabPage() {
  return (
    <>
      <PageHero scene="Convergence" eyebrow={copy.site.lab.eyebrow} title={copy.site.lab.title} sub={copy.site.lab.sub}>
        <Button href="/contact">{copy.site.nav.cta.label}</Button>
        <Button variant="ghost" href="/platform">
          {copy.site.nav.platform.label}
        </Button>
      </PageHero>
      <LiveStrip />
      <div className="container-site pb-24">
        <Block name="Logo (horizontal / stacked / emblem)">
          <div className="flex flex-wrap items-end gap-12">
            <Logo />
            <Logo variant="stacked" />
            <Logo variant="emblem" className="h-16" />
          </div>
          <p className="t-label text-text-faint">{copy.site.brand.tagline}</p>
        </Block>
        <Block name="Button">
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Block>
        <Block name="Eyebrow / SectionHeader / SimLabel">
          <Eyebrow>03 // INTELLIGENCE_LAYER</Eyebrow>
          <SectionHeader eyebrow="04 // ARCHITECTURE" title="A unified stack built for machine-speed execution." body="Section header body copy." />
          <SectionHeader align="center" title="Centered header" body="Centered body copy." />
          <SimLabel />
        </Block>
        <Block name="BracketPanel / BlueprintGrid">
          <div className="relative grid h-80 place-items-center border border-line">
            <BlueprintGrid />
            <BracketPanel label="PANEL_LABEL" className="max-w-sm">
              <p className="text-text-dim">Bracket panel content.</p>
            </BracketPanel>
          </div>
        </Block>
        <Block name="StatTicker / Sparkline">
          <div className="flex flex-wrap gap-10">
            <StatTicker value={1284000} label="INT" />
            <StatTicker value={13350000} format="compact" label="COMPACT" />
            <StatTicker value={153700} format="usd" label="USD" />
            <StatTicker value={42} format="ms" label="MS" />
            <StatTicker value={2.3} format="pct" label="PCT" />
            <Sparkline data={[3, 5, 4, 6, 8, 7, 9, 12, 10, 13, 12, 15]} />
            <Sparkline data={[9, 8, 8, 7, 9, 6, 5, 6, 4, 5, 3, 4]} color="var(--data-red)" />
          </div>
        </Block>
        <Block name="CompareTable">
          <CompareTable columns={DEMO.compare.columns} rows={DEMO.compare.rows} />
        </Block>
        <Block name="FeatureValueTable">
          <FeatureValueTable rows={DEMO.features} />
        </Block>
        <Block name="StepRing">
          <StepRing steps={DEMO.steps} active={2} />
          <StepRing steps={DEMO.steps.slice(0, 3)} orientation="column" active={0} />
        </Block>
        <Block name="AlertRow">
          <BracketPanel label="SUSPICIOUS_ACTIVITY" className="max-w-xl">
            <AlertRow rule="Collusion signal" severity="high" agentId="agt_9f2" time="12:04:31" score={0.94} />
            <AlertRow rule="Velocity spike" severity="med" agentId="agt_1c4" time="12:04:12" score={0.71} />
            <AlertRow rule="Multiple login attempts" severity="low" agentId="agt_77a" time="12:03:58" />
          </BracketPanel>
        </Block>
        <Block name="CodeTabs">
          <CodeTabs tabs={DEMO.code} />
        </Block>
        <Block name="Faq">
          <Faq items={DEMO.faq} />
        </Block>
        <Block name="BriefingForm (sandbox)">
          <BracketPanel className="max-w-3xl">
            <BriefingForm variant="sandbox" />
          </BracketPanel>
        </Block>
        <Block name="ScenePoster">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {SCENE_NAMES.map((s) => (
              <div key={s} className="flex flex-col gap-2">
                <div className="relative aspect-[16/10] border border-line">
                  <ScenePoster scene={s} />
                </div>
                <span className="t-label text-text-faint">{s}</span>
              </div>
            ))}
          </div>
        </Block>
      </div>
      <CtaBand />
    </>
  );
}
