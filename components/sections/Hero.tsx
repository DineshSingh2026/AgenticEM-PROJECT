import { copy } from "@/content/copy";
import { Eyebrow } from "@/components/ui";

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
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg/85 via-bg/50 to-transparent"
      />

      <div className="container-site relative z-10 flex flex-1 items-center pb-12 pt-28 md:pt-32 lg:pb-14 lg:pt-28">
        <div className="grid w-full grid-cols-12 gap-x-6">
          <div className="col-span-12 lg:col-span-10 xl:col-span-9">
            <Eyebrow>{c.eyebrow}</Eyebrow>
            <h1
              id={c.id}
              className="t-display mt-5 text-balance text-text lg:mt-6 lg:text-[70px] xl:text-[80px] 2xl:text-[88px]"
            >
              {c.title}
            </h1>
          </div>
          <div className="col-span-12 mt-6 md:col-span-10 lg:col-span-8 lg:mt-8 xl:col-span-7">
            <p className="t-body text-pretty lg:max-w-[68ch]">{c.sub}</p>
            <p className="t-label mt-6 text-text-faint lg:mt-8">{c.footnote}</p>
          </div>
        </div>
      </div>

      <p className="sr-only">{c.sceneAlt}</p>
    </section>
  );
}
