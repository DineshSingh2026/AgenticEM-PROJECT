import type { FilmScene } from "../types";
import { Lockup, type LockupTiming } from "../lockup";

/**
 * 0 – 4.4s · The hero moment. Black → one gold spark → thousands of gold particles bloom out and
 * assemble along the emblem's silhouette → the real emblem resolves with a specular sweep and an
 * orbiting glint → AGENTIUM wordmark reveals left→right → tagline settles.
 */
const CONFIG = {
  timing: {
    spark: [250, 900],
    burst: [750, 1750],
    burstMs: 850,
    gather: [1500, 2750],
    gatherMs: 980,
    resolve: [2350, 3000],
    particlesOut: [2600, 3300],
    sweep: [2700, 3700],
    flare: 2560,
    flareMs: 650,
    word: [2850, 3650],
    wordSweep: [3250, 4100],
    tagline: [3300, 3900],
    bloomRadius: 0.62,
  } satisfies LockupTiming,
  /** Full-lockup width: min(52vw, 560px) on desktop, 84vw on narrow viewports; never taller than 46% of h. */
  layout: { desktopVw: 0.52, maxPx: 560, narrowVw: 0.84, maxHFrac: 0.46, cy: 0.46 },
};

export function createLogoScene(): FilmScene {
  const L = CONFIG.layout;
  const lockup = new Lockup(CONFIG.timing, (w, h, narrow) => {
    let width = narrow ? w * L.narrowVw : Math.min(w * L.desktopVw, L.maxPx);
    width = Math.min(width, ((h * L.maxHFrac) * 508) / 288);
    return { cx: w / 2, cy: h * L.cy, width };
  });
  return {
    id: "logo",
    resize(w, h) {
      lockup.resize(w, h);
    },
    draw(f) {
      lockup.draw(f, f.local);
    },
  };
}
