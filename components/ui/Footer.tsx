import Link from "next/link";
import { copy } from "@/content/copy";
import { BlueprintGrid } from "./BlueprintGrid";
import { Logo } from "./Logo";

export function Footer() {
  const f = copy.site.footer;
  const year = new Date().getFullYear();
  return (
    <footer aria-label={f.ariaLabel} className="relative z-10 overflow-hidden border-t border-line bg-bg">
      <BlueprintGrid className="opacity-60" />
      <div className="container-site relative py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-6">
          <div className="flex flex-col gap-5 lg:col-span-4">
            <Link href="/" aria-label={copy.site.brand.homeLabel} className="-ml-2 w-fit py-1">
              <Logo variant="stacked" decorative className="h-32 sm:h-36" />
            </Link>
            <p className="sr-only">{copy.site.brand.tagline}</p>
            <p className="max-w-[36ch] text-[15px] leading-relaxed text-text-dim">{copy.site.brand.mission}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:col-span-8 lg:grid-cols-5">
            {f.columns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <p className="t-label mb-4 text-text-faint">{col.title}</p>
                <ul className="flex flex-col gap-1 md:gap-3">
                  {col.links.map((l) => (
                    <li key={l.href + l.label}>
                      <Link href={l.href} className="inline-block py-2 text-[14px] text-text-dim md:py-0 transition-colors duration-200 ease-out hover:text-text">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <div className="t-label mt-16 flex flex-col gap-3 border-t border-line pt-6 text-[11px] text-text-faint md:flex-row md:flex-wrap md:items-center md:gap-x-8">
          <span>
            {f.copyright} {year}
          </span>
          <span>{f.address}</span>
          <span>{copy.site.forLicensedOperators}</span>
          <Link href={f.forwardLooking.href} className="py-2 hover:text-text md:ml-auto md:py-0">
            {f.forwardLooking.label}
          </Link>
          {/* Plain <a>: a full page load is what starts the intro film. */}
          <a href={f.replayIntro.href} className="py-2 hover:text-text md:py-0">
            {f.replayIntro.label}
          </a>
        </div>
      </div>
    </footer>
  );
}
