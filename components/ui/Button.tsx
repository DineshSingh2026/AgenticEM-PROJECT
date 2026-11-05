import Link from "next/link";
import type { ReactNode, MouseEventHandler } from "react";
import { cn } from "@/lib/cn";

export interface ButtonProps {
  href?: string;
  variant?: "primary" | "ghost";
  children: ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
  onClick?: MouseEventHandler<HTMLElement>;
  disabled?: boolean;
  /** Render a plain <a> that opens in a new tab (for off-site links). Requires href. */
  external?: boolean;
  ariaLabel?: string;
}

const base =
  "inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-btn px-5 font-sans text-[15px] font-medium transition-[background-color,box-shadow,border-color,color] duration-300 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary:
    "bg-copper text-bg hover:bg-copper-soft hover:shadow-[0_0_0_1px_rgb(var(--copper-soft-rgb)/0.6),0_0_18px_rgb(var(--copper-rgb)/0.35)]",
  ghost:
    "border border-line-strong bg-transparent text-text hover:border-copper/70 hover:shadow-[0_0_0_1px_rgb(var(--copper-rgb)/0.25)]",
} as const;

export function Button({
  href,
  variant = "primary",
  children,
  className,
  type = "button",
  onClick,
  disabled,
  external,
  ariaLabel,
}: ButtonProps) {
  const classes = cn(base, variants[variant], className);
  if (href && external && !disabled) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel} className={classes} onClick={onClick}>
        {children}
      </a>
    );
  }
  if (href && !disabled) {
    return (
      <Link href={href} aria-label={ariaLabel} className={classes} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} aria-label={ariaLabel} className={classes} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
