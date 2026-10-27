import type { FilmScene, SceneFrame } from "../types";
import { COLORS, clamp, easeInOut, easeOut, hexHash, mulberry32, rgba, seg } from "../util";
import { copy } from "@/content/copy";
import { introScenesB as S } from "@/content/copy/intro-scenes-b";
import type { AnomalyRule, Severity } from "@/lib/sim/types";

/**
 * 04 — "Risk, caught live".
 * A silky multi-strand telemetry waveform streams right→left. Anomaly spikes rise in gold (red for
 * high severity) and ride into a frosted ML filter gate, which locks on, flashes and posts each
 * catch as an alert row top-left. Pure function of `local` (seekable).
 */
const CONFIG = {
  seed: 0x815c,
  /** Stream speed as a fraction of stage width per ms. */
  speed: 1 / 5200,
  strands: 9,
  backLines: 4,
  step: 4,
  stepNarrow: 3,
  spikes: [
    { catchAt: 840, rule: "Velocity spike", severity: "med", score: 0.82 },
    { catchAt: 1560, rule: "Collusion signal", severity: "high", score: 0.96 },
    { catchAt: 2260, rule: "Bot fingerprint drift", severity: "med", score: 0.77 },
    { catchAt: 2920, rule: "Wallet mismatch", severity: "low", score: 0.71 },
  ] as { catchAt: number; rule: AnomalyRule; severity: Severity; score: number }[],
  /** Lock-on reticle lead before catch, ms. */
  lockLead: 520,
  /** Rise period before catch, ms. */
  riseFrom: 1700,
  riseTo: 380,
  rowSlideMs: 620,
  /** Older rows step down before the new one slides in. */
  pushMs: 420,
  maxRows: 4,
} as const;

const TAU = Math.PI * 2;

interface SpikeLayout {
  catchAt: number;
  rule: string;
  agent: string;
  score: number;
  scoreText: string;
  high: boolean;
  sev: string;
  color: string;
}

export function createRiskScene(): FilmScene {
  let W = 0;
  let H = 0;
  let narrow = false;
  let mid = 0;
  let amp = 0;
  let spikeH = 0;
  let sigma = 0;
  let v = 0;
  let catchX = 0;
  let gw = 0;
  let gTop = 0;
  let gBot = 0;
  let listX = 0;
  let listY = 0;
  let rowH = 0;
  let axisY = 0;
  let step = 4;
  let pts = 0;
  let xs = new Float32Array(0);
  let bumpBuf = new Float32Array(0);
  const spikes: SpikeLayout[] = [];
  let gateFill: CanvasGradient | null = null;
  let gateCtx: CanvasRenderingContext2D | null = null;
  let spriteGold: HTMLCanvasElement | null = null;
  let spriteRed: HTMLCanvasElement | null = null;
  let spriteWhite: HTMLCanvasElement | null = null;

  function makeSprite(core: string, mid1: string, edge: string) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g2 = c.getContext("2d");
    if (!g2) return c;
    const g = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, core);
    g.addColorStop(0.2, mid1);
    g.addColorStop(0.5, edge);
    g.addColorStop(1, "rgba(0,0,0,0)");
    g2.fillStyle = g;
    g2.fillRect(0, 0, 64, 64);
    return c;
  }
  function ensureSprites() {
    if (spriteGold || typeof document === "undefined") return;
    spriteGold = makeSprite("rgba(255,244,214,1)", rgba(COLORS.goldPale, 0.8), rgba(COLORS.gold, 0.28));
    spriteRed = makeSprite("rgba(255,226,222,1)", rgba(COLORS.red, 0.8), rgba(COLORS.red, 0.26));
    spriteWhite = makeSprite("rgba(255,255,255,0.9)", "rgba(220,232,245,0.5)", rgba(COLORS.steel, 0.15));
  }
  function glowAt(g: CanvasRenderingContext2D, sp: HTMLCanvasElement | null, x: number, y: number, r: number, a: number, base: number) {
    if (!sp || a <= 0.003) return;
    g.globalAlpha = base * clamp(a);
    g.drawImage(sp, x - r, y - r, r * 2, r * 2);
  }

  function label(
    ctx: CanvasRenderingContext2D,
    font: string,
    text: string,
    x: number,
    y: number,
    color: string,
    a: number,
    align: CanvasTextAlign,
    size: number,
    tracking = 0.14,
    weight = 500,
  ) {
    if (a <= 0.002) return;
    const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
    c.globalAlpha = a;
    c.font = `${weight} ${size}px ${font}`;
    c.fillStyle = color;
    c.textAlign = align;
    c.textBaseline = "middle";
    if ("letterSpacing" in c) c.letterSpacing = `${(size * tracking).toFixed(1)}px`;
    c.fillText(text, x, y);
    if ("letterSpacing" in c) c.letterSpacing = "0px";
  }

  function resize(w: number, h: number) {
    W = w;
    H = h;
    narrow = w < 760;
    const bar = clamp(h * 0.08, 44, 84);
    // Narrow screens keep a desktop-like stream speed so spikes stay well apart.
    v = Math.max(w, 1100) * CONFIG.speed;
    step = narrow ? CONFIG.stepNarrow : CONFIG.step;
    if (narrow) {
      mid = h * 0.495;
      amp = h * 0.016;
      spikeH = h * 0.12;
      sigma = 11;
      catchX = w * 0.5;
      gw = 62;
      gTop = mid - h * 0.155;
      gBot = mid + h * 0.115;
      listX = 26;
      listY = h * 0.205;
      rowH = 21;
      axisY = mid + h * 0.085;
    } else {
      mid = h * 0.39;
      amp = h * 0.024;
      spikeH = h * 0.19;
      sigma = 19;
      catchX = w * 0.56;
      gw = clamp(w * 0.085, 96, 140);
      gTop = mid - h * 0.245;
      gBot = mid + h * 0.15;
      listX = w * 0.06;
      listY = bar + 36;
      rowH = 27;
      axisY = mid + h * 0.115;
    }
    pts = Math.ceil((w + 40) / step) + 1;
    xs = new Float32Array(pts);
    bumpBuf = new Float32Array(pts);
    for (let i = 0; i < pts; i++) xs[i] = -20 + i * step;

    const rng = mulberry32(CONFIG.seed);
    spikes.length = 0;
    for (const s of CONFIG.spikes) {
      const high = s.severity === "high";
      spikes.push({
        catchAt: s.catchAt,
        rule: s.rule.toUpperCase(),
        agent: `agt_${hexHash(rng, 3)}`,
        score: s.score,
        scoreText: s.score.toFixed(2),
        high,
        sev: S.severity[s.severity],
        color: high ? COLORS.red : COLORS.gold,
      });
    }
    gateFill = null;
    gateCtx = null;
  }

  /** x of spike at time `local`. */
  const spikeX = (s: SpikeLayout, local: number) => catchX + (s.catchAt - local) * v;
  /** Height multiplier of a spike (rise in, neutralise after catch). */
  const spikeAmp = (s: SpikeLayout, local: number) => {
    const rise = easeOut(seg(local, s.catchAt - CONFIG.riseFrom, s.catchAt - CONFIG.riseTo));
    const settle = 1 - 0.72 * easeInOut(seg(local, s.catchAt + 120, s.catchAt + 900));
    return rise * settle;
  };

  /** Base waveform (no spikes) at x for strand offset o. */
  const wave = (x: number, local: number, o: number, k: number) => {
    const u = x + local * v;
    return (
      Math.sin(u * 0.0105 * k + o) * 1.0 +
      Math.sin(u * 0.0047 * k + o * 1.7 + 1.3) * 0.75 +
      Math.sin(u * 0.0213 + o * 0.6 + local * 0.0007) * 0.28
    );
  };

  function computeBumps(local: number) {
    bumpBuf.fill(0);
    const inv = 1 / (2 * sigma * sigma);
    const reach = sigma * 4;
    for (let s = 0; s < spikes.length; s++) {
      const sp = spikes[s];
      const a = spikeAmp(sp, local);
      if (a <= 0.001) continue;
      const sx = spikeX(sp, local);
      if (sx < -reach || sx > W + reach) continue;
      const hgt = sp.score * spikeH * a;
      const i0 = Math.max(0, Math.floor((sx - reach + 20) / step));
      const i1 = Math.min(pts - 1, Math.ceil((sx + reach + 20) / step));
      for (let i = i0; i <= i1; i++) {
        const dx = xs[i] - sx;
        // Main peak plus a small leading undershoot for a natural signal shape.
        bumpBuf[i] += hgt * (Math.exp(-dx * dx * inv) - 0.08 * Math.exp(-(dx + sigma * 2.2) * (dx + sigma * 2.2) * inv * 1.4));
      }
    }
  }

  function strokeStrand(ctx: CanvasRenderingContext2D, local: number, j: number, n: number, i0 = 0, i1 = -1) {
    const o = j * 0.32;
    const spread = (j - (n - 1) / 2) / ((n - 1) / 2 || 1); // -1..1
    const k = 1 + spread * 0.035;
    const ampJ = amp * (1 - Math.abs(spread) * 0.25);
    const bumpK = 1 - Math.abs(spread) * 0.35;
    const yOff = spread * amp * 0.55;
    const end = i1 < 0 ? pts - 1 : i1;
    ctx.beginPath();
    for (let i = i0; i <= end; i++) {
      const x = xs[i];
      const y = mid + yOff + wave(x, local, o, k) * ampJ - bumpBuf[i] * bumpK;
      if (i === i0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function mainY(i: number, local: number) {
    return mid + wave(xs[i], local, ((CONFIG.strands - 1) / 2) * 0.32, 1) * amp - bumpBuf[i];
  }

  function drawBack(ctx: CanvasRenderingContext2D, local: number, base: number, reveal: number) {
    // Faint, wide, slow lines for depth (reads as out-of-focus background telemetry).
    for (let j = 0; j < CONFIG.backLines; j++) {
      const off = (j - 1.5) * amp * 3.2;
      const sp = 0.45 + j * 0.12;
      ctx.lineWidth = 6 - j;
      ctx.strokeStyle = COLORS.steel;
      ctx.globalAlpha = base * reveal * (0.045 + j * 0.01);
      ctx.beginPath();
      for (let i = 0; i < pts; i += 2) {
        const x = xs[i];
        const u = x + local * v * sp;
        const y = mid + off + Math.sin(u * 0.0062 + j * 2.1) * amp * 2.4 + Math.sin(u * 0.0021 + j) * amp * 1.6;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Time axis with scrolling ticks.
    ctx.globalAlpha = base * reveal * 0.5;
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, axisY);
    ctx.lineTo(W, axisY);
    const tickGap = narrow ? 36 : 48;
    let t0 = -((local * v) % tickGap);
    if (t0 > 0) t0 -= tickGap;
    let idx = Math.floor((local * v) / tickGap);
    for (let x = t0; x < W; x += tickGap, idx++) {
      const major = ((idx % 5) + 5) % 5 === 0;
      ctx.moveTo(x, axisY);
      ctx.lineTo(x, axisY + (major ? 7 : 3));
    }
    ctx.stroke();
  }

  function drawGate(f: SceneFrame, base: number, local: number, reveal: number, catchPulse: number) {
    const { ctx, glow } = f;
    const gx = catchX - gw / 2;
    const gh = gBot - gTop;
    const open = easeInOut(seg(local, -250, 650));
    const top = gTop + (gh / 2) * (1 - open);
    const hh = gh * open;
    if (hh <= 1) return;
    if (!gateFill || gateCtx !== ctx) {
      gateCtx = ctx;
      gateFill = ctx.createLinearGradient(gx, 0, gx + gw, 0);
      gateFill.addColorStop(0, "rgba(232,236,242,0.07)");
      gateFill.addColorStop(0.5, "rgba(232,236,242,0.025)");
      gateFill.addColorStop(1, "rgba(232,236,242,0.07)");
    }
    // Frost: darken what's behind, then a soft light veil.
    ctx.globalAlpha = base * reveal * 0.55;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(gx, top, gw, hh);
    ctx.globalAlpha = base * reveal;
    ctx.fillStyle = gateFill;
    ctx.fillRect(gx, top, gw, hh);
    // Fine scan texture.
    ctx.globalAlpha = base * reveal * 0.05;
    ctx.fillStyle = COLORS.text;
    for (let y = top + 2; y < top + hh; y += 4) ctx.fillRect(gx + 1, y, gw - 2, 1);
    // Sweeping scan band.
    let q = local / 1700;
    q -= Math.floor(q);
    const sy = top + q * hh;
    ctx.globalAlpha = base * reveal * 0.16 * Math.sin(Math.PI * q);
    ctx.fillStyle = COLORS.goldPale;
    ctx.fillRect(gx + 1, sy, gw - 2, 1);
    ctx.globalAlpha = base * reveal * 0.04 * Math.sin(Math.PI * q);
    ctx.fillRect(gx + 1, sy - 14, gw - 2, 14);
    // Edges.
    ctx.lineWidth = 1;
    ctx.strokeStyle = COLORS.gold;
    ctx.globalAlpha = base * reveal * (0.42 + 0.5 * catchPulse);
    ctx.beginPath();
    ctx.moveTo(gx + 0.5, top);
    ctx.lineTo(gx + 0.5, top + hh);
    ctx.moveTo(gx + gw - 0.5, top);
    ctx.lineTo(gx + gw - 0.5, top + hh);
    ctx.stroke();
    // Caps.
    ctx.globalAlpha = base * reveal * 0.9;
    ctx.beginPath();
    ctx.moveTo(gx - 4, top);
    ctx.lineTo(gx + gw + 4, top);
    ctx.moveTo(gx - 4, top + hh);
    ctx.lineTo(gx + gw + 4, top + hh);
    ctx.stroke();
    glow.globalAlpha = base * reveal * (0.18 + 0.5 * catchPulse);
    glow.strokeStyle = COLORS.gold;
    glow.lineWidth = 2;
    glow.beginPath();
    glow.moveTo(gx, top);
    glow.lineTo(gx, top + hh);
    glow.moveTo(gx + gw, top);
    glow.lineTo(gx + gw, top + hh);
    glow.stroke();
    if (catchPulse > 0) {
      glow.globalAlpha = base * catchPulse * 0.035;
      glow.fillStyle = COLORS.gold;
      glow.fillRect(gx, top, gw, hh);
    }
    // Labels.
    const la = base * seg(local, 150, 650);
    label(ctx, f.fonts.mono, copy.intro.canvas.filter, catchX, gTop - (narrow ? 12 : 16), COLORS.goldPale, la * 0.9, "center", narrow ? 8.5 : 10, narrow ? 0.1 : 0.16);
    label(ctx, f.fonts.mono, S.gateSub, catchX, gBot + (narrow ? 12 : 16), COLORS.faint, la * 0.8, "center", narrow ? 8 : 9);
  }

  function drawWave(f: SceneFrame, base: number, local: number, reveal: number) {
    const { ctx, glow } = f;
    const n = CONFIG.strands;
    const centre = (n - 1) / 2;
    ctx.lineJoin = "round";
    for (let j = 0; j < n; j++) {
      const d = Math.abs(j - centre) / centre;
      ctx.lineWidth = j === centre ? 1.6 : 1;
      ctx.strokeStyle = j === centre ? "#E6EEF7" : COLORS.steel;
      ctx.globalAlpha = base * reveal * (j === centre ? 0.95 : 0.1 + 0.32 * (1 - d));
      strokeStrand(ctx, local, j, n);
    }
    // Soft glow of the hero strand.
    glow.lineWidth = 2;
    glow.strokeStyle = COLORS.steel;
    glow.globalAlpha = base * reveal * 0.22;
    strokeStrand(glow, local, centre, n);

    // Inside the gate the stream is "processed": tint gold.
    const gx = catchX - gw / 2;
    const i0 = Math.max(0, Math.floor((gx + 20) / step));
    const i1 = Math.min(pts - 1, Math.ceil((gx + gw + 20) / step));
    ctx.strokeStyle = COLORS.goldPale;
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = base * reveal * 0.9;
    strokeStrand(ctx, local, centre, n, i0, i1);
    ctx.lineWidth = 1;
    ctx.globalAlpha = base * reveal * 0.25;
    ctx.strokeStyle = COLORS.gold;
    strokeStrand(ctx, local, centre - 2, n, i0, i1);
    strokeStrand(ctx, local, centre + 2, n, i0, i1);

    // Spike highlights: coloured segment of the hero strand around each spike.
    for (let s = 0; s < spikes.length; s++) {
      const sp = spikes[s];
      const a = spikeAmp(sp, local);
      if (a < 0.03) continue;
      const sx = spikeX(sp, local);
      if (sx < -60 || sx > W + 60) continue;
      const caught = local >= sp.catchAt;
      const heat = caught ? 1 - 0.6 * seg(local, sp.catchAt, sp.catchAt + 900) : 1;
      const a0 = Math.max(0, Math.floor((sx - sigma * 3 + 20) / step));
      const a1 = Math.min(pts - 1, Math.ceil((sx + sigma * 3 + 20) / step));
      ctx.strokeStyle = sp.color;
      ctx.lineWidth = 1.8;
      ctx.globalAlpha = base * reveal * clamp(a * 1.4) * heat;
      strokeStrand(ctx, local, centre, n, a0, a1);
      glow.strokeStyle = sp.color;
      glow.lineWidth = 3;
      glow.globalAlpha = base * reveal * clamp(a * 1.4) * heat * 0.9;
      strokeStrand(glow, local, centre, n, a0, a1);
    }
  }

  function drawMarkers(f: SceneFrame, base: number, local: number) {
    const { ctx, glow } = f;
    for (let s = 0; s < spikes.length; s++) {
      const sp = spikes[s];
      const a = spikeAmp(sp, local);
      if (a < 0.03) continue;
      const sx = spikeX(sp, local);
      if (sx < -60 || sx > W + 60) continue;
      const i = clamp(Math.round((sx + 20) / step), 0, pts - 1);
      const py = mainY(i, local);
      const spr = sp.high ? spriteRed : spriteGold;
      const dt = local - sp.catchAt;
      // Peak head.
      ctx.globalAlpha = base * clamp(a * 1.5);
      ctx.fillStyle = dt < 0 ? "#FFF6E0" : sp.color;
      ctx.beginPath();
      ctx.arc(sx, py, 2.6, 0, TAU);
      ctx.fill();
      glowAt(glow, spr, sx, py, 18, clamp(a * 1.5) * (dt < 0 ? 0.9 : 0.5), base);

      // Lock-on reticle converging onto the spike.
      const lu = seg(local, sp.catchAt - CONFIG.lockLead, sp.catchAt);
      const out = seg(dt, 0, 520);
      if (lu > 0 && out < 1) {
        const e = easeInOut(lu);
        const size = (narrow ? 15 : 20) + (1 - e) * (narrow ? 22 : 34) + out * 10;
        const rot = (1 - e) * (Math.PI / 9);
        const ra = base * Math.min(1, lu * 2.2) * (1 - out);
        const arm = size * 0.42;
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        ctx.strokeStyle = sp.color;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = ra;
        ctx.beginPath();
        for (let c = 0; c < 4; c++) {
          const sxn = c === 0 || c === 3 ? -1 : 1;
          const syn = c < 2 ? -1 : 1;
          // Corner point and its two arms in rotated frame.
          for (let k = 0; k < 3; k++) {
            const qx = k === 2 ? sxn * size - sxn * arm : sxn * size;
            const qy = k === 0 ? syn * size - syn * arm : syn * size;
            const rx = sx + qx * cos - qy * sin;
            const ry = py + qx * sin + qy * cos;
            if (k === 0) ctx.moveTo(rx, ry);
            else ctx.lineTo(rx, ry);
          }
        }
        ctx.stroke();
        // Cross-hair ticks.
        ctx.globalAlpha = ra * 0.6;
        ctx.beginPath();
        ctx.moveTo(sx - size - 8, py);
        ctx.lineTo(sx - size - 2, py);
        ctx.moveTo(sx + size + 2, py);
        ctx.lineTo(sx + size + 8, py);
        ctx.stroke();
        if (dt < 0 && !narrow) {
          label(ctx, f.fonts.mono, `${S.lock} ${sp.scoreText}`, sx + size + 12, py - size + 4, sp.color, ra * 0.9, "left", 9);
        }
      }

      // Catch flash.
      if (dt >= 0 && dt < 700) {
        const fl = Math.pow(1 - dt / 700, 2);
        glowAt(glow, spr, sx, py, (narrow ? 60 : 96) * (0.6 + 0.4 * (1 - fl)), fl, base);
        glowAt(glow, spriteWhite, sx, py, 26, fl, base);
        // Horizontal light streak.
        glow.globalAlpha = base * fl * 0.7;
        glow.fillStyle = sp.color;
        const sw = (narrow ? 90 : 170) * (0.4 + 0.6 * easeOut(dt / 700));
        glow.fillRect(sx - sw, py - 1, sw * 2, 2);
        ctx.globalAlpha = base * fl;
        ctx.strokeStyle = sp.color;
        ctx.lineWidth = 1;
        const rr = 6 + easeOut(dt / 700) * (narrow ? 26 : 40);
        ctx.beginPath();
        ctx.arc(sx, py, rr, 0, TAU);
        ctx.stroke();
      }

      // Persistent triangle marker after catch.
      if (dt >= 0) {
        const ta = base * easeOut(seg(dt, 60, 360)) * clamp((sx + 30) / 120);
        const drop = (1 - easeOut(seg(dt, 60, 420))) * -10;
        const ty = py - 14 + drop;
        ctx.globalAlpha = ta;
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.moveTo(sx, ty);
        ctx.lineTo(sx - 5.5, ty - 9);
        ctx.lineTo(sx + 5.5, ty - 9);
        ctx.closePath();
        ctx.fill();
        glowAt(glow, spr, sx, ty - 4, 12, ta * 0.6, 1);
        if (!narrow) label(ctx, f.fonts.mono, sp.scoreText, sx, ty - 19, sp.color, ta * 0.85, "center", 9, 0.08);
      }
    }
  }

  function drawAlerts(f: SceneFrame, base: number, local: number) {
    const { ctx, glow } = f;
    const mono = f.fonts.mono;
    const titleA = base * easeOut(seg(local, 200, 700));
    label(ctx, mono, copy.intro.canvas.alertsTitle, listX, listY, COLORS.faint, titleA, "left", narrow ? 8.5 : 10, narrow ? 0.1 : 0.14);
    // Hairline under title.
    ctx.globalAlpha = titleA * 0.6;
    ctx.fillStyle = COLORS.line;
    ctx.fillRect(listX, listY + (narrow ? 9 : 12), narrow ? W - listX * 2 : W * 0.3, 1);

    const fs = narrow ? 9.5 : 11.5;
    const colAgent = narrow ? W - listX - 100 : listX + W * 0.3 - 112;
    const colScore = narrow ? W - listX - 4 : listX + W * 0.3;
    for (let s = 0; s < spikes.length; s++) {
      const sp = spikes[s];
      const dt = local - (sp.catchAt + 120);
      if (dt < 0) continue;
      // Row index from the top: newest first. Position eases as newer rows push it down.
      let pos = 0;
      for (let k = s + 1; k < spikes.length; k++) {
        pos += easeInOut(seg(local, spikes[k].catchAt + 120, spikes[k].catchAt + 120 + CONFIG.pushMs));
      }
      if (pos > CONFIG.maxRows - 0.01) continue;
      const slide = easeOut(seg(dt, CONFIG.pushMs * 0.7, CONFIG.pushMs * 0.7 + CONFIG.rowSlideMs));
      const fadeOld = 1 - seg(pos, CONFIG.maxRows - 1, CONFIG.maxRows);
      const y = listY + (narrow ? 26 : 34) + pos * rowH;
      const x = listX - (1 - slide) * 26;
      const fresh = 1 - seg(dt, 0, 1300);
      const a = base * slide * slide * fadeOld * (1 - 0.16 * Math.min(pos, 3));
      // Fresh-row highlight bar.
      if (fresh > 0) {
        ctx.globalAlpha = a * fresh * 0.1;
        ctx.fillStyle = sp.color;
        ctx.fillRect(x - 8, y - rowH / 2 + 2, colScore - listX + 16, rowH - 4);
        ctx.globalAlpha = a * fresh * 0.9;
        ctx.fillRect(x - 8, y - rowH / 2 + 2, 2, rowH - 4);
        glowAt(glow, sp.high ? spriteRed : spriteGold, x + 3, y, 12, fresh, a);
      }
      // Severity dot.
      ctx.globalAlpha = a;
      ctx.fillStyle = sp.color;
      ctx.beginPath();
      ctx.arc(x + 3, y, 3, 0, TAU);
      ctx.fill();
      label(ctx, mono, sp.rule, x + 14, y, pos < 0.5 ? COLORS.text : COLORS.dim, a, "left", fs, 0.08);
      label(ctx, mono, sp.agent, colAgent + (x - listX), y, COLORS.faint, a, "left", fs, 0.04);
      label(ctx, mono, sp.scoreText, colScore + (x - listX), y, sp.color, a, "right", fs, 0.04, 600);
      if (!narrow) label(ctx, mono, sp.sev, colScore + (x - listX) + 12, y, rgba(sp.color, 0.8), a * 0.8, "left", 8.5);
    }
  }

  return {
    id: "risk",
    resize,
    draw(f: SceneFrame) {
      if (f.w !== W || f.h !== H || f.narrow !== narrow) resize(f.w, f.h);
      ensureSprites();
      const base = f.alpha;
      if (base <= 0) return;
      const { ctx, glow, local } = f;
      const reveal = easeOut(seg(local, -400, 700));
      let catchPulse = 0;
      for (let s = 0; s < spikes.length; s++) {
        const dt = local - spikes[s].catchAt;
        if (dt >= 0 && dt < 650) catchPulse = Math.max(catchPulse, Math.pow(1 - dt / 650, 2));
      }
      ctx.save();
      glow.save();
      computeBumps(local);
      drawBack(ctx, local, base, reveal);
      drawGate(f, base, local, reveal, catchPulse);
      drawWave(f, base, local, reveal);
      drawMarkers(f, base, local);
      drawAlerts(f, base, local);
      ctx.restore();
      glow.restore();
      ctx.globalAlpha = base;
      glow.globalAlpha = base;
    },
  };
}
