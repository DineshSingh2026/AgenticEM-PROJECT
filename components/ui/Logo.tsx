import Image from "next/image";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";

/** Transparent gold PNG cuts in public/brand (intrinsic px). */
const ASSETS = {
  emblem: { src: "/brand/agentium-emblem.png", width: 294, height: 188, sizes: "72px" },
  wordmark: { src: "/brand/agentium-wordmark.png", width: 426, height: 60, sizes: "128px" },
  lockup: { src: "/brand/agentium-logo.png", width: 508, height: 288, sizes: "320px" },
} as const;

/** Wordmark cap height relative to the emblem in the horizontal lockup. */
const WORDMARK_RATIO = 0.4;

export type LogoVariant = "horizontal" | "stacked" | "emblem";

type LogoProps = {
  /** "horizontal" (emblem + wordmark, nav), "stacked" (full lockup with tagline), "emblem" (mark only). */
  variant?: LogoVariant;
  /** Sizing is driven by height on the root, e.g. "h-9" (default) or "h-5 md:h-6". */
  className?: string;
  /** Hide from assistive tech; use when wrapped in a link/element that already carries a label. */
  decorative?: boolean;
  /** Eager-load (above the fold, e.g. nav). */
  priority?: boolean;
};

/** AGENTIUM brand logo built on the client's transparent gold PNGs. */
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
      className={cn("inline-flex h-9 items-center gap-2.5", className)}
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
