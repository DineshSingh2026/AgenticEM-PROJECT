import type { ReactNode } from "react";
import type { SceneName } from "@/lib/scene-store";
import { Eyebrow } from "./Eyebrow";

export interface PageHeroProps {
  scene: SceneName;
  eyebrow: string;
  title: string;
  sub: string;
  children?: ReactNode;
}

/** Calm-variant inner-page hero. The H1 is server-rendered and is the LCP element. */
export function PageHero({ scene, eyebrow, title, sub, children }: PageHeroProps) {
  return (
    <section data-scene={scene} data-scene-variant="calm" className="relative flex min-h-[80vh] items-end pb-20 pt-36 lg:pb-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg/70"
      />
      <div className="container-site relative">
        <div className="flex max-w-4xl flex-col gap-6">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="t-display text-balance text-text">{title}</h1>
          <p className="t-body text-[17px] md:text-[20px]">{sub}</p>
          {children ? <div className="mt-4 flex flex-wrap gap-3">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
