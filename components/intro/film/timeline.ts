/** 28.3-second intro film timeline. All times in ms. */
export const TIMELINE = {
  durationMs: 28300,
  /** Cross-fade overlap on each side of a scene boundary. */
  fadeMs: 650,
  /** Exit wipe into the website starts this long before the end. */
  exitMs: 1100,
  scenes: [
    { id: "logo", start: 0, end: 4400 },
    { id: "backbone", start: 4400, end: 8700, chapter: 0 },
    { id: "aggregation", start: 8700, end: 13000, chapter: 1 },
    { id: "settlement", start: 13000, end: 17300, chapter: 2 },
    { id: "intelligence", start: 17300, end: 21600, chapter: 3 },
    { id: "revenue", start: 21600, end: 25900, chapter: 4 },
    { id: "outro", start: 25900, end: 28300 },
  ],
} as const;

export type SceneId = (typeof TIMELINE.scenes)[number]["id"];
