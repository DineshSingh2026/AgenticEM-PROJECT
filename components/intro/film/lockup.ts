import type { SceneFrame } from "./types";
import { COLORS, clamp, easeInOut, easeInOutSine, easeOut, lerp, mulberry32, seg } from "./util";

/**
 * Renders the real AGENTIUM lockup (emblem + wordmark + tagline PNGs) with a particle assembly,
 * specular sweeps, an orbiting glint and a soft-masked wordmark reveal. Shared by the logo and
 * outro scenes; each passes its own timing.
 */

const CONFIG = {
  /** Source geometry of the lockup in PNG px (the composite is 508x288). */
  src: {
    w: 508,
    h: 288,
    emblem: { w: 294, h: 188, y: 0 },
    wordmark: { w: 426, h: 60, y: 199 },
    tagline: { w: 508, h: 26, y: 262 },
    /** The emblem's orbit ring as an ellipse in emblem px (used for the glint + ring particles). */
    ring: { cx: 144, cy: 92, rx: 146, ry: 34, rot: -0.27 },
  },
  particles: { desktop: 3400, narrow: 1500, ringShare: 0.16, alphaMin: 140 },
  sweepWidth: 0.22,
  seed: 4711,
};

export interface LockupTiming {
  /** Spark ignites (fade in) and breathes until it bursts. */
  spark: readonly [number, number];
  /** Stage 1: particles burst from the spark into a tilted orbital dust disc. Each takes `burstMs`, starting within [a, b - burstMs]. */
  burst: readonly [number, number];
  burstMs: number;
  /** Stage 2: particles condense from the disc onto the emblem silhouette. */
  gather: readonly [number, number];
  gatherMs: number;
  /** Emblem image resolves from the particles. */
  resolve: readonly [number, number];
  particlesOut: readonly [number, number];
  sweep: readonly [number, number];
  word: readonly [number, number];
  wordSweep: readonly [number, number];
  tagline: readonly [number, number];
  /** Peak of the lens flare. */
  flare: number;
  flareMs: number;
  /** Swirl radius of the particle bloom, as a fraction of the lockup width. */
  bloomRadius: number;
}

export interface LockupLayout {
  cx: number;
  cy: number;
  /** Width of the full lockup in CSS px. */
  width: number;
}

type Particle = {
  u: number; // target in emblem px
  v: number;
  a0: number; // bloom angle
  r: number; // bloom radius factor
  delay: number;
  delay2: number;
  size: number;
  phase: number;
  bucket: number;
  ring: boolean;
};

const BUCKETS = [COLORS.goldDeep, COLORS.gold, COLORS.goldPale, "#FFF6E0", "#C9CED6"];

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

/** Pre-rendered sprites shared by all lockup instances. */
let sprites: { band: HTMLCanvasElement; dot: HTMLCanvasElement; streak: HTMLCanvasElement; ramp: HTMLCanvasElement; ringSprite: HTMLCanvasElement } | null = null;
function getSprites() {
  if (sprites) return sprites;
  // Specular band: soft gold-white vertical bar.
  const band = makeCanvas(256, 4);
  {
    const c = ctx2d(band);
    const g = c.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, "rgba(255,240,200,0)");
    g.addColorStop(0.3, "rgba(247,223,163,0.35)");
    g.addColorStop(0.5, "rgba(255,252,240,1)");
    g.addColorStop(0.7, "rgba(247,223,163,0.35)");
    g.addColorStop(1, "rgba(255,240,200,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 4);
  }
  // Soft round light.
  const dot = makeCanvas(64, 64);
  {
    const c = ctx2d(dot);
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,250,235,1)");
    g.addColorStop(0.18, "rgba(255,228,170,0.75)");
    g.addColorStop(0.45, "rgba(232,182,90,0.22)");
    g.addColorStop(1, "rgba(232,182,90,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  }
  // Horizontal anamorphic streak.
  const streak = makeCanvas(512, 32);
  {
    const c = ctx2d(streak);
    const g = c.createRadialGradient(256, 16, 0, 256, 16, 256);
    g.addColorStop(0, "rgba(255,248,230,1)");
    g.addColorStop(0.08, "rgba(247,223,163,0.6)");
    g.addColorStop(0.4, "rgba(232,182,90,0.12)");
    g.addColorStop(1, "rgba(232,182,90,0)");
    c.fillStyle = g;
    c.setTransform(1, 0, 0, 1 / 16, 0, 15);
    c.fillRect(0, 0, 512, 512);
  }
  // Soft alpha ramp for the wordmark mask: opaque on the left, transparent on the right.
  const ramp = makeCanvas(128, 2);
  {
    const c = ctx2d(ramp);
    const g = c.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 2);
  }
  // Thin ring for the shockwave.
  const ringSprite = makeCanvas(256, 256);
  {
    const c = ctx2d(ringSprite);
    const g = c.createRadialGradient(128, 128, 96, 128, 128, 128);
    g.addColorStop(0, "rgba(232,182,90,0)");
    g.addColorStop(0.75, "rgba(247,223,163,0.8)");
    g.addColorStop(1, "rgba(232,182,90,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
  }
  sprites = { band, dot, streak, ramp, ringSprite };
  return sprites;
}

export class Lockup {
  private particles: Particle[] = [];
  private byBucket: Particle[][] = [];
  private sampledFor = "";
  private fxE: HTMLCanvasElement | null = null;
  private fxW: HTMLCanvasElement | null = null;
  private fxEctx: CanvasRenderingContext2D | null = null;
  private fxWctx: CanvasRenderingContext2D | null = null;
  private fxScale = 1;
  private layout: LockupLayout = { cx: 0, cy: 0, width: 1 };

  constructor(
    private timing: LockupTiming,
    private layoutFor: (w: number, h: number, narrow: boolean) => LockupLayout,
  ) {}

  /** Recompute layout; particle targets are sampled lazily on the next draw (needs decoded assets). */
  resize(w: number, h: number) {
    this.layout = this.layoutFor(w, h, w < 760);
    this.sampledFor = "";
  }

  private geom() {
    const { cx, cy, width } = this.layout;
    const s = width / CONFIG.src.w;
    const top = cy - (CONFIG.src.h * s) / 2;
    const E = CONFIG.src.emblem;
    const W = CONFIG.src.wordmark;
    const T = CONFIG.src.tagline;
    return {
      s,
      ex: cx - (E.w * s) / 2,
      ey: top + E.y * s,
      ew: E.w * s,
      eh: E.h * s,
      wx: cx - (W.w * s) / 2,
      wy: top + W.y * s,
      ww: W.w * s,
      wh: W.h * s,
      tx: cx - (T.w * s) / 2,
      ty: top + T.y * s,
      tw: T.w * s,
      th: T.h * s,
      // Emblem visual centre (the spark position).
      scx: cx - (E.w * s) / 2 + CONFIG.src.ring.cx * s,
      scy: top + (CONFIG.src.ring.cy + 6) * s,
    };
  }

  private sample(f: SceneFrame) {
    const key = `${f.w}x${f.h}:${this.layout.width}`;
    if (key === this.sampledFor) return;
    this.sampledFor = key;
    const img = f.assets.emblem;
    const E = CONFIG.src.emblem;
    const R = CONFIG.src.ring;
    const c = makeCanvas(E.w, E.h);
    const x = ctx2d(c, { willReadFrequently: true });
    x.drawImage(img, 0, 0, E.w, E.h);
    const data = x.getImageData(0, 0, E.w, E.h).data;
    const pool: number[] = [];
    for (let y = 0; y < E.h; y++) {
      for (let xx = 0; xx < E.w; xx++) {
        if (data[(y * E.w + xx) * 4 + 3] > CONFIG.particles.alphaMin) pool.push(y * E.w + xx);
      }
    }
    const rng = mulberry32(CONFIG.seed);
    const n = f.narrow ? CONFIG.particles.narrow : CONFIG.particles.desktop;
    const nRing = Math.floor(n * CONFIG.particles.ringShare);
    this.particles = [];
    for (let i = 0; i < n; i++) {
      const ring = i < nRing;
      let u: number;
      let v: number;
      let bucket: number;
      if (ring || !pool.length) {
        const a = rng() * Math.PI * 2;
        const ex = Math.cos(a) * R.rx * (1 + (rng() - 0.5) * 0.05);
        const ey = Math.sin(a) * R.ry * (1 + (rng() - 0.5) * 0.12);
        u = R.cx + ex * Math.cos(R.rot) - ey * Math.sin(R.rot);
        v = R.cy + ex * Math.sin(R.rot) + ey * Math.cos(R.rot);
        bucket = rng() < 0.3 ? 2 : 1;
      } else {
        const idx = pool[Math.floor(rng() * pool.length)];
        u = (idx % E.w) + rng() - 0.5;
        v = Math.floor(idx / E.w) + rng() - 0.5;
        const o = idx * 4;
        const r = data[o];
        const g = data[o + 1];
        const b = data[o + 2];
        const mx = Math.max(r, g, b);
        const mn = Math.min(r, g, b);
        const sat = mx ? (mx - mn) / mx : 0;
        const lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
        bucket = sat < 0.22 ? (lum > 0.7 ? 3 : 4) : lum < 0.42 ? 0 : lum < 0.68 ? 1 : 2;
      }
      this.particles.push({
        u,
        v,
        a0: rng() * Math.PI * 2,
        r: 0.35 + Math.pow(rng(), 0.6) * 0.75,
        delay: rng(),
        delay2: Math.pow(rng(), 0.8),
        size: 0.7 + rng() * rng() * 1.5,
        phase: rng() * Math.PI * 2,
        bucket,
        ring,
      });
    }
    this.byBucket = BUCKETS.map(() => []);
    for (const p of this.particles) this.byBucket[p.bucket].push(p);

    // FX canvases at device resolution for the emblem + wordmark composites.
    const G = this.geom();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.fxScale = dpr;
    if (!this.fxE) {
      this.fxE = makeCanvas();
      this.fxW = makeCanvas();
      this.fxEctx = ctx2d(this.fxE);
      this.fxWctx = ctx2d(this.fxW!);
    }
    this.fxE.width = Math.max(1, Math.ceil(G.ew * dpr));
    this.fxE.height = Math.max(1, Math.ceil(G.eh * dpr));
    this.fxW!.width = Math.max(1, Math.ceil(G.ww * dpr));
    this.fxW!.height = Math.max(1, Math.ceil(G.wh * dpr));
  }

  /** Draw the lockup at scene time `ms` (ms since the scene's own zero). */
  draw(f: SceneFrame, ms: number) {
    this.sample(f);
    const T = this.timing;
    const { ctx, glow } = f;
    const G = this.geom();
    const base = ctx.globalAlpha;
    const gBase = glow.globalAlpha;
    const S = getSprites();

    // ---- Spark ------------------------------------------------------------------------------
    const sparkIn = easeOut(seg(ms, T.spark[0], T.spark[1]));
    const burst = Math.sin(Math.PI * seg(ms, T.burst[0] - 120, T.burst[0] + 500));
    const sparkFade = 1 - easeInOut(seg(ms, T.burst[0] + 150, T.gather[1]));
    const sparkA = sparkIn * sparkFade;
    if (sparkA > 0.001) {
      const breathe = 1 + Math.sin(ms / 190) * 0.07;
      const r = G.s * lerp(2.5, 10, sparkIn) * breathe * (1 + burst * 0.9);
      glow.globalAlpha = gBase * sparkA;
      glow.drawImage(S.dot, G.scx - r * 2, G.scy - r * 2, r * 4, r * 4);
      glow.drawImage(S.streak, G.scx - r * 9, G.scy - r * 0.35, r * 18, r * 0.7);
      ctx.globalAlpha = base * sparkA;
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(S.dot, G.scx - r, G.scy - r, r * 2, r * 2);
      ctx.globalCompositeOperation = "source-over";
    }

    // ---- Particles --------------------------------------------------------------------------
    const pOut = 1 - easeInOut(seg(ms, T.particlesOut[0], T.particlesOut[1]));
    const bSpan = Math.max(1, T.burst[1] - T.burst[0] - T.burstMs);
    const gSpan = Math.max(1, T.gather[1] - T.gather[0] - T.gatherMs);
    if (pOut > 0.001 && ms > T.burst[0]) {
      const R = T.bloomRadius * this.layout.width;
      const ringR = CONFIG.src.ring;
      const cr = Math.cos(ringR.rot);
      const sr = Math.sin(ringR.rot);
      const time = ms / 1000;
      ctx.globalCompositeOperation = "lighter";
      for (let b = 0; b < this.byBucket.length; b++) {
        ctx.fillStyle = BUCKETS[b];
        glow.fillStyle = BUCKETS[b];
        const list = this.byBucket[b];
        for (let i = 0; i < list.length; i++) {
          const q = list[i];
          const kA = (ms - (T.burst[0] + q.delay * bSpan)) / T.burstMs;
          if (kA <= 0) continue;
          const kB = clamp((ms - (T.gather[0] + q.delay2 * gSpan)) / T.gatherMs);
          // Stage 1 — orbital disc, tilted like the emblem's ring, slowly turning.
          const ea = easeOut(Math.min(1, kA));
          const ang = q.a0 + time * 0.42 + (1 - ea) * 1.4;
          const rr = R * q.r * ea;
          const ox = Math.cos(ang) * rr;
          const oy = Math.sin(ang) * rr * 0.34;
          const dx = G.scx + ox * cr - oy * sr;
          const dy = G.scy + ox * sr + oy * cr;
          // Stage 2 — condense onto the silhouette (ring particles keep orbiting on the ring).
          let tx: number;
          let ty: number;
          if (q.ring) {
            const a2 = q.a0 + time * 0.55;
            const ex = Math.cos(a2) * ringR.rx;
            const ey = Math.sin(a2) * ringR.ry;
            tx = G.ex + (ringR.cx + ex * cr - ey * sr) * G.s;
            ty = G.ey + (ringR.cy + ex * sr + ey * cr) * G.s;
          } else {
            tx = G.ex + q.u * G.s;
            ty = G.ey + q.v * G.s;
          }
          const k = easeInOut(kB);
          // Slight arc on the way in.
          const bow = Math.sin(Math.PI * k) * 0.18;
          const x = lerp(dx, tx, k) + (dy - ty) * bow;
          const y = lerp(dy, ty, k) - (dx - tx) * bow * 0.4;
          const tw = 0.6 + 0.4 * Math.sin(time * 3.3 + q.phase);
          const a = clamp(kA * 5) * pOut * tw * lerp(0.75, 1, k);
          const sz = q.size * G.s * lerp(1.25, 1.05, k);
          ctx.globalAlpha = base * a;
          ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
          if ((i & 3) === 0) {
            glow.globalAlpha = gBase * a * lerp(0.7, 0.3, k);
            glow.fillRect(x - sz, y - sz, sz * 2, sz * 2);
          }
        }
      }
      ctx.globalCompositeOperation = "source-over";
    }

    // ---- Emblem image -----------------------------------------------------------------------
    const res = easeInOut(seg(ms, T.resolve[0], T.resolve[1]));
    if (res > 0.001) {
      const sc = lerp(1.035, 1, easeOut(seg(ms, T.resolve[0], T.resolve[1] + 600)));
      const ew = G.ew * sc;
      const eh = G.eh * sc;
      const ex = G.scx - (G.scx - G.ex) * sc;
      const ey = G.scy - (G.scy - G.ey) * sc;
      ctx.globalAlpha = base * res;
      ctx.drawImage(f.assets.emblem, ex, ey, ew, eh);
      // Radiance on resolve.
      const flash = Math.sin(Math.PI * seg(ms, T.resolve[0], T.resolve[1] + 500));
      glow.globalAlpha = gBase * res * (0.22 + 0.5 * flash);
      glow.drawImage(f.assets.emblem, ex, ey, ew, eh);

      // Highlights clipped to the emblem's alpha.
      const sweepK = seg(ms, T.sweep[0], T.sweep[1]);
      const glintOn = seg(ms, T.resolve[0] + 200, T.resolve[1] + 400);
      const fx = this.fxEctx!;
      const fc = this.fxE!;
      const d = this.fxScale;
      fx.setTransform(1, 0, 0, 1, 0, 0);
      fx.globalCompositeOperation = "source-over";
      fx.globalAlpha = 1;
      fx.clearRect(0, 0, fc.width, fc.height);
      fx.setTransform(d, 0, 0, d, 0, 0);
      let any = false;
      if (sweepK > 0 && sweepK < 1) {
        any = true;
        const bw = G.ew * CONFIG.sweepWidth;
        const x = lerp(-bw * 1.5, G.ew + bw * 1.5, easeInOutSine(sweepK));
        fx.save();
        fx.translate(x, G.eh / 2);
        fx.rotate(0.38);
        fx.globalAlpha = Math.sin(Math.PI * sweepK) * 0.9 + 0.1;
        fx.drawImage(S.band, -bw / 2, -G.eh, bw, G.eh * 2);
        fx.restore();
      }
      if (glintOn > 0) {
        const R = CONFIG.src.ring;
        const a = ms / 650;
        const front = clamp(Math.sin(a) * 2.2);
        if (front > 0) {
          any = true;
          const ex2 = Math.cos(a) * R.rx;
          const ey2 = Math.sin(a) * R.ry;
          const gx = (R.cx + ex2 * Math.cos(R.rot) - ey2 * Math.sin(R.rot)) * G.s;
          const gy = (R.cy + ex2 * Math.sin(R.rot) + ey2 * Math.cos(R.rot)) * G.s;
          const gr = G.s * 34;
          fx.globalAlpha = front * glintOn;
          fx.drawImage(S.dot, gx - gr, gy - gr, gr * 2, gr * 2);
          glow.globalAlpha = gBase * res * front * glintOn * 0.9;
          const sr = G.s * 16;
          glow.drawImage(S.dot, G.ex + gx - sr, G.ey + gy - sr, sr * 2, sr * 2);
          glow.drawImage(S.streak, G.ex + gx - sr * 4, G.ey + gy - sr * 0.12, sr * 8, sr * 0.24);
        }
      }
      if (any) {
        fx.globalAlpha = 1;
        fx.globalCompositeOperation = "destination-in";
        fx.drawImage(f.assets.emblem, 0, 0, G.ew, G.eh);
        fx.globalCompositeOperation = "source-over";
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = base * res;
        ctx.drawImage(fc, ex, ey, ew, eh);
        ctx.globalCompositeOperation = "source-over";
        glow.globalAlpha = gBase * res * 0.8;
        glow.drawImage(fc, ex, ey, ew, eh);
      }
    }

    // ---- Lens flare at the peak -------------------------------------------------------------
    const fl = 1 - Math.min(1, Math.abs(ms - T.flare) / T.flareMs);
    if (fl > 0) {
      const k = easeInOutSine(fl);
      const L = this.layout.width * 1.5;
      glow.globalAlpha = gBase * k * 0.6;
      glow.drawImage(S.streak, G.scx - L / 2, G.scy - L * 0.008, L, L * 0.016);
      glow.globalAlpha = gBase * k * 0.32;
      const r = G.s * 70;
      glow.drawImage(S.dot, G.scx - r, G.scy - r, r * 2, r * 2);
      // Expanding thin shockwave ring.
      const sk = seg(ms, T.flare - 150, T.flare + T.flareMs * 1.4);
      if (sk > 0 && sk < 1) {
        const rr = G.s * lerp(60, 520, easeOut(sk));
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = base * (1 - sk) * 0.07;
        ctx.drawImage(S.ringSprite, G.scx - rr, G.scy - rr * 0.42, rr * 2, rr * 0.84);
        ctx.globalCompositeOperation = "source-over";
      }
      // Ghost discs along the flare axis.
      const ox = f.w / 2;
      const oy = f.h / 2;
      glow.globalAlpha = gBase * k * 0.08;
      for (let i = 1; i <= 3; i++) {
        const t2 = -0.35 * i;
        const gx = ox + (G.scx - ox) * t2;
        const gy = oy + (G.scy - oy) * t2;
        const gr = G.s * (14 + i * 10);
        glow.drawImage(S.dot, gx - gr, gy - gr, gr * 2, gr * 2);
      }
    }

    // ---- Wordmark: soft-masked reveal + sweep -----------------------------------------------
    const wk = seg(ms, T.word[0], T.word[1]);
    if (wk > 0) {
      const wx = this.fxWctx!;
      const wc = this.fxW!;
      const d = this.fxScale;
      wx.setTransform(1, 0, 0, 1, 0, 0);
      wx.globalAlpha = 1;
      wx.globalCompositeOperation = "source-over";
      wx.clearRect(0, 0, wc.width, wc.height);
      wx.setTransform(d, 0, 0, d, 0, 0);
      wx.drawImage(f.assets.wordmark, 0, 0, G.ww, G.wh);
      const sk = seg(ms, T.wordSweep[0], T.wordSweep[1]);
      if (sk > 0 && sk < 1) {
        const bw = G.ww * 0.16;
        const x = lerp(-bw, G.ww + bw, easeInOutSine(sk));
        wx.save();
        wx.globalCompositeOperation = "source-atop";
        wx.translate(x, G.wh / 2);
        wx.rotate(0.32);
        wx.globalAlpha = 0.85 * Math.sin(Math.PI * sk);
        wx.drawImage(S.band, -bw / 2, -G.wh * 2, bw, G.wh * 4);
        wx.restore();
      }
      const soft = G.ww * 0.28;
      const edge = lerp(-soft * 0.2, G.ww + soft, easeInOutSine(wk));
      if (wk < 1) {
        // Erase right of the reveal edge, with a soft ramp leading into it.
        wx.globalCompositeOperation = "destination-out";
        wx.save();
        wx.translate(edge, 0);
        wx.scale(-1, 1);
        wx.drawImage(S.ramp, 0, 0, soft, G.wh);
        wx.restore();
        wx.fillStyle = "#000";
        wx.fillRect(edge, 0, G.ww + soft, G.wh);
        wx.globalCompositeOperation = "source-over";
      }
      const rise = (1 - easeOut(wk)) * G.wh * 0.18;
      ctx.globalAlpha = base;
      ctx.drawImage(wc, G.wx, G.wy + rise, G.ww, G.wh);
      glow.globalAlpha = gBase * (0.18 + (sk > 0 && sk < 1 ? 0.4 * Math.sin(Math.PI * sk) : 0));
      glow.drawImage(wc, G.wx, G.wy + rise, G.ww, G.wh);
      // Leading-edge light.
      if (wk < 1) {
        const ea = Math.sin(Math.PI * wk);
        const lx = G.wx + edge - soft * 0.5;
        glow.globalAlpha = gBase * ea * 0.7;
        glow.drawImage(S.dot, lx - G.wh * 0.6, G.wy - G.wh * 0.4, G.wh * 1.2, G.wh * 1.8);
      }
    }

    // ---- Tagline ----------------------------------------------------------------------------
    const tk = easeInOut(seg(ms, T.tagline[0], T.tagline[1]));
    if (tk > 0) {
      const sx = lerp(1.08, 1, easeOut(seg(ms, T.tagline[0], T.tagline[1] + 500)));
      const tw = G.tw * sx;
      ctx.globalAlpha = base * tk * 0.92;
      ctx.drawImage(f.assets.tagline, this.layout.cx - tw / 2, G.ty, tw, G.th);
    }

    ctx.globalAlpha = base;
    glow.globalAlpha = gBase;
    ctx.globalCompositeOperation = "source-over";
  }

  /** Emblem centre in stage px — where the spark sits. */
  get center() {
    const G = this.geom();
    return { x: G.scx, y: G.scy, s: G.s };
  }
}

