import type { SceneId } from "./timeline";

export interface FilmAssets {
  /** Full AGENTIUM lockup (emblem + wordmark + tagline), transparent PNG 508x288. */
  logo: HTMLImageElement;
  /** Gold "A" emblem with orbit ring only, 294x188. */
  emblem: HTMLImageElement;
  /** "AGENTIUM" gold wordmark only, 426x60. */
  wordmark: HTMLImageElement;
  /** "— AUTONOMOUS SOLUTIONS. REAL IMPACT. —", 508x26. */
  tagline: HTMLImageElement;
}

/** Everything a scene needs to draw one frame. */
export interface SceneFrame {
  /** Main layer. Camera transform already applied; draw in CSS px of a w×h stage. */
  ctx: CanvasRenderingContext2D;
  /**
   * Glow layer, same size + transform. Anything drawn here is bloomed (blurred, added on top) by the
   * core post pass. Draw emissive highlights (heads, sparks, flashes, hot lines) here IN ADDITION to ctx.
   */
  glow: CanvasRenderingContext2D;
  w: number;
  h: number;
  /** Global film time, ms. */
  t: number;
  /** ms since this scene's start. Negative during the fade-in lead, > dur during fade-out tail. */
  local: number;
  /** Scene duration, ms. */
  dur: number;
  /** local / dur, NOT clamped. */
  p: number;
  /** 0..1 cross-fade opacity. Already applied as ctx.globalAlpha/glow.globalAlpha by the core — do not multiply again unless you reset globalAlpha. */
  alpha: number;
  /** Viewport is narrow (w < 760): use the mobile layout. */
  narrow: boolean;
  fonts: { mono: string; display: string };
  assets: FilmAssets;
}

/**
 * A film scene. Create with a factory (e.g. `createShiftScene()`) so state lives per instance.
 * LAYOUT SAFE ZONE: keep visuals inside the stage between the letterbox bars and ABOVE ~64% of h
 * (the HTML chapter title + subtitle sit bottom-left, the live stat bottom-right on desktop and
 * top-right below the bar on mobile). The letterbox bars cover the top/bottom `bar` px
 * (bar = clamp(44px, 8vh, 84px)).
 */
export interface FilmScene {
  id: SceneId;
  /** Called on mount and on every resize. Pre-compute layouts here. */
  resize?(w: number, h: number): void;
  draw(f: SceneFrame): void;
}
