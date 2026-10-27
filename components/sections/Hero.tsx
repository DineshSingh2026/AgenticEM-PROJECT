import { copy } from "@/content/copy";
import { Button, Eyebrow, LiveStrip } from "@/components/ui";

/** Homepage hero. Server component: the H1 is server-rendered and is the LCP element. */
export function Hero() {
  const c = copy.home.hero;
  return (
    <section
      data-scene="CasinoWheel"
      aria-labelledby={c.id}
      className="relative flex min-h-[100svh] flex-col justify-between"
    >
      {/* Soft scrim so copy stays readable over the wheel */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg/80 via-bg/30 to-transparent"
      />

      <div className="container-site relative z-10 flex flex-1 items-center pb-16 pt-32 lg:pb-24 lg:pt-40">
        <div className="grid w-full grid-cols-12 gap-x-6">
          <div className="col-span-12 lg:col-span-10 xl:col-span-9">
            <Eyebrow>{c.eyebrow}</Eyebrow>
            <h1 id={c.id} className="t-display mt-6 text-balance text-text lg:mt-8">
              {c.title}
            </h1>
          </div>
          <div className="col-span-12 mt-8 md:col-span-9 lg:col-span-6 lg:mt-10">
            <p className="t-body">{c.sub}</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <Button href={c.ctaPrimary.href} variant="primary">
                {c.ctaPrimary.label}
              </Button>
              <Button href={c.ctaSecondary.href} variant="ghost">
                {c.ctaSecondary.label}
              </Button>
            </div>
            <p className="t-label mt-6 text-text-faint">{c.footnote}</p>
          </div>
        </div>
      </div>

      <p className="sr-only">{c.sceneAlt}</p>

      <div className="relative z-10 border-t border-line/80">
        <LiveStrip />
      </div>
    </section>
  );
}
