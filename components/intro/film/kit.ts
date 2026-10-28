import type { SceneFrame } from "./types";
import { COLORS, clamp, easeOut, lerp, rgba } from "./util";

/**
 * Shared drawing kit for the platform chapters (backbone → revenue). Everything draws in stage CSS px
 * and respects the frame's globalAlpha (already set by the engine). Emissive accents go to `f.glow`.
 */

export type Pt = { x: number; y: number };

/** The visual safe zone: below the top letterbox bar, above the HTML chapter copy (~62% of h). */
export function safeZone(w: number, h: number, narrow: boolean) {
  const bar = clamp(h * 0.08, 44, 84);
  const top = bar + (narrow ? 104 : 28);
  const bottom = h * (narrow ? 0.7 : 0.62);
  return { top, bottom, cx: w / 2, cy: (top + bottom) / 2, height: bottom - top, left: w * 0.06, right: w * 0.94 };
}

type TrackedCtx = CanvasRenderingContext2D & { letterSpacing?: string };

/** Text in any font with optional tracking (em). */
export function text(
  ctx: CanvasRenderingContext2D,
  font: string,
  s: string,
  x: number,
  y: number,
  o: { size?: number; weight?: number; color?: string; alpha?: number; align?: CanvasTextAlign; track?: number; base?: CanvasTextBaseline } = {},
) {
  const a = o.alpha ?? 1;
  if (a <= 0 || !s) return;
  const c = ctx as TrackedCtx;
  const size = o.size ?? 12;
  c.save();
  c.globalAlpha *= clamp(a);
  c.font = `${o.weight ?? 500} ${size}px ${font}`;
  c.fillStyle = o.color ?? COLORS.text;
  c.textAlign = o.align ?? "left";
  c.textBaseline = o.base ?? "middle";
  if ("letterSpacing" in c) c.letterSpacing = `${(size * (o.track ?? 0)).toFixed(2)}px`;
  c.fillText(s, x, y);
  c.restore();
}

/** Mono system label (uppercase tracking 0.14em). */
export function label(f: SceneFrame, s: string, x: number, y: number, o: { size?: number; color?: string; alpha?: number; align?: CanvasTextAlign } = {}) {
  text(f.ctx, f.fonts.mono, s, x, y, { size: o.size ?? 10, color: o.color ?? COLORS.dim, alpha: o.alpha, align: o.align, track: 0.14 });
}

/** Typewriter: first k of the string, with a block caret while typing. */
export function typed(s: string, k: number) {
  const n = Math.floor(clamp(k) * s.length);
  return n >= s.length ? s : s.slice(0, n) + "▌";
}

/** Total length of a polyline. */
function polyLen(pts: Pt[]) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return L;
}

/** Point at fraction u (0..1) of a polyline's length. */
export function pointAt(pts: Pt[], u: number): Pt {
  const total = polyLen(pts);
  let d = clamp(u) * total;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= l || i === pts.length - 1) {
      const k = l ? clamp(d / l) : 0;
      return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) };
    }
    d -= l;
  }
  return pts[pts.length - 1];
}

/** Trace the polyline from its start up to fraction k. */
function tracePath(c: CanvasRenderingContext2D, pts: Pt[], k: number) {
  const total = polyLen(pts);
  let left = clamp(k) * total;
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length && left > 0; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    const t = l ? Math.min(1, left / l) : 1;
    c.lineTo(lerp(a.x, b.x, t), lerp(a.y, b.y, t));
    left -= l;
  }
}

/** A wire drawn in to fraction k, with a hot head while drawing. */
export function wire(
  f: SceneFrame,
  pts: Pt[],
  k: number,
  o: { color?: string; width?: number; alpha?: number; glow?: number; dash?: number[] } = {},
) {
  if (k <= 0) return;
  const { ctx, glow } = f;
  const a = o.alpha ?? 0.55;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.strokeStyle = o.color ?? COLORS.gold;
  ctx.lineWidth = o.width ?? 1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (o.dash) ctx.setLineDash(o.dash);
  ctx.beginPath();
  tracePath(ctx, pts, k);
  ctx.stroke();
  ctx.restore();
  const g = o.glow ?? 0.35;
  if (g > 0) {
    glow.save();
    glow.globalAlpha *= g;
    glow.strokeStyle = o.color ?? COLORS.gold;
    glow.lineWidth = (o.width ?? 1) + 1.5;
    glow.lineCap = "round";
    glow.beginPath();
    tracePath(glow, pts, k);
    glow.stroke();
    glow.restore();
  }
  if (k < 1) {
    const h = pointAt(pts, k);
    spark(f, h.x, h.y, 2.2, 1);
  }
}

/** A bright point with bloom. */
export function spark(f: SceneFrame, x: number, y: number, r: number, a = 1, color: string = COLORS.goldPale) {
  if (a <= 0) return;
  const { ctx, glow } = f;
  ctx.save();
  ctx.globalAlpha *= clamp(a);
  ctx.fillStyle = "#FFF4DA";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  glow.save();
  glow.globalAlpha *= clamp(a);
  glow.fillStyle = color;
  glow.beginPath();
  glow.arc(x, y, r * 2.2, 0, Math.PI * 2);
  glow.fill();
  glow.restore();
}

/** Packets flowing along a polyline. `phase` offsets, `speed` in path-lengths per second. */
export function packets(f: SceneFrame, pts: Pt[], n: number, o: { speed?: number; phase?: number; alpha?: number; r?: number; color?: string } = {}) {
  const a = o.alpha ?? 1;
  if (a <= 0) return;
  const sp = o.speed ?? 0.6;
  for (let i = 0; i < n; i++) {
    const u = (((f.local / 1000) * sp + i / n + (o.phase ?? 0)) % 1 + 1) % 1;
    const p = pointAt(pts, u);
    const edge = Math.min(u, 1 - u) * 8;
    spark(f, p.x, p.y, o.r ?? 1.8, a * clamp(edge), o.color);
  }
}

/** Expanding ring pulse, k: 0..1. */
export function ring(f: SceneFrame, x: number, y: number, r0: number, r1: number, k: number, color: string = COLORS.goldPale) {
  if (k <= 0 || k >= 1) return;
  const { ctx, glow } = f;
  const r = lerp(r0, r1, easeOut(k));
  ctx.save();
  ctx.globalAlpha *= (1 - k) * 0.8;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  glow.save();
  glow.globalAlpha *= (1 - k) * 0.6;
  glow.strokeStyle = color;
  glow.lineWidth = 2;
  glow.beginPath();
  glow.arc(x, y, r, 0, Math.PI * 2);
  glow.stroke();
  glow.restore();
}

/** Rotated square marker. */
export function diamond(c: CanvasRenderingContext2D, x: number, y: number, s: number, fill: string, a = 1) {
  c.save();
  c.globalAlpha *= clamp(a);
  c.fillStyle = fill;
  c.translate(x, y);
  c.rotate(Math.PI / 4);
  c.fillRect(-s, -s, s * 2, s * 2);
  c.restore();
}

/** Perimeter of a rect as a closed polyline starting top-left. */
export function rectPts(x: number, y: number, w: number, h: number): Pt[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
    { x, y },
  ];
}

/**
 * Glass panel: smoked fill fades in, the gold border traces round, copper L-brackets snap on.
 * `k` 0..1 build, `hot` 0..1 extra border glow (e.g. on activation).
 */
export function panel(f: SceneFrame, x: number, y: number, w: number, h: number, k: number, o: { hot?: number; border?: string; fill?: number } = {}) {
  if (k <= 0) return;
  const { ctx, glow } = f;
  const fillK = easeOut(clamp(k * 1.4 - 0.2));
  ctx.save();
  ctx.globalAlpha *= fillK;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, rgba(COLORS.bgElev, o.fill ?? 0.9));
  g.addColorStop(1, rgba("#0B0D10", o.fill ?? 0.9));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  wire(f, rectPts(x, y, w, h), easeOut(clamp(k * 1.15)), { color: o.border ?? COLORS.gold, alpha: 0.32 + 0.5 * (o.hot ?? 0), glow: 0.12 + 0.6 * (o.hot ?? 0) });

  const bk = clamp(k * 2 - 1);
  if (bk > 0) {
    const s = Math.min(9, w * 0.08) * easeOut(bk);
    ctx.save();
    ctx.strokeStyle = COLORS.copper;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - 1, y - 1 + s);
    ctx.lineTo(x - 1, y - 1);
    ctx.lineTo(x - 1 + s, y - 1);
    ctx.moveTo(x + w + 1, y + h + 1 - s);
    ctx.lineTo(x + w + 1, y + h + 1);
    ctx.lineTo(x + w + 1 - s, y + h + 1);
    ctx.stroke();
    ctx.restore();
  }
  if ((o.hot ?? 0) > 0) {
    glow.save();
    glow.globalAlpha *= (o.hot ?? 0) * 0.18;
    glow.fillStyle = COLORS.gold;
    glow.fillRect(x, y, w, h);
    glow.restore();
  }
}

/**
 * The AGENTIUM emblem as a lit core: halo, the real emblem image, two counter-rotating tick rings.
 * `k` 0..1 ignite.
 */
export function emblemCore(f: SceneFrame, cx: number, cy: number, R: number, k: number, o: { rings?: boolean } = {}) {
  if (k <= 0) return;
  const { ctx, glow, local, assets } = f;
  const breathe = 0.5 + 0.5 * Math.sin(local / 480);
  // Halo.
  glow.save();
  glow.globalCompositeOperation = "lighter";
  glow.globalAlpha *= k * (0.45 + 0.2 * breathe);
  const hg = glow.createRadialGradient(cx, cy, 0, cx, cy, R * 2.2);
  hg.addColorStop(0, rgba(COLORS.gold, 0.6));
  hg.addColorStop(0.4, rgba(COLORS.goldDeep, 0.18));
  hg.addColorStop(1, rgba(COLORS.goldDeep, 0));
  glow.fillStyle = hg;
  glow.fillRect(cx - R * 2.2, cy - R * 2.2, R * 4.4, R * 4.4);
  glow.restore();

  // Dark disc so lines passing behind read as "under" the core.
  ctx.save();
  ctx.globalAlpha *= easeOut(k) * 0.85;
  const dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  dg.addColorStop(0, "#15120C");
  dg.addColorStop(1, "#08090B");
  ctx.fillStyle = dg;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (o.rings !== false) {
    const ticks = (r: number, n: number, rot: number, len: number, a: number) => {
      ctx.save();
      ctx.globalAlpha *= a * k;
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        if (i / n > k) break;
        const th = rot + (i / n) * Math.PI * 2;
        const l = i % 6 === 0 ? len * 1.8 : len;
        ctx.moveTo(cx + Math.cos(th) * r, cy + Math.sin(th) * r);
        ctx.lineTo(cx + Math.cos(th) * (r + l), cy + Math.sin(th) * (r + l));
      }
      ctx.stroke();
      ctx.restore();
    };
    ticks(R * 1.08, 72, local / 9000, R * 0.05, 0.5);
    ticks(R * 1.28, 36, -local / 6000, R * 0.04, 0.3);
    ctx.save();
    ctx.globalAlpha *= k * 0.7;
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * easeOut(k));
    ctx.stroke();
    ctx.restore();
    glow.save();
    glow.globalAlpha *= k * 0.5;
    glow.strokeStyle = COLORS.gold;
    glow.lineWidth = 2;
    glow.beginPath();
    glow.arc(cx, cy, R, 0, Math.PI * 2);
    glow.stroke();
    glow.restore();
  }

  // Emblem image.
  const img = assets.emblem;
  const ew = R * 1.25;
  const eh = (ew * img.height) / img.width;
  ctx.save();
  ctx.globalAlpha *= easeOut(clamp(k * 1.5 - 0.3));
  ctx.drawImage(img, cx - ew / 2, cy - eh / 2 - R * 0.04, ew, eh);
  ctx.restore();
  glow.save();
  glow.globalAlpha *= easeOut(clamp(k * 1.5 - 0.3)) * (0.25 + 0.15 * breathe);
  glow.drawImage(img, cx - ew / 2, cy - eh / 2 - R * 0.04, ew, eh);
  glow.restore();
}

/** Small game-type glyphs drawn with strokes (no icon font). */
export function glyph(c: CanvasRenderingContext2D, kind: number, x: number, y: number, s: number, color: string, a = 1) {
  c.save();
  c.globalAlpha *= clamp(a);
  c.strokeStyle = color;
  c.fillStyle = color;
  c.lineWidth = 1.2;
  c.translate(x, y);
  c.beginPath();
  switch (kind % 5) {
    case 0: // sports ball
      c.arc(0, 0, s, 0, Math.PI * 2);
      c.moveTo(-s, 0);
      c.quadraticCurveTo(0, -s * 0.5, s, 0);
      c.moveTo(-s, 0);
      c.quadraticCurveTo(0, s * 0.5, s, 0);
      c.stroke();
      break;
    case 1: // card
      c.rect(-s * 0.72, -s, s * 1.44, s * 2);
      c.stroke();
      c.beginPath();
      c.moveTo(0, -s * 0.45);
      c.lineTo(s * 0.32, 0);
      c.lineTo(0, s * 0.45);
      c.lineTo(-s * 0.32, 0);
      c.closePath();
      c.fill();
      break;
    case 2: // die
      c.rect(-s, -s, s * 2, s * 2);
      c.stroke();
      for (const [dx, dy] of [[-0.45, -0.45], [0, 0], [0.45, 0.45]]) {
        c.beginPath();
        c.arc(dx * s, dy * s, s * 0.14, 0, Math.PI * 2);
        c.fill();
      }
      break;
    case 3: // board (2x2 checker)
      c.rect(-s, -s, s * 2, s * 2);
      c.stroke();
      c.fillRect(-s, -s, s, s);
      c.fillRect(0, 0, s, s);
      break;
    default: // skill (target)
      c.arc(0, 0, s, 0, Math.PI * 2);
      c.moveTo(s * 0.5, 0);
      c.arc(0, 0, s * 0.5, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.arc(0, 0, s * 0.14, 0, Math.PI * 2);
      c.fill();
  }
  c.restore();
}
