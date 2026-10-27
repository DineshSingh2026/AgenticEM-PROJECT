import { copy } from "@/content/copy";
import { SectionHeader } from "@/components/ui";
import { cn } from "@/lib/cn";

/**
 * Desktop: steps sit clockwise on a 3×3 grid around an open centre (where the FlywheelScene wheel shows through).
 * DOM order stays 1 → 4 for reading order; placement is purely visual.
 */
const PLACEMENT = [
  "lg:col-start-1 lg:row-start-1", // 01 top-left
  "lg:col-start-3 lg:row-start-1", // 02 top-right
  "lg:col-start-3 lg:row-start-3", // 03 bottom-right
  "lg:col-start-1 lg:row-start-3", // 04 bottom-left
] as const;

const ARROWS = [
  { glyph: "→", cls: "lg:col-start-2 lg:row-start-1" },
  { glyph: "↓", cls: "lg:col-start-3 lg:row-start-2" },
  { glyph: "←", cls: "lg:col-start-2 lg:row-start-3" },
  { glyph: "↑", cls: "lg:col-start-1 lg:row-start-2" },
] as const;

/** 12 // FLYWHEEL — FlywheelScene behind; 4 steps in a closed loop, fully readable without the scene. */
export function Flywheel() {
  const c = copy.home.flywheel;
  return (
    <section id="flywheel" data-scene="FlywheelScene" aria-label={c.title} className="relative section-pad">
      <p className="sr-only">{c.sceneDescription}</p>

      <div className="container-site relative">
        <SectionHeader eyebrow={c.eyebrow} title={c.title} align="center" className="mx-auto" />

        <div className="relative mt-16 lg:mt-24">
          <ol className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(180px,24vw)_minmax(0,1fr)] lg:grid-rows-[auto_minmax(140px,16vw)_auto] lg:gap-0">
            {c.steps.map((s, i) => (
              <li key={s.index} className={cn("relative", PLACEMENT[i])}>
                <article className="glass relative h-full border border-line p-6 transition-colors duration-300 ease-out hover:border-line-strong md:p-8">
                  <span aria-hidden="true" className="pointer-events-none absolute -left-px -top-px h-2 w-2 border-l border-t border-copper" />
                  <span aria-hidden="true" className="pointer-events-none absolute -bottom-px -right-px h-2 w-2 border-b border-r border-copper" />
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="t-num font-mono text-[40px] font-medium leading-none text-copper/90 md:text-[48px]">{s.index}</span>
                    <span aria-hidden="true" className="h-px flex-1 bg-line" />
                  </div>
                  <h3 className="t-h3 mt-6 text-text">{s.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-text-dim md:text-[16px]">{s.body}</p>
                </article>
                {/* mobile connector */}
                <span aria-hidden="true" className="t-label flex justify-center pt-4 text-copper lg:hidden">
                  {i < c.steps.length - 1 ? "↓" : "↺"}
                </span>
              </li>
            ))}

            {ARROWS.map((a) => (
              <li
                key={a.glyph}
                aria-hidden="true"
                role="presentation"
                className={cn("hidden items-center justify-center font-mono text-[20px] text-copper lg:flex", a.cls)}
              >
                <span className="flex items-center gap-3">
                  {a.glyph === "→" || a.glyph === "←" ? <span className="h-px w-10 bg-copper/40" /> : null}
                  {a.glyph}
                  {a.glyph === "→" || a.glyph === "←" ? <span className="h-px w-10 bg-copper/40" /> : null}
                </span>
              </li>
            ))}

            <li
              aria-hidden="true"
              role="presentation"
              className="hidden items-center justify-center lg:col-start-2 lg:row-start-2 lg:flex"
            >
              <span className="t-label text-[10px] text-text-faint">{c.loopLabel}</span>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
