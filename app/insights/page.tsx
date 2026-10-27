import Link from "next/link";
import { pages } from "@/content/copy/pages";
import { insights } from "@/content/insights/registry";
import { PageHero, BracketPanel, CtaBand } from "@/components/ui";
import { InnerSection, pageMeta } from "@/components/sections/inner";

const c = pages.insights;

export const metadata = pageMeta(c.meta);

export default function InsightsPage() {
  return (
    <>
      <PageHero scene="VolumeBreak" eyebrow={c.hero.eyebrow} title={c.hero.title} sub={c.hero.sub} />

      <InnerSection eyebrow={c.list.eyebrow} title={c.list.title} body={c.list.draftNote}>
        <ul role="list" className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {insights.map(({ slug, meta }) => (
            <li key={slug} className="flex">
              <BracketPanel as="article" className="group flex w-full flex-col gap-4 transition-colors duration-300 ease-out hover:border-line-strong">
                <p className="t-label flex items-center justify-between gap-4 text-text-faint">
                  <time dateTime={meta.date} className="t-num">
                    {meta.date}
                  </time>
                  <span className="text-copper">
                    {c.list.statusLabel}: {meta.status}
                  </span>
                </p>
                <h3 className="t-h3 text-text">
                  <Link href={`/insights/${slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
                    {meta.title}
                  </Link>
                </h3>
                <p className="flex-1 text-[15px] leading-relaxed text-text-dim">{meta.description}</p>
                <span aria-hidden="true" className="t-label text-copper transition-colors group-hover:text-copper-soft">
                  {c.list.readMore} →
                </span>
              </BracketPanel>
            </li>
          ))}
        </ul>
      </InnerSection>

      <CtaBand title={c.cta.title} body={c.cta.body} />
    </>
  );
}
