/**
 * Canvas text cannot use CSS variables, so resolve the next/font family stacks (hashed names like
 * "'__EB_Garamond_abc123', '__EB_Garamond_Fallback_abc123'") from the vars set on <html>, and make
 * sure the exact faces a canvas uses are loaded before drawing (otherwise the fallback gets baked in).
 */

const FALLBACK = {
  display: "'EB Garamond', Georgia, 'Times New Roman', serif",
  mono: "'Roboto Mono', ui-monospace, Menlo, monospace",
  sans: "'Open Sans', system-ui, sans-serif",
} as const;

export type CanvasFontKind = keyof typeof FALLBACK;

/** Resolved font-family stack for canvas `ctx.font`, with a sensible system fallback appended. */
export function canvasFont(kind: CanvasFontKind): string {
  if (typeof document === "undefined") return FALLBACK[kind];
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--font-${kind}`).trim();
  return v ? `${v}, ${FALLBACK[kind]}` : FALLBACK[kind];
}

/** Faces drawn on canvases across the site (weights must exist in app/layout.tsx). */
const FACES: [CanvasFontKind, string][] = [
  ["display", "500"],
  ["display", "600"],
  ["mono", "400"],
  ["mono", "500"],
];

let loads: Promise<void> | null = null;

/** Loads the canvas faces once; never rejects. */
function loadFaces(): Promise<void> {
  if (!loads) {
    loads = Promise.all(FACES.map(([k, w]) => document.fonts.load(`${w} 48px ${canvasFont(k)}`).catch(() => [])))
      .then(() => document.fonts.ready)
      .then(() => undefined, () => undefined);
  }
  return loads;
}

/** Resolves once the canvas faces are loaded (or failed / timed out); never rejects. */
export function loadCanvasFonts(timeoutMs = 4000): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return Promise.resolve();
  const timer = new Promise<void>((r) => window.setTimeout(r, timeoutMs));
  return Promise.race([loadFaces(), timer]);
}

/** True when every canvas face is already loaded (so a synchronous draw uses the real fonts). */
export function canvasFontsReady(): boolean {
  if (typeof document === "undefined" || !document.fonts) return true;
  try {
    return FACES.every(([k, w]) => document.fonts.check(`${w} 48px ${canvasFont(k)}`));
  } catch {
    return true;
  }
}

/**
 * For canvases painted synchronously (e.g. three.js CanvasTextures built in useMemo): if the web
 * fonts were not ready at paint time, call `repaint` once they are, so the fallback is not baked in.
 */
export function afterCanvasFonts(repaint: () => void): void {
  if (canvasFontsReady()) return;
  void loadFaces().then(repaint);
}
