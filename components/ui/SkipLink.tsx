import { copy } from "@/content/copy";

export function SkipLink() {
  return (
    <a
      href="#main"
      className="t-label sr-only z-[100] bg-copper px-4 py-3 text-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
    >
      {copy.site.skipLink}
    </a>
  );
}
