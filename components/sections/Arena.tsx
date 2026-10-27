import { copy } from "@/content/copy";
import { SectionHeader } from "@/components/ui";
import { ArenaMatchFeed } from "./live/ArenaMatchFeed";

/** 09 // ARENA — ArenaGraph scene behind; format chips + live agent-to-agent match feed. */
export function Arena() {
  const c = copy.home.arena;
  return (
    <section id="arena" data-scene="ArenaGraph" aria-label={c.title} className="relative section-pad">
      <p className="sr-only">{c.sceneDescription}</p>

      <div className="container-site relative grid gap-16 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-6">
          <SectionHeader eyebrow={c.eyebrow} title={c.title} body={c.body} />

          <ul className="mt-10 flex flex-wrap gap-2">
            {c.chips.map((chip, i) => (
              <li
                key={chip}
                className="glass t-label inline-flex items-center gap-3 border border-line px-3 py-2 text-[11px] text-text transition-colors duration-300 ease-out hover:border-line-strong"
              >
                <span className="t-num text-copper">{String(i + 1).padStart(2, "0")}</span>
                <span aria-hidden="true" className="h-3 w-px bg-line-strong" />
                {chip}
              </li>
            ))}
          </ul>
        </div>

        {/* right side stays open so the pentagon graph reads through; feed sits low */}
        <div className="lg:col-span-4 lg:col-start-9 lg:self-end">
          <ArenaMatchFeed labels={c.feed} />
        </div>
      </div>
    </section>
  );
}
