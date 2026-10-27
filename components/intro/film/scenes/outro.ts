import type { FilmScene } from "../types";
import { Lockup, type LockupTiming } from "../lockup";

/**
 * 17.6 – 20s · The previous scene collapses into a point of light (core camera), which bursts and
 * re-forms the full AGENTIUM lockup — a faster echo of the opening. The HTML headline sits beneath;
 * the exit wipe starts at 18.9s.
 */
const CONFIG = {
  timing: {
    spark: [-560, 80],
    burst: [0, 480],
    burstMs: 420,
    gather: [260, 920],
    gatherMs: 560,
    resolve: [650, 1050],
    particlesOut: [800, 1250],
    sweep: [900, 1700],
    flare: 700,
    flareMs: 420,
    word: [800, 1250],
    wordSweep: [1100, 1800],
    tagline: [1000, 1400],
    bloomRadius: 0.5,
  } satisfies LockupTiming,
  /** Must match `.intro-outro` in app/globals.css (headline sits under the lockup). */
  layout: { desktopVw: 0.36, maxPx: 420, narrowVw: 0.72, maxHFrac: 0.3, cy: 0.4 },
};

export function createOutroScene(): FilmScene {
  const L = CONFIG.layout;
  const lockup = new Lockup(CONFIG.timing, (w, h, narrow) => {
    let width = narrow ? w * L.narrowVw : Math.min(w * L.desktopVw, L.maxPx);
    width = Math.min(width, ((h * L.maxHFrac) * 508) / 288);
    return { cx: w / 2, cy: h * L.cy, width };
  });
  return {
    id: "outro",
    resize(w, h) {
      lockup.resize(w, h);
    },
    draw(f) {
      lockup.draw(f, f.local);
    },
  };
}
