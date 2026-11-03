import Link from "next/link";
import { copy } from "@/content/copy";
import { BracketPanel } from "./BracketPanel";
import { BriefingForm } from "./BriefingForm";
import { Eyebrow } from "./Eyebrow";

export interface CtaBandProps {
  title?: string;
  body?: string;
}

/** End-of-page briefing request band used on inner pages. */
export function CtaBand({ title, body }: CtaBandProps) {
  const c = copy.site.ctaBand;
  return (
    <section id="briefing" aria-labelledby="cta-band-title" className="section-pad relative">
      <div className="container-site grid gap-10 lg:grid-cols-12 lg:gap-6">
        <div className="flex flex-col gap-5 lg:col-span-5">
          <Eyebrow>{c.eyebrow}</Eyebrow>
          <h2 id="cta-band-title" className="t-h2 max-w-[18ch] text-balance text-text">
            {title ?? c.title}
          </h2>
          <p className="t-body">{body ?? c.body}</p>
          <p className="t-label text-text-faint">{copy.site.forLicensedOperators}</p>
          <Link
            href={c.contactLink.href}
            className="group inline-flex w-fit items-center gap-2 py-1 text-[14px] text-text underline decoration-copper/50 underline-offset-4 transition-colors duration-200 ease-out hover:decoration-copper"
          >
            {c.contactLink.label}
            <span aria-hidden="true" className="text-copper transition-transform duration-300 ease-out group-hover:translate-x-0.5">
              &rarr;
            </span>
          </Link>
        </div>
        <BracketPanel className="p-5 md:p-8 lg:col-span-7">
          <BriefingForm />
        </BracketPanel>
      </div>
    </section>
  );
}
