import type { ComponentType } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pages } from "@/content/copy/pages";
import { insights, getInsight } from "@/content/insights/registry";
import { Eyebrow, CtaBand } from "@/components/ui";
import { Prose } from "@/components/sections/Prose";
import { pageMeta } from "@/components/sections/inner";

const c = pages.insights;

export const dynamicParams = false;

export function generateStaticParams() {
  return insights.map((i) => ({ slug: i.slug }));
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const item = getInsight(slug);
  if (!item) return {};
  return pageMeta({ title: item.meta.title, description: item.meta.description, path: `/insights/${slug}` });
}

export default async function InsightArticlePage({ params }: { params: Params }) {
  const { slug } = await params;
  const item = getInsight(slug);
  if (!item) notFound();

  const mod = (await import(`@/content/insights/${slug}.mdx`)) as { default: ComponentType };
  const Article = mod.default;

  return (
    <>
      <section data-scene="VolumeBreak" data-scene-variant="calm" className="relative pb-12 pt-36 md:pb-16 md:pt-44">
        <div className="container-site flex max-w-4xl flex-col gap-6">
          <Link href="/insights" className="t-label -my-2 w-fit py-2 text-text-dim md:my-0 md:py-0 transition-colors hover:text-copper">
            ← {c.article.back}
          </Link>
          <Eyebrow>{c.article.draftNotice}</Eyebrow>
          <h1 className="t-display text-balance text-text">{item.meta.title}</h1>
          <p className="t-body text-[17px] md:text-[20px]">{item.meta.description}</p>
          <dl className="t-label flex flex-wrap gap-x-8 gap-y-2 border-t border-line pt-5 text-text-faint">
            <div className="flex gap-2">
              <dt>{c.article.dateLabel}</dt>
              <dd className="t-num text-text-dim">
                <time dateTime={item.meta.date}>{item.meta.date}</time>
              </dd>
            </div>
            <div className="flex gap-2">
              <dt>{c.article.statusLabel}</dt>
              <dd className="text-copper">{item.meta.status}</dd>
            </div>
          </dl>
        </div>
      </section>

      <article className="relative pb-24 md:pb-32">
        <div className="container-site">
          <div className="glass border border-line px-5 py-10 md:px-12 md:py-14">
            <Prose className="mx-auto">
              <Article />
            </Prose>
          </div>
        </div>
      </article>

      <CtaBand title={c.cta.title} body={c.cta.body} />
    </>
  );
}
