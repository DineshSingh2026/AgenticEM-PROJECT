"use client";

import { useEffect, useState, type RefObject } from "react";

/** Media-query hook. Starts false on the server and first client render (no hydration mismatch). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/** True when the user prefers reduced motion. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/**
 * True when a pinned band is actually pinned: at/above `minWidth` and motion allowed.
 * Must match the `motion-safe:<bp>:sticky` classes used by the section.
 */
export function usePinned(minWidth: 768 | 1024): boolean {
  return useMediaQuery(`(min-width: ${minWidth}px) and (prefers-reduced-motion: no-preference)`);
}

/**
 * Local scroll progress (0-1) of a tall pinned section: 0 when its top reaches
 * the viewport top, 1 when its bottom reaches the viewport bottom.
 * Updates are rAF-throttled and quantised so React re-renders stay cheap.
 */
export function useSectionProgress(ref: RefObject<HTMLElement | null>, steps = 200): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;

    const measure = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const raw = travel > 0 ? -rect.top / travel : rect.top <= 0 ? 1 : 0;
      const clamped = Math.min(1, Math.max(0, raw));
      const q = Math.round(clamped * steps) / steps;
      setProgress((p) => (p === q ? p : q));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref, steps]);

  return progress;
}
