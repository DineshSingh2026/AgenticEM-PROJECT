"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type StatFormat = "int" | "compact" | "usd" | "ms" | "pct";

const intFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const compactFmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2, minimumFractionDigits: 2 });
const usdFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function formatStat(v: number, format: StatFormat = "int"): string {
  switch (format) {
    case "compact":
      return Math.abs(v) < 1000 ? intFmt.format(v) : compactFmt.format(v);
    case "usd":
      return usdFmt.format(v);
    case "ms":
      return `${intFmt.format(v)} ms`;
    case "pct":
      return `${v.toFixed(2)}%`;
    default:
      return intFmt.format(v);
  }
}

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const ENTER_MS = 1400;
const UPDATE_MS = 600;

export interface StatTickerProps {
  value: number;
  format?: StatFormat;
  label: string;
  className?: string;
}

/** Counts up from zero when it enters view, then eases between live updates. */
export function StatTicker({ value, format = "int", label, className }: StatTickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(0);
  const shown = useRef(0);
  const seen = useRef(false);
  const target = useRef(value);
  const raf = useRef<number | null>(null);
  const reduced = useRef(false);

  const animateTo = (to: number, duration: number) => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    if (reduced.current) {
      shown.current = to;
      setDisplay(to);
      return;
    }
    const from = shown.current;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = from + (to - from) * ease(t);
      shown.current = v;
      setDisplay(v);
      raf.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    raf.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      seen.current = true;
      animateTo(target.current, ENTER_MS);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !seen.current) {
          seen.current = true;
          animateTo(target.current, ENTER_MS);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    target.current = value;
    if (seen.current) animateTo(value, UPDATE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const rounded = format === "pct" ? display : Math.round(display);

  return (
    <div ref={ref} className={cn("flex flex-col gap-1", className)}>
      <span className="t-num text-xl text-text md:text-2xl">{formatStat(rounded, format)}</span>
      <span className="t-label text-[11px] text-text-faint">{label}</span>
    </div>
  );
}
