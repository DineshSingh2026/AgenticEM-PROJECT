import { products } from "@/content/copy/products";
import { PageHero, Eyebrow, CtaBand } from "@/components/ui";
import { InnerSection, pageMeta } from "@/components/sections/inner";
import { FeatureIcon, CategoryArt } from "@/components/sections/products/ProductArt";
import { cn } from "@/lib/cn";

const c = products;

export const metadata = pageMeta(c.meta);

const pad = (n: number) => String(n).padStart(2, "0");

const tile =
  "cap-tile group relative flex flex-col overflow-hidden border border-line bg-bg-elev/70 backdrop-blur-md [-webkit-backdrop-filter:blur(12px)] transition-[border-color,box-shadow,translate] duration-500 ease-out hover:-translate-y-1 hover:border-copper/50 hover:shadow-[0_18px_48px_-24px_rgb(var(--data-gold-rgb)/0.45)] motion-reduce:hover:translate-y-0";

function Brackets() {
  return (
    <>
      <span aria-hidden="true" className="pointer-events-none absolute -left-px -top-px z-10 h-2 w-2 border-l border-t border-copper" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-px -right-px z-10 h-2 w-2 border-b border-r border-copper" />
    </>
  );
}

function HoverGlow() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-data-gold/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
    />
  );
}

export default function ProductsPage() {
  const features = c.aggregation.features;
  const cats = c.portfolio.categories;

  return (
    <>
      <PageHero scene="Convergence" eyebrow={c.hero.eyebrow} title={c.hero.title} sub={c.hero.sub} />

      {/* 01.1 — aggregation platform features */}
      <InnerSection id="aggregation" eyebrow={c.aggregation.eyebrow} title={c.aggregation.title}>
        <ul role="list" className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <li key={f.key} className={cn(tile, "p-6 md:p-8")}>
              <Brackets />
              <div className="flex items-start justify-between gap-4">
                <span className="cap-art relative grid h-[72px] w-[72px] shrink-0 place-items-center border border-line transition-colors duration-500 group-hover:border-copper/50">
                  <FeatureIcon name={f.key} />
                </span>
                <span aria-hidden="true" className="t-num text-[11px] text-text-faint">
                  {pad(i + 1)} / {pad(features.length)}
                </span>
              </div>
              <h3 className="mt-8 font-display text-[22px] font-medium leading-snug text-text text-balance transition-colors duration-300 group-hover:text-copper-soft lg:text-[24px]">
                {f.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-text-dim">{f.body}</p>
              <HoverGlow />
            </li>
          ))}
        </ul>
      </InnerSection>

      {/* 01.2 — multi-category portfolio */}
      <section id="portfolio" aria-labelledby="portfolio-title" className="section-pad relative scroll-mt-24">
        <div className="container-site">
          <header className="grid gap-6 lg:grid-cols-12 lg:gap-6">
            <div className="flex flex-col gap-5 lg:col-span-6">
              <Eyebrow>{c.portfolio.eyebrow}</Eyebrow>
              <h2 id="portfolio-title" className="t-h2 max-w-[20ch] text-balance text-text">
                {c.portfolio.title}
              </h2>
            </div>
            <div className="flex flex-col gap-5 lg:col-span-6 lg:pt-[42px]">
              <p className="font-display text-[20px] font-medium leading-snug text-copper-soft text-balance md:text-[24px]">
                {c.portfolio.tagline}
              </p>
              <p className="t-body">{c.portfolio.body}</p>
            </div>
          </header>

          <ul role="list" className="mt-12 grid grid-cols-1 gap-3 md:mt-16 md:grid-cols-2 lg:grid-cols-3">
            {cats.map((cat, i) => (
              <li key={cat.key} className={tile} aria-labelledby={`cat-${cat.key}`}>
                <Brackets />
                <div className="cap-art relative h-[180px] overflow-hidden border-b border-line lg:h-[200px]">
                  <CategoryArt name={cat.key} />
                  <span aria-hidden="true" className="t-num absolute left-4 top-3 text-[11px] text-text-faint">
                    {pad(i + 1)} / {pad(cats.length)}
                  </span>
                </div>
                <div className="relative flex flex-1 flex-col p-5 md:p-6">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3
                      id={`cat-${cat.key}`}
                      className="font-display text-[20px] font-medium leading-snug text-text text-balance transition-colors duration-300 group-hover:text-copper-soft lg:text-[22px]"
                    >
                      {cat.title}
                    </h3>
                    <span className="t-label shrink-0 text-[11px] text-copper">
                      {pad(cat.games.length)} {c.portfolio.gamesLabel}
                    </span>
                  </div>
                  <ul role="list" className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5">
                    {cat.games.map((g) => (
                      <li
                        key={g}
                        className="inline-flex items-center gap-2 border border-line bg-bg/50 px-3 py-1.5 text-[13px] leading-none text-text-dim transition-colors duration-300 hover:border-copper/60 hover:text-text"
                      >
                        <span aria-hidden="true" className="h-1 w-1 shrink-0 rotate-45 bg-copper" />
                        {g}
                      </li>
                    ))}
                  </ul>
                  <HoverGlow />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
