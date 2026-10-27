import { pages } from "@/content/copy/pages";
import { PageHero, BracketPanel, BriefingForm, SectionHeader } from "@/components/ui";
import { pageMeta } from "@/components/sections/inner";

const c = pages.contact;

export const metadata = pageMeta(c.meta);

export default function ContactPage() {
  const d = c.details;
  const rows = [
    { label: d.responseLabel, value: d.response },
    { label: d.emailLabel, value: d.email },
    { label: d.addressLabel, value: d.address },
  ];
  return (
    <>
      <PageHero scene="SplitWorld" eyebrow={c.hero.eyebrow} title={c.hero.title} sub={c.hero.sub} />

      <section id="request" className="section-pad relative scroll-mt-24">
        <div className="container-site grid gap-10 lg:grid-cols-12 lg:gap-6">
          <div className="flex flex-col gap-10 lg:col-span-5">
            <SectionHeader eyebrow={c.form.eyebrow} title={c.form.title} body={c.form.body} />
            <BracketPanel label={d.label}>
              <dl className="flex flex-col">
                {rows.map((r) => (
                  <div key={r.label} className="flex flex-col gap-1 border-b border-line py-4 first:pt-0 last:border-b-0 last:pb-0">
                    <dt className="t-label text-text-faint">{r.label}</dt>
                    <dd className="font-mono text-[14px] text-text">{r.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="t-label mt-6 text-text-faint">{d.note}</p>
            </BracketPanel>
          </div>
          <BracketPanel className="p-5 md:p-8 lg:col-span-7">
            <BriefingForm variant="briefing" />
          </BracketPanel>
        </div>
      </section>
    </>
  );
}
