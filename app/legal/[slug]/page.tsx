import type { ComponentType } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pages } from "@/content/copy/pages";
import { Eyebrow } from "@/components/ui";
import { Prose } from "@/components/sections/Prose";
import { pageMeta } from "@/components/sections/inner";

const c = pages.legal;

export const dynamicParams = false;

export function generateStaticParams() {
  return c.docs.map((d) => ({ slug: d.slug }));
}

type Params = Promise<{ slug: string }>;

const getDoc = (slug: string) => c.docs.find((d) => d.slug === slug);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) return {};
  return pageMeta({ title: doc.title, description: doc.description, path: `/legal/${slug}` });
}

export default async function LegalPage({ params }: { params: Params }) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();

  const mod = (await import(`@/content/legal/${slug}.mdx`)) as { default: ComponentType };
  const Body = mod.default;

  return (
    <>
      <section data-scene="Ledger" data-scene-variant="calm" className="relative pb-10 pt-36 md:pt-44">
        <div className="container-site flex max-w-4xl flex-col gap-6">
          <Eyebrow>{`${c.eyebrow} // ${doc.slug.toUpperCase().replace(/-/g, "_")}`}</Eyebrow>
          <h1 className="t-display text-balance text-text">{doc.title}</h1>
          <p className="t-label text-copper">{c.notice}</p>
        </div>
      </section>
      <article className="relative pb-24 md:pb-32">
        <div className="container-site">
          <div className="glass border border-line px-5 py-10 md:px-12 md:py-14">
            <Prose>
              <Body />
            </Prose>
          </div>
        </div>
      </article>
    </>
  );
}
