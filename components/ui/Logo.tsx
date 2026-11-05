import Image from "next/image";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";

/** Transparent silver + teal PNG cuts in public/brand (intrinsic px), keyed out for dark backgrounds. */
const ASSETS = {
  emblem: { src: "/brand/agentium-emblem-v2.png", width: 579, height: 434, sizes: "72px" },
  wordmark: { src: "/brand/agentium-wordmark-v2.png", width: 1076, height: 82, sizes: "200px" },
  lockup: { src: "/brand/agentium-logo-v2.png", width: 776, height: 600, sizes: "240px" },
} as const;

/** Wordmark image height relative to the emblem in the horizontal lockup (glyphs fill ~80% of it). */
const WORDMARK_RATIO = 0.34;

export type LogoVariant = "horizontal" | "stacked" | "emblem";

type LogoProps = {
  /** "horizontal" (emblem + wordmark, nav), "stacked" (full lockup with horizon arc), "emblem" (mark only). */
  variant?: LogoVariant;
  /** Sizing is driven by height on the root, e.g. "h-9" (default) or "h-5 md:h-6". */
  className?: string;
  /** Hide from assistive tech; use when wrapped in a link/element that already carries a label. */
  decorative?: boolean;
  /** Eager-load (above the fold, e.g. nav). */
  priority?: boolean;
};

/** AGENTIUM brand logo built on the client's transparent silver + teal PNGs. */
export function Logo({ variant = "horizontal", className, decorative = false, priority = false }: LogoProps) {
  const brand = copy.site.brand;
  const alt = decorative ? "" : variant === "stacked" ? brand.logoAltFull : brand.logoAlt;
  const imgCls = "block h-full w-auto max-w-none select-none";

  if (variant === "stacked" || variant === "emblem") {
    const a = variant === "stacked" ? ASSETS.lockup : ASSETS.emblem;
    return (
      <span className={cn("inline-flex", variant === "stacked" ? "h-36" : "h-9", className)}>
        <Image
          src={a.src}
          width={a.width}
          height={a.height}
          sizes={a.sizes}
          alt={alt}
          aria-hidden={decorative || undefined}
          priority={priority}
          quality={90}
          draggable={false}
          className={imgCls}
        />
      </span>
    );
  }

  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative || undefined}
      className={cn("inline-flex h-9 items-center gap-2", className)}
    >
      <Image
        src={ASSETS.emblem.src}
        width={ASSETS.emblem.width}
        height={ASSETS.emblem.height}
        sizes={ASSETS.emblem.sizes}
        alt=""
        priority={priority}
        quality={90}
        draggable={false}
        className={imgCls}
      />
      <span className="flex h-full items-center">
        <Image
          src={ASSETS.wordmark.src}
          width={ASSETS.wordmark.width}
          height={ASSETS.wordmark.height}
          sizes={ASSETS.wordmark.sizes}
          alt=""
          priority={priority}
          quality={90}
          draggable={false}
          className="block w-auto max-w-none select-none"
          style={{ height: `${WORDMARK_RATIO * 100}%` }}
        />
      </span>
    </span>
  );
}
