import seed from "@/lib/sim/seed.json";
import { TIMELINE, type SceneId } from "./timeline";
import type { FilmAssets, FilmScene, SceneFrame } from "./types";
import { clamp, easeInOutSine, easeOut, lerp, mulberry32, seg } from "./util";
import { createLogoScene } from "./scenes/logo";
import { createShiftScene } from "./scenes/shift";
import { createConvergenceScene } from "./scenes/convergence";
import { createSettlementScene } from "./scenes/settlement";
import { createRiskScene } from "./scenes/risk";
import { createOutroScene } from "./scenes/outro";

/** Look + performance knobs for the 20s intro film. */
export const CONFIG = {
  dpr: { max: 2, large: 1.5, largeW: 1920 },
  /** Glow layer resolution relative to CSS px (it is blurred anyway). */
  glowScale: 0.5,
  bloom: { core: 0.42, mip: [0.7, 0.8, 0.9, 1.0] as const, gain: 1.05 },
  camera: {
    dolly: 0.06,
    /** Per-scene dolly overrides. */
    dollyFor: { logo: 0.035, outro: 0 } as Partial<Record<SceneId, number>>,
    inFrom: 0.96,
    outTo: 1.08,
    driftPx: 9,
    origin: { x: 0.5, y: 0.45 },
    /** Where the scene before the outro collapses to (≈ the outro emblem centre). */
    collapse: { x: 0.5, y: 0.36, to: 0.02 },
  },
  ambient: {
    fadeIn: [500, 2600] as const,
    nebulaAlpha: 0.16,
    dust: 150,
    dustNarrow: 70,
    grid: { cell: 88, draw: [1400, 4200] as const, alpha: 0.05, chapterDim: 0.65 },
  },
  streak: { base: 0.1, peaks: [[2560, 0.8, 800], [18300, 0.7, 600]] as const, gain: 0.55 },
  leak: { alpha: 0.2, spanMs: 1100 },
  grain: { tile: 160, alpha: 0.055, fps: 24 },
  vignette: 0.82,
  loadTimeoutMs: 9000,
  assets: {
    logo: "/brand/agentium-logo.png",
    emblem: "/brand/agentium-emblem.png",
    wordmark: "/brand/agentium-wordmark.png",
    tagline: "/brand/agentium-tagline.png",
  },
};

// ---------------------------------------------------------------------------------------------
// Timeline helpers for the HTML overlay
// ---------------------------------------------------------------------------------------------

export type Phase = { kind: "logo" } | { kind: "chapter"; index: number; leaving: boolean } | { kind: "outro" };

const CHAPTERS = TIMELINE.scenes.filter((s): s is Extract<(typeof TIMELINE.scenes)[number], { chapter: number }> => "chapter" in s);
const OUTRO = TIMELINE.scenes[TIMELINE.scenes.length - 1];
/** Chapter copy leaves this long before its scene ends. */
const LEAVE_MS = 520;

export function phaseAt(t: number): Phase {
  for (const c of CHAPTERS) {
    if (t >= c.start && t < c.end) return { kind: "chapter", index: c.chapter, leaving: t > c.end - LEAVE_MS };
  }
  return t >= OUTRO.start ? { kind: "outro" } : { kind: "logo" };
}

export function samePhase(a: Phase, b: Phase) {
  if (a.kind !== b.kind) return false;
  if (a.kind === "chapter" && b.kind === "chapter") return a.index === b.index && a.leaving === b.leaving;
  return true;
}

/** Live-looking stat for the HTML counter, derived from the simulator baseline. */
export function statAt(t: number): string | null {
  const ph = phaseAt(t);
  if (ph.kind !== "chapter") return null;
  const b = seed.baseline;
  const c = CHAPTERS[ph.index];
  const p = (t - c.start) / (c.end - c.start);
  const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
  switch (ph.index) {
    case 0:
      return fmt(b.activeAgents * easeOut(seg(p, 0.08, 0.8)));
    case 1:
      return `${Math.round(lerp(1800, b.medianDecisionMs, easeOut(seg(p, 0.08, 0.75))))} ms`;
    case 2:
      return fmt(b.roundsPerSec * easeOut(seg(p, 0.05, 0.4)) + Math.sin(t / 110) * 120 * seg(p, 0.4, 0.55));
    default:
      return fmt(b.anomaliesFlagged24h - 8 + Math.floor(seg(p, 0.1, 0.9) * 8));
  }
}

// ---------------------------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------------------------

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (typeof img.decode === "function") img.decode().then(() => resolve(img), () => resolve(img));
      else resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

/** Resolves once all brand images are decoded and web fonts are ready; rejects on error/timeout. */
export function loadFilmAssets(): Promise<FilmAssets> {
  const A = CONFIG.assets;
  const all = Promise.all([loadImage(A.logo), loadImage(A.emblem), loadImage(A.wordmark), loadImage(A.tagline)]).then(
    async ([logo, emblem, wordmark, tagline]) => {
      try {
        await document.fonts?.ready;
      } catch {}
      return { logo, emblem, wordmark, tagline };
    },
  );
  const timeout = new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("Intro assets timed out")), CONFIG.loadTimeoutMs));
  return Promise.race([all, timeout]);
}

// ---------------------------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------------------------

function makeCanvas(w = 1, h = 1) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function ctx2d(c: HTMLCanvasElement, opts?: CanvasRenderingContext2DSettings) {
  const x = c.getContext("2d", opts);
  if (!x) throw new Error("2D canvas unavailable");
  return x;
}

type Mip = { c: HTMLCanvasElement; x: CanvasRenderingContext2D };
type Mote = { x: number; y: number; z: number; vx: number; vy: number; ph: number };
type Slot = { scene: FilmScene; start: number; end: number; idx: number };

const SCENE_FACTORIES: Record<SceneId, () => FilmScene> = {
  logo: createLogoScene,
  shift: createShiftScene,
  convergence: createConvergenceScene,
  settlement: createSettlementScene,
  risk: createRiskScene,
  outro: createOutroScene,
};

export class FilmEngine {
  private ctx: CanvasRenderingContext2D;
  private glowC = makeCanvas();
  private glow: CanvasRenderingContext2D;
  private mips: Mip[] = [];
  private streakA: Mip;
  private streakB: Mip;
  private vignette: Mip;
  private nebulaGold = makeCanvas(128, 128);
  private nebulaSteel = makeCanvas(128, 128);
  private leak = makeCanvas(128, 128);
  private mote = makeCanvas(32, 32);
  private grain: CanvasPattern | null = null;
  private motes: Mote[] = [];
  private slots: Slot[];
  private frame: SceneFrame;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private errored = new Set<string>();

  constructor(
    private canvas: HTMLCanvasElement,
    private assets: FilmAssets,
  ) {
    this.ctx = ctx2d(canvas, { alpha: false });
    this.glow = ctx2d(this.glowC);
    for (let i = 0; i < 4; i++) {
      const c = makeCanvas();
      this.mips.push({ c, x: ctx2d(c) });
    }
    const mk = (): Mip => {
      const c = makeCanvas();
      return { c, x: ctx2d(c) };
    };
    this.streakA = mk();
    this.streakB = mk();
    this.vignette = mk();
    this.buildSprites();

    const cs = getComputedStyle(document.documentElement);
    const mono = cs.getPropertyValue("--font-mono").trim() || "ui-monospace, monospace";
    const display = cs.getPropertyValue("--font-display").trim() || "system-ui, sans-serif";

    this.slots = TIMELINE.scenes.map((s, idx) => ({ scene: SCENE_FACTORIES[s.id](), start: s.start, end: s.end, idx }));
    this.frame = {
      ctx: this.ctx,
      glow: this.glow,
      w: 0,
      h: 0,
      t: 0,
      local: 0,
      dur: 1,
      p: 0,
      alpha: 1,
      narrow: false,
      fonts: { mono, display },
      assets,
    };
  }

  private buildSprites() {
    const radial = (c: HTMLCanvasElement, stops: [number, string][]) => {
      const x = ctx2d(c);
      const r = c.width / 2;
      const g = x.createRadialGradient(r, r, 0, r, r, r);
      for (const [o, col] of stops) g.addColorStop(o, col);
      x.fillStyle = g;
      x.fillRect(0, 0, c.width, c.height);
    };
    radial(this.nebulaGold, [
      [0, "rgba(232,182,90,0.55)"],
      [0.35, "rgba(176,122,42,0.22)"],
      [1, "rgba(176,122,42,0)"],
    ]);
    radial(this.nebulaSteel, [
      [0, "rgba(127,163,198,0.38)"],
      [0.4, "rgba(80,104,130,0.14)"],
      [1, "rgba(80,104,130,0)"],
    ]);
    radial(this.leak, [
      [0, "rgba(255,214,150,0.9)"],
      [0.3, "rgba(232,150,80,0.4)"],
      [0.7, "rgba(201,100,60,0.08)"],
      [1, "rgba(201,100,60,0)"],
    ]);
    radial(this.mote, [
      [0, "rgba(255,236,190,1)"],
      [0.35, "rgba(247,223,163,0.45)"],
      [1, "rgba(232,182,90,0)"],
    ]);
    // Film grain tile: luminance noise, both lifting and darkening.
    const T = CONFIG.grain.tile;
    const gc = makeCanvas(T, T);
    const gx = ctx2d(gc);
    const img = gx.createImageData(T, T);
    const rng = mulberry32(seed.seed);
    for (let i = 0; i < T * T; i++) {
      const v = rng();
      const light = v > 0.5;
      const o = i * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = light ? 255 : 0;
      img.data[o + 3] = Math.floor(Math.abs(v - 0.5) * 2 * 255);
    }
    gx.putImageData(img, 0, 0);
    this.grain = this.ctx.createPattern(gc, "repeat");
  }

  resize(w: number, h: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, w > CONFIG.dpr.largeW ? CONFIG.dpr.large : CONFIG.dpr.max);
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    const gs = CONFIG.glowScale;
    this.glowC.width = Math.max(1, Math.round(w * gs));
    this.glowC.height = Math.max(1, Math.round(h * gs));
    let mw = this.glowC.width;
    let mh = this.glowC.height;
    for (const m of this.mips) {
      mw = Math.max(1, Math.round(mw / 2));
      mh = Math.max(1, Math.round(mh / 2));
      m.c.width = mw;
      m.c.height = mh;
    }
    // Anamorphic streak runs at the 1/8 mip size.
    const sm = this.mips[1].c;
    this.streakA.c.width = this.streakB.c.width = sm.width;
    this.streakA.c.height = this.streakB.c.height = sm.height;
    // Vignette: low-res radial gradient, stretched.
    const v = this.vignette;
    v.c.width = 256;
    v.c.height = Math.max(64, Math.round((256 * h) / Math.max(1, w)));
    const g = v.x.createRadialGradient(128, v.c.height * 0.46, 0, 128, v.c.height * 0.46, Math.hypot(128, v.c.height / 2) * 1.05);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.5, "rgba(0,0,0,0.06)");
    g.addColorStop(0.82, `rgba(0,0,0,${CONFIG.vignette * 0.6})`);
    g.addColorStop(1, `rgba(0,0,0,${CONFIG.vignette})`);
    v.x.clearRect(0, 0, 256, v.c.height);
    v.x.fillStyle = g;
    v.x.fillRect(0, 0, 256, v.c.height);

    const rng = mulberry32(seed.seed + 3);
    const n = w < 760 ? CONFIG.ambient.dustNarrow : CONFIG.ambient.dust;
    this.motes = Array.from({ length: n }, () => ({
      x: rng(),
      y: rng(),
      z: Math.pow(rng(), 1.8),
      vx: 0.4 + rng() * 0.6,
      vy: -0.15 - rng() * 0.35,
      ph: rng() * Math.PI * 2,
    }));

    this.frame.w = w;
    this.frame.h = h;
    this.frame.narrow = w < 760;
    for (const s of this.slots) this.safe(s.scene.id, () => s.scene.resize?.(w, h));
  }

  private safe(id: string, fn: () => void) {
    try {
      fn();
    } catch (e) {
      if (!this.errored.has(id)) {
        this.errored.add(id);
        console.error(`[intro] scene "${id}" failed`, e);
      }
    }
  }

  /** Render film time t (ms). */
  render(t: number) {
    const { ctx, glow, w, h, dpr } = this;
    if (!w || !h) return;
    const gs = CONFIG.glowScale;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#07080A";
    ctx.fillRect(0, 0, w, h);
    glow.setTransform(1, 0, 0, 1, 0, 0);
    glow.globalAlpha = 1;
    glow.globalCompositeOperation = "source-over";
    glow.clearRect(0, 0, this.glowC.width, this.glowC.height);
    glow.setTransform(gs, 0, 0, gs, 0, 0);

    this.ambient(t);

    // ---- Scenes with per-scene camera ----
    const F = TIMELINE.fadeMs;
    const C = CONFIG.camera;
    const last = this.slots.length - 1;
    for (const s of this.slots) {
      const lead = s.idx === 0 ? 0 : F;
      const tail = s.idx === last ? 0 : F;
      if (t < s.start - lead || t > s.end + tail) continue;
      const inK = lead ? clamp((t - (s.start - F)) / (2 * F)) : 1;
      const outK = tail ? clamp((t - (s.end - F)) / (2 * F)) : 0;
      const alpha = easeInOutSine(inK) * (1 - easeInOutSine(outK));
      if (alpha <= 0.002) continue;
      const dur = s.end - s.start;
      const p = (t - s.start) / dur;
      const dolly = C.dollyFor[s.scene.id] ?? C.dolly;
      let sc = 1 + dolly * easeInOutSine(clamp(p));
      sc *= lerp(C.inFrom, 1, easeOut(inK));
      let ox = w * C.origin.x;
      let oy = h * C.origin.y;
      const collapse = this.slots[s.idx + 1]?.scene.id === "outro";
      if (collapse && outK > 0) {
        const k = Math.pow(outK, 2.2);
        sc *= lerp(1, C.collapse.to, k);
        ox = lerp(ox, w * C.collapse.x, Math.min(1, outK * 3));
        oy = lerp(oy, h * C.collapse.y, Math.min(1, outK * 3));
      } else {
        sc *= lerp(1, C.outTo, outK * outK);
      }
      const dx = Math.sin(t / 5300 + s.idx * 1.7) * C.driftPx;
      const dy = Math.cos(t / 6700 + s.idx * 2.3) * C.driftPx * 0.6;
      const tx = ox - ox * sc + dx;
      const ty = oy - oy * sc + dy;

      ctx.save();
      glow.save();
      ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * tx, dpr * ty);
      glow.setTransform(gs * sc, 0, 0, gs * sc, gs * tx, gs * ty);
      ctx.globalAlpha = alpha;
      glow.globalAlpha = alpha;
      const f = this.frame;
      f.t = t;
      f.local = t - s.start;
      f.dur = dur;
      f.p = p;
      f.alpha = alpha;
      this.safe(s.scene.id, () => s.scene.draw(f));
      ctx.restore();
      glow.restore();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }

    this.post(t);
  }

  private ambient(t: number) {
    const { ctx, glow, w, h } = this;
    const A = CONFIG.ambient;
    const on = easeInOutSine(seg(t, A.fadeIn[0], A.fadeIn[1]));
    if (on <= 0) return;
    const s = t / 1000;
    const big = Math.max(w, h);

    // Nebula: slow drifting gold + steel light.
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = A.nebulaAlpha * on * (0.85 + 0.15 * Math.sin(s * 0.4));
    let r = big * 0.95;
    ctx.drawImage(this.nebulaGold, w * (0.5 + 0.08 * Math.sin(s * 0.07)) - r, h * (0.42 + 0.05 * Math.cos(s * 0.09)) - r * 0.62, r * 2, r * 1.24);
    ctx.globalAlpha = A.nebulaAlpha * 0.9 * on;
    r = big * 0.7;
    ctx.drawImage(this.nebulaSteel, w * (0.86 - 0.06 * Math.sin(s * 0.05)) - r, h * (0.12 + 0.06 * Math.sin(s * 0.08)) - r * 0.7, r * 2, r * 1.4);
    ctx.globalAlpha = A.nebulaAlpha * 0.55 * on;
    r = big * 0.6;
    ctx.drawImage(this.nebulaGold, w * (0.1 + 0.05 * Math.cos(s * 0.06)) - r, h * (0.9 - 0.04 * Math.sin(s * 0.1)) - r * 0.6, r * 2, r * 1.2);

    // Dust motes with depth parallax (nearer = larger, brighter, faster).
    const span = w + 80;
    const vspan = h + 80;
    for (const m of this.motes) {
      const sp = 6 + m.z * 26;
      const x = ((m.x * span + s * sp * m.vx) % span) - 40;
      const y = (((m.y * vspan + s * sp * m.vy) % vspan) + vspan) % vspan - 40;
      const size = 1.2 + m.z * m.z * 9;
      const a = on * (0.12 + m.z * 0.5) * (0.6 + 0.4 * Math.sin(s * 0.9 + m.ph));
      ctx.globalAlpha = a * 0.55;
      ctx.drawImage(this.mote, x - size, y - size, size * 2, size * 2);
      if (m.z > 0.55) {
        glow.globalAlpha = a * 0.5;
        glow.drawImage(this.mote, x - size * 1.5, y - size * 1.5, size * 3, size * 3);
      }
    }
    glow.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // Blueprint grid: lines grow out from the centre, then hold very faint.
    const G = A.grid;
    const k = easeInOutSine(seg(t, G.draw[0], G.draw[1]));
    if (k <= 0) return;
    const inChapter = phaseAt(t).kind === "chapter";
    const cell = G.cell;
    const cx = w / 2;
    const cy = h * 0.46;
    const zoom = 1 + 0.03 * (t / TIMELINE.durationMs);
    const maxD = Math.max(cx, cy) / cell + 1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(zoom, zoom);
    ctx.globalAlpha = G.alpha * on * (inChapter ? G.chapterDim : 1);
    ctx.strokeStyle = "#C9B48A";
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    const nx = Math.ceil(cx / cell) + 1;
    const ny = Math.ceil(cy / cell) + 2;
    for (let i = -nx; i <= nx; i++) {
      const lk = clamp(k * 1.6 - (Math.abs(i) / maxD) * 0.6);
      if (lk <= 0) continue;
      const len = lk * (h * 0.62);
      ctx.moveTo(i * cell, -len);
      ctx.lineTo(i * cell, len);
    }
    for (let j = -ny; j <= ny; j++) {
      const lk = clamp(k * 1.6 - (Math.abs(j) / maxD) * 0.6);
      if (lk <= 0) continue;
      const len = lk * (w * 0.55);
      ctx.moveTo(-len, j * cell);
      ctx.lineTo(len, j * cell);
    }
    ctx.stroke();
    // Centre cross-hair, brighter.
    ctx.globalAlpha = G.alpha * 2.4 * on * (1 - 0.6 * k);
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(14, 0);
    ctx.moveTo(0, -14);
    ctx.lineTo(0, 14);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  private post(t: number) {
    const { ctx, w, h, dpr } = this;
    const [m0, m1, m2, m3] = this.mips;
    const M = CONFIG.bloom.mip;

    // ---- Bloom: downsample chain, then additive upsample chain ----
    const down = (src: HTMLCanvasElement, dst: Mip) => {
      dst.x.globalCompositeOperation = "copy";
      dst.x.globalAlpha = 1;
      dst.x.imageSmoothingEnabled = true;
      dst.x.drawImage(src, 0, 0, dst.c.width, dst.c.height);
    };
    down(this.glowC, m0);
    down(m0.c, m1);
    down(m1.c, m2);
    down(m2.c, m3);

    // Anamorphic streak from the 1/8 mip (two-pass horizontal smear).
    const streak = this.streakStrength(t);
    if (streak > 0.01) {
      const a = this.streakA;
      const b = this.streakB;
      const sw = a.c.width;
      a.x.globalCompositeOperation = "copy";
      a.x.globalAlpha = 1;
      a.x.drawImage(m1.c, 0, 0);
      a.x.globalCompositeOperation = "lighter";
      const step1 = Math.max(1, sw / 220);
      for (let i = 1; i <= 4; i++) {
        a.x.globalAlpha = 0.5 / i;
        a.x.drawImage(m1.c, i * step1, 0);
        a.x.drawImage(m1.c, -i * step1, 0);
      }
      b.x.globalCompositeOperation = "copy";
      b.x.globalAlpha = 0.5;
      b.x.drawImage(a.c, 0, 0);
      b.x.globalCompositeOperation = "lighter";
      const step2 = Math.max(2, sw / 34);
      for (let i = 1; i <= 7; i++) {
        b.x.globalAlpha = 0.42 * Math.pow(0.8, i);
        b.x.drawImage(a.c, i * step2, 0);
        b.x.drawImage(a.c, -i * step2, 0);
      }
    }

    m2.x.globalCompositeOperation = "lighter";
    m2.x.globalAlpha = M[3];
    m2.x.drawImage(m3.c, 0, 0, m2.c.width, m2.c.height);
    m1.x.globalCompositeOperation = "lighter";
    m1.x.globalAlpha = M[2];
    m1.x.drawImage(m2.c, 0, 0, m1.c.width, m1.c.height);
    if (streak > 0.01) {
      m1.x.globalAlpha = streak * CONFIG.streak.gain;
      m1.x.drawImage(this.streakB.c, 0, 0);
    }
    m0.x.globalCompositeOperation = "lighter";
    m0.x.globalAlpha = M[1];
    m0.x.drawImage(m1.c, 0, 0, m0.c.width, m0.c.height);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = CONFIG.bloom.core;
    ctx.drawImage(this.glowC, 0, 0, W, H);
    ctx.globalAlpha = Math.min(1, M[0] * CONFIG.bloom.gain);
    ctx.drawImage(m0.c, 0, 0, W, H);

    // ---- Light leaks at scene transitions ----
    const L = CONFIG.leak;
    for (let i = 1; i < TIMELINE.scenes.length; i++) {
      const tb = TIMELINE.scenes[i].start;
      const d = (t - tb) / L.spanMs;
      if (d < -1 || d > 1) continue;
      const k = Math.cos((d * Math.PI) / 2);
      const x = lerp(-0.15, 1.15, (d + 1) / 2) * w * dpr;
      const y = (i % 2 ? 0.18 : 0.82) * h * dpr;
      const rw = w * dpr * 0.75;
      const rh = h * dpr * 1.1;
      ctx.globalAlpha = L.alpha * k * k;
      ctx.drawImage(this.leak, x - rw / 2, y - rh / 2, rw, rh);
    }

    // ---- Vignette + grain ----
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(this.vignette.c, 0, 0, W, H);
    if (this.grain) {
      const fr = Math.floor(t / (1000 / CONFIG.grain.fps));
      const rng = mulberry32(fr + 17);
      const T = CONFIG.grain.tile;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.translate(-Math.floor(rng() * T), -Math.floor(rng() * T));
      ctx.globalAlpha = CONFIG.grain.alpha;
      ctx.fillStyle = this.grain;
      ctx.fillRect(0, 0, w + T, h + T);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
  }

  private streakStrength(t: number) {
    let s = CONFIG.streak.base * easeInOutSine(seg(t, 1800, 2600));
    for (const [at, amp, span] of CONFIG.streak.peaks) {
      const k = 1 - Math.abs(t - at) / span;
      if (k > 0) s += amp * easeInOutSine(k);
    }
    return s;
  }

  destroy() {
    this.glowC.width = this.glowC.height = 0;
    for (const m of this.mips) m.c.width = m.c.height = 0;
  }
}
