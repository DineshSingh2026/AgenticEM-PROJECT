import { cn } from "@/lib/cn";
import { Eyebrow } from "@/components/ui";

/** Eyebrow + H2 (with id for aria-labelledby) + optional body. Used by the Home-A sections. */
export function SectionIntro({
  id,
  eyebrow,
  title,
  body,
  className,
}: {
  id: string;
  eyebrow: string;
  title: string;
  body?: string;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-5", className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 id={id} className="t-h2 relative z-10 max-w-[20ch] text-balance text-text">
        {title}
      </h2>
      {/* Soft dark backdrop keeps body copy legible where scene lines pass behind it. */}
      {body ? (
        <p className="t-body relative isolate before:absolute before:-inset-x-4 before:-inset-y-6 md:before:-inset-x-8 before:-z-10 before:rounded-[40px] before:bg-bg/85 before:blur-2xl before:content-['']">
          {body}
        </p>
      ) : null}
    </header>
  );
}
