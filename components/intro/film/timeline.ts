/** 20-second intro film timeline. All times in ms. Owned by the core agent; scene agents read only. */
export const TIMELINE = {
  durationMs: 20000,
  /** Cross-fade overlap on each side of a scene boundary. */
  fadeMs: 650,
  /** Exit wipe into the website starts this long before the end. */
  exitMs: 1100,
  scenes: [
    { id: "logo", start: 0, end: 4400 },
    { id: "shift", start: 4400, end: 7700, chapter: 0 },
    { id: "convergence", start: 7700, end: 11000, chapter: 1 },
    { id: "settlement", start: 11000, end: 14300, chapter: 2 },
    { id: "risk", start: 14300, end: 17600, chapter: 3 },
    { id: "outro", start: 17600, end: 20000 },
  ],
} as const;

export type SceneId = (typeof TIMELINE.scenes)[number]["id"];
