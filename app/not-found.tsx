import type { Metadata } from "next";
import { pages } from "@/content/copy/pages";
import { Button } from "@/components/ui";

const c = pages.notFound;

export const metadata: Metadata = {
  title: c.meta.title,
  description: c.meta.description,
  robots: { index: false },
};

export default function NotFound() {
  return (
    <section
      data-scene="AgentField"
      data-scene-variant="calm"
      className="relative flex min-h-[88vh] items-center pb-24 pt-36"
    >
      <div className="container-site flex flex-col items-start gap-6">
        <p className="t-label text-[14px] text-copper">{c.code}</p>
        <h1 className="t-display max-w-[16ch] text-balance text-text">{c.title}</h1>
        <p className="t-body">{c.body}</p>
        <Button href="/" variant="ghost" className="mt-4">
          {c.link}
        </Button>
      </div>
    </section>
  );
}
