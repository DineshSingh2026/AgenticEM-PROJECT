/** 26.1-second intro film timeline. All times in ms. */
export const TIMELINE = {
  durationMs: 26100,
  /** Cross-fade overlap on each side of a scene boundary. */
  fadeMs: 650,
  /** Exit wipe into the website starts this long before the end. */
  exitMs: 1100,
  scenes: [
    { id: "logo", start: 0, end: 4400 },
    { id: "intelligence", start: 4400, end: 8700, chapter: 0 },
    { id: "settlement", start: 8700, end: 13000, chapter: 1 },
    /** Longer hold: this chapter carries a full sentence of body copy. */
    { id: "network", start: 13000, end: 19400, chapter: 2 },
    { id: "aggregation", start: 19400, end: 23700, chapter: 3 },
    { id: "outro", start: 23700, end: 26100 },
  ],
} as const;

export type SceneId = (typeof TIMELINE.scenes)[number]["id"];
