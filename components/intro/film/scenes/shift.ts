import volume from "@/content/data/volume-series.json";
import seed from "@/lib/sim/seed.json";
import { copy } from "@/content/copy";
import { introScenesA } from "@/content/copy/intro-scenes-a";
import type { FilmScene, SceneFrame } from "../types";
import { COLORS, clamp, drawLabel, easeInOut, easeInOutSine, easeOut, lerp, mulberry32, rgba, seg } from "../util";

/**
 * 01 — The shift. A calm white human-volume line draws across, hits a gold fracture point and
 * erupts into a deep fan of exponential agent-volume lines carrying travelling light.
 */
const CONFIG = {
  lines: 240,
  linesNarrow: 150,
  /** Polyline resolution of each fan line. */
  segments: 52,
  humanSteps: 180,
  /** Fracture position along the plot (0..1 of the x range). */
  fractureU: 0.42,
  fractureUNarrow: 0.3,
  /** Human head travels p ∈ [drawA, drawB] with sine easing. */
  drawA: 0.02,
  drawB: 0.97,
  /** Fan growth (in p, relative to the fracture moment). */
  growLead: 0.01,
  growDur: 0.3,
  growStagger: 0.16,
  particles: 130,
  particlesNarrow: 80,
  sparks: 56,
  /** Bucket colour weights: gold, goldPale, copper, steel. */
  palette: [COLORS.gold, COLORS.goldPale, COLORS.copper, COLORS.steel] as const,
  paletteWeights: [0.5, 0.22, 0.18, 0.1] as const,
  depthBuckets: 3,
  shockMs: 1050,
  flashMs: 900,
} as const;

const NB = CONFIG.depthBuckets * CONFIG.palette.length;

function sample(arr: readonly number[], u: number) {
  const f = clamp(u) * (arr.length - 1);
  const i = Math.floor(f);
  return lerp(arr[i], arr[Math.min(arr.length - 1, i + 1)], f - i);
}

export function createShiftScene(): FilmScene {
  const human = volume.human as number[];
  const agent = volume.agent as number[];
  let hMin = Infinity;
  let hMax = -Infinity;
  for (const v of human) {
    hMin = Math.min(hMin, v);
    hMax = Math.max(hMax, v);
  }
  const aMin = agent[0];
  const aMax = agent[agent.length - 1];

  const S = CONFIG.segments;
  const HS = CONFIG.humanSteps;
  const N: number = CONFIG.lines;
  const P: number = CONFIG.particles;
  const SP = CONFIG.sparks;

  // ---- Static seeded per-line traits (size independent) ----
  const rng = mulberry32(seed.seed ^ 0x51f7);
  const gain = new Float32Array(N);
  const depth = new Float32Array(N);
  const kExp = new Float32Array(N);
  const endS = new Float32Array(N);
  const delay = new Float32Array(N);
  const wobF = new Float32Array(N);
  const wobP = new Float32Array(N);
  const bucketOf = new Uint8Array(N);
  let topLine = 0;
  for (let i = 0; i < N; i++) {
    gain[i] = 0.035 + 0.965 * Math.pow(rng(), 1.35);
    depth[i] = rng();
    kExp[i] = 2.6 + rng() * 3.6;
    endS[i] = depth[i] < 0.35 ? 0.78 + rng() * 0.22 : 0.93 + rng() * 0.07;
    delay[i] = (0.65 * rng() + 0.35 * gain[i]) * CONFIG.growStagger;
    wobF[i] = 1 + rng() * 1.6;
    wobP[i] = rng() * Math.PI * 2;
    let r = rng();
    let c = 0;
    for (; c < CONFIG.paletteWeights.length - 1; c++) {
      r -= CONFIG.paletteWeights[c];
      if (r < 0) break;
    }
    const d = Math.min(CONFIG.depthBuckets - 1, Math.floor(depth[i] * CONFIG.depthBuckets));
    bucketOf[i] = d * CONFIG.palette.length + c;
    if (gain[i] > gain[topLine]) topLine = i;
  }
  gain[topLine] = 1;
  endS[topLine] = 1;
  depth[topLine] = 0.95;
  const buckets: Int16Array[] = [];
  for (let b = 0; b < NB; b++) {
    const ids: number[] = [];
    for (let i = 0; i < N; i++) if (bucketOf[i] === b && i !== topLine) ids.push(i);
    buckets.push(Int16Array.from(ids));
  }
  const bucketStyle: { color: string; alpha: number; width: number }[] = [];
  for (let d = 0; d < CONFIG.depthBuckets; d++) {
    for (let c = 0; c < CONFIG.palette.length; c++) {
      const z = (d + 0.5) / CONFIG.depthBuckets;
      bucketStyle.push({ color: CONFIG.palette[c], alpha: 0.09 + z * z * 0.42, width: 0.45 + z * 0.75 });
    }
  }

  const pLine = new Int16Array(P);
  const pSpeed = new Float32Array(P);
  const pPhase = new Float32Array(P);
  for (let j = 0; j < P; j++) {
    let i = Math.floor(rng() * N);
    for (let tries = 0; tries < 6 && depth[i] < 0.4; tries++) i = Math.floor(rng() * N);
    pLine[j] = i;
    pSpeed[j] = 0.28 + rng() * 0.32;
    pPhase[j] = rng();
  }

  const sAng = new Float32Array(SP);
  const sSpd = new Float32Array(SP);
  const sLife = new Float32Array(SP);
  for (let j = 0; j < SP; j++) {
    sAng[j] = -Math.PI * (0.04 + 0.9 * Math.pow(rng(), 0.8));
    sSpd[j] = 0.35 + rng() * 0.65;
    sLife[j] = 600 + rng() * 700;
  }

  // ---- Layout (resize) ----
  const fanX = new Float32Array(S + 1);
  const fanBase = new Float32Array(S + 1);
  const lift = new Float32Array(N * (S + 1));
  const hx = new Float32Array(HS + 1);
  const hy = new Float32Array(HS + 1);
  const L = {
    w: 0,
    h: 0,
    narrow: false,
    x0: 0,
    x1: 0,
    fanTop: 0,
    yAxis: 0,
    uF: 0.42,
    pF: 0.45,
    xF: 0,
    yF: 0,
    count: N,
    pCount: P,
    shock: 200,
    ticks: 28,
  };

  const humanY = (u: number, yH: number, amp: number) => yH - ((sample(human, u) - hMin) / (hMax - hMin)) * amp;

  function resize(w: number, h: number) {
    const narrow = w < 760;
    const bar = clamp(h * 0.08, 44, 84);
    L.w = w;
    L.h = h;
    L.narrow = narrow;
    L.x0 = narrow ? 20 : w * 0.085;
    L.x1 = narrow ? w - 20 : w * 0.915;
    L.fanTop = narrow ? bar + h * 0.125 : bar + h * 0.075;
    const yH = narrow ? h * 0.535 : h * 0.535;
    const amp = narrow ? h * 0.03 : h * 0.045;
    L.yAxis = narrow ? h * 0.585 : h * 0.592;
    L.uF = narrow ? CONFIG.fractureUNarrow : CONFIG.fractureU;
    L.count = narrow ? CONFIG.linesNarrow : N;
    L.pCount = narrow ? CONFIG.particlesNarrow : P;
    L.shock = Math.min(w, h) * (narrow ? 0.3 : 0.24);
    L.ticks = narrow ? 14 : 28;
    // Moment the sine-eased head reaches the fracture.
    const x = Math.acos(1 - 2 * L.uF) / Math.PI;
    L.pF = CONFIG.drawA + x * (CONFIG.drawB - CONFIG.drawA);

    for (let s = 0; s <= HS; s++) {
      const u = s / HS;
      hx[s] = lerp(L.x0, L.x1, u);
      hy[s] = humanY(u, yH, amp);
    }
    L.xF = lerp(L.x0, L.x1, L.uF);
    L.yF = humanY(L.uF, yH, amp);

    for (let s = 0; s <= S; s++) {
      const u = L.uF + (1 - L.uF) * (s / S);
      fanX[s] = lerp(L.x0, L.x1, u);
      fanBase[s] = humanY(u, yH, amp);
    }
    for (let i = 0; i < N; i++) {
      const o = i * (S + 1);
      const ek = Math.exp(kExp[i]) - 1;
      for (let s = 0; s <= S; s++) {
        const q = s / S;
        const an = (sample(agent, q) - aMin) / (aMax - aMin);
        const ex = (Math.exp(kExp[i] * q) - 1) / ek;
        const shape = 0.42 * an + 0.33 * ex + 0.25 * Math.pow(q, 1.5);
        const room = fanBase[s] - L.fanTop;
        const wob = Math.sin(q * Math.PI * wobF[i] + wobP[i]) * 0.006 * q * room;
        lift[o + s] = Math.max(0, shape * gain[i] * room + wob * gain[i]);
      }
    }
  }

  // Scratch point (no per-frame allocation).
  let px = 0;
  let py = 0;
  function pointAt(i: number, sIdx: number, open: number) {
    const m = Math.min(S - 1, Math.floor(sIdx));
    const fr = sIdx - m;
    const o = i * (S + 1) + m;
    px = lerp(fanX[m], fanX[m + 1], fr);
    py = lerp(fanBase[m] - lift[o] * open, fanBase[m + 1] - lift[o + 1] * open, fr);
  }

  function growth(i: number, p: number) {
    const a = L.pF + CONFIG.growLead + delay[i];
    const t = seg(p, a, a + CONFIG.growDur);
    return 1 - Math.pow(1 - t, 3.2);
  }
  function openness(i: number, p: number) {
    const a = L.pF + delay[i] * 0.6;
    return 0.18 + 0.82 * easeOut(seg(p, a, a + CONFIG.growDur * 1.25));
  }

  function envGrad(c: CanvasRenderingContext2D, a0: number, a1: number) {
    const g = c.createLinearGradient(L.xF, 0, L.x1, 0);
    g.addColorStop(0, rgba(COLORS.goldPale, a0));
    g.addColorStop(1, rgba(COLORS.goldPale, a1));
    return g;
  }

  function tracePartial(c: CanvasRenderingContext2D, i: number, sEnd: number, open: number) {
    const o = i * (S + 1);
    const m = Math.floor(sEnd);
    c.moveTo(fanX[0], fanBase[0] - lift[o] * open);
    for (let s = 1; s <= m; s++) c.lineTo(fanX[s], fanBase[s] - lift[o + s] * open);
    if (m < S && sEnd > m) {
      pointAt(i, sEnd, open);
      c.lineTo(px, py);
    }
  }

  function drawAxis(f: SceneFrame) {
    const { ctx, p } = f;
    const k = easeInOut(seg(p, 0.0, 0.32));
    if (k <= 0) return;
    const { x0, x1, yAxis } = L;
    const xe = lerp(x0, x1, k);
    ctx.save();
    ctx.lineWidth = 1;
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, rgba(COLORS.text, 0.05));
    g.addColorStop(0.5, rgba(COLORS.text, 0.16));
    g.addColorStop(1, rgba(COLORS.text, 0.05));
    ctx.strokeStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0, yAxis + 0.5);
    ctx.lineTo(xe, yAxis + 0.5);
    for (let i = 0; i <= L.ticks; i++) {
      const u = i / L.ticks;
      if (u > k) break;
      const x = Math.round(lerp(x0, x1, u)) + 0.5;
      const major = i % 4 === 0;
      ctx.moveTo(x, yAxis);
      ctx.lineTo(x, yAxis + (major ? 7 : 3.5));
    }
    ctx.stroke();
    ctx.restore();
    // Agent axis on the right, rising after the fracture.
    const v = easeInOut(seg(p, L.pF + 0.08, L.pF + 0.42));
    if (v > 0) {
      const top = L.fanTop;
      const yv = lerp(yAxis, top, v);
      ctx.save();
      ctx.strokeStyle = rgba(COLORS.gold, 0.22);
      ctx.lineWidth = 1;
      ctx.beginPath();
      const xr = Math.round(x1) + 0.5;
      ctx.moveTo(xr, yAxis);
      ctx.lineTo(xr, yv);
      const n = L.narrow ? 6 : 10;
      for (let i = 1; i <= n; i++) {
        const y = lerp(yAxis, top, i / n);
        if (y < yv) break;
        ctx.moveTo(xr, Math.round(y) + 0.5);
        ctx.lineTo(xr - (i % 2 === 0 ? 7 : 3.5), Math.round(y) + 0.5);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawFan(f: SceneFrame) {
    const { ctx, glow, p, alpha } = f;
    if (p < L.pF - 0.01) return;
    const count = L.count;

    // Soft gold area under the top envelope.
    const gt = growth(topLine, p);
    if (gt > 0) {
      const ot = openness(topLine, p);
      const sEnd = gt * S * endS[topLine];
      ctx.save();
      ctx.beginPath();
      tracePartial(ctx, topLine, sEnd, ot);
      const mEnd = Math.floor(sEnd);
      pointAt(topLine, Math.min(sEnd, S), ot);
      ctx.lineTo(px, fanBase[Math.min(S, mEnd)]);
      for (let s = mEnd; s >= 0; s--) ctx.lineTo(fanX[s], fanBase[s]);
      ctx.closePath();
      const ag = ctx.createLinearGradient(0, L.fanTop, 0, L.yF);
      ag.addColorStop(0, rgba(COLORS.gold, 0.1));
      ag.addColorStop(0.6, rgba(COLORS.goldDeep, 0.04));
      ag.addColorStop(1, rgba(COLORS.goldDeep, 0));
      ctx.fillStyle = ag;
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineJoin = "round";
    for (let b = 0; b < NB; b++) {
      const ids = buckets[b];
      const st = bucketStyle[b];
      // Lines are born faint at the fracture and gain light toward their tips.
      const lg = ctx.createLinearGradient(L.xF, 0, L.x1, 0);
      lg.addColorStop(0, rgba(st.color, st.alpha * 0.03));
      lg.addColorStop(0.4, rgba(st.color, st.alpha * 0.22));
      lg.addColorStop(1, rgba(st.color, st.alpha));
      ctx.strokeStyle = lg;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = st.width;
      ctx.beginPath();
      for (let k = 0; k < ids.length; k++) {
        const i = ids[k];
        if (i >= count) continue;
        const gr = growth(i, p);
        if (gr <= 0) continue;
        tracePartial(ctx, i, gr * S * endS[i], openness(i, p));
      }
      ctx.stroke();
    }
    // Hero envelope line.
    if (gt > 0) {
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = envGrad(ctx, 0.25, 1);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      tracePartial(ctx, topLine, gt * S, openness(topLine, p));
      ctx.stroke();
    }
    ctx.restore();

    // Emissive copies: near lines + growing heads.
    glow.save();
    glow.globalCompositeOperation = "lighter";
    glow.lineJoin = "round";
    const gg = glow.createLinearGradient(L.xF, 0, L.x1, 0);
    gg.addColorStop(0, rgba(COLORS.gold, 0));
    gg.addColorStop(0.5, rgba(COLORS.gold, 0.08));
    gg.addColorStop(1, rgba(COLORS.gold, 0.3));
    glow.strokeStyle = gg;
    glow.globalAlpha = alpha;
    glow.lineWidth = 1.2;
    glow.beginPath();
    const nearStart = (CONFIG.depthBuckets - 1) * CONFIG.palette.length;
    for (let b = nearStart; b < NB; b++) {
      const ids = buckets[b];
      for (let k = 0; k < ids.length; k += 2) {
        const i = ids[k];
        if (i >= count) continue;
        const gr = growth(i, p);
        if (gr <= 0) continue;
        tracePartial(glow, i, gr * S * endS[i], openness(i, p));
      }
    }
    glow.stroke();
    if (gt > 0) {
      glow.globalAlpha = alpha * 0.7;
      glow.strokeStyle = envGrad(glow, 0.05, 0.9);
      glow.lineWidth = 2.2;
      glow.beginPath();
      tracePartial(glow, topLine, gt * S, openness(topLine, p));
      glow.stroke();
    }
    // Heads.
    glow.globalAlpha = alpha;
    glow.fillStyle = COLORS.goldPale;
    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = COLORS.goldPale;
    glow.beginPath();
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      if (depth[i] < 0.5) continue;
      const gr = growth(i, p);
      if (gr <= 0 || gr >= 0.995) continue;
      const fade = Math.sin(Math.PI * gr);
      pointAt(i, gr * S * endS[i], openness(i, p));
      const r = 0.6 + depth[i] * 1.4 * fade;
      glow.rect(px - r, py - r, r * 2, r * 2);
      ctx.rect(px - r * 0.5, py - r * 0.5, r, r);
    }
    glow.fill();
    ctx.fill();
    ctx.restore();
    glow.restore();
  }

  function drawParticles(f: SceneFrame) {
    const { ctx, glow, p, local, alpha } = f;
    if (p < L.pF) return;
    const tt = local / 1000;
    const pv = clamp((p - L.pF) / 0.08);
    ctx.save();
    glow.save();
    ctx.globalCompositeOperation = "lighter";
    glow.globalCompositeOperation = "lighter";
    ctx.strokeStyle = COLORS.goldPale;
    glow.strokeStyle = COLORS.goldPale;
    ctx.lineCap = "round";
    glow.lineCap = "round";
    ctx.lineWidth = 1.1;
    glow.lineWidth = 2;
    ctx.globalAlpha = alpha * 0.85 * pv;
    glow.globalAlpha = alpha * 0.9 * pv;
    ctx.beginPath();
    glow.beginPath();
    const tail = S * 0.06;
    for (let j = 0; j < L.pCount; j++) {
      const i = pLine[j];
      if (i >= L.count) continue;
      const gr = growth(i, p);
      if (gr < 0.15) continue;
      const span = gr * S * endS[i];
      const u = (tt * pSpeed[j] + pPhase[j]) % 1;
      const sHead = u * S * endS[i];
      if (sHead > span || sHead < tail) continue;
      const op = openness(i, p);
      pointAt(i, sHead - tail, op);
      ctx.moveTo(px, py);
      glow.moveTo(px, py);
      pointAt(i, sHead - tail * 0.5, op);
      ctx.lineTo(px, py);
      glow.lineTo(px, py);
      pointAt(i, sHead, op);
      ctx.lineTo(px, py);
      glow.lineTo(px, py);
    }
    ctx.stroke();
    glow.stroke();
    glow.restore();
    ctx.restore();
  }

  function trace(c: CanvasRenderingContext2D, from: number, to: number) {
    const a = Math.floor(from);
    const b = Math.floor(to);
    c.moveTo(lerp(hx[a], hx[Math.min(HS, a + 1)], from - a), lerp(hy[a], hy[Math.min(HS, a + 1)], from - a));
    for (let s = a + 1; s <= b; s++) c.lineTo(hx[s], hy[s]);
    if (b < HS) c.lineTo(lerp(hx[b], hx[b + 1], to - b), lerp(hy[b], hy[b + 1], to - b));
  }

  function drawHuman(f: SceneFrame) {
    const { ctx, glow, p, alpha } = f;
    const k = easeInOutSine(seg(p, CONFIG.drawA, CONFIG.drawB));
    if (k <= 0) return;
    const sHead = k * HS;
    const sF = L.uF * HS;
    const after = clamp((p - L.pF) / 0.12);

    ctx.save();
    glow.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    glow.lineCap = "round";
    // Segment before the fracture: bright white.
    const e1 = Math.min(sHead, sF);
    ctx.strokeStyle = COLORS.text;
    ctx.globalAlpha = alpha * lerp(0.95, 0.7, after);
    ctx.lineWidth = L.narrow ? 1.5 : 1.8;
    ctx.beginPath();
    trace(ctx, 0, e1);
    ctx.stroke();
    glow.strokeStyle = COLORS.text;
    glow.globalAlpha = alpha * lerp(0.55, 0.25, after);
    glow.lineWidth = 3;
    glow.beginPath();
    trace(glow, Math.max(0, e1 - HS * 0.22), e1);
    glow.stroke();
    // Continuation after the fracture: the human pace carries on, flat and quiet.
    if (sHead > sF) {
      ctx.globalAlpha = alpha * 0.42;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      trace(ctx, sF, sHead);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Glowing head.
    if (k < 1) {
      const b = Math.min(HS - 1, Math.floor(sHead));
      const hxp = lerp(hx[b], hx[b + 1], sHead - b);
      const hyp = lerp(hy[b], hy[b + 1], sHead - b);
      const pre = sHead <= sF;
      const intensity = pre ? 1 : 0.45;
      glow.globalAlpha = alpha * intensity;
      const rg = glow.createRadialGradient(hxp, hyp, 0, hxp, hyp, 22);
      rg.addColorStop(0, "rgba(255,255,255,0.95)");
      rg.addColorStop(0.25, "rgba(236,238,241,0.35)");
      rg.addColorStop(1, "rgba(236,238,241,0)");
      glow.fillStyle = rg;
      glow.fillRect(hxp - 22, hyp - 22, 44, 44);
      ctx.globalAlpha = alpha * intensity;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(hxp, hyp, pre ? 2.6 : 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    glow.restore();
    ctx.restore();
  }

  function drawFracture(f: SceneFrame) {
    const { ctx, glow, p, alpha, dur } = f;
    const { xF, yF } = L;
    // Anticipation marker.
    const pre = easeOut(seg(p, L.pF - 0.2, L.pF - 0.04));
    const ms = (p - L.pF) * dur;
    ctx.save();
    glow.save();
    if (pre > 0) {
      const lock = clamp(ms / 300);
      const r = lerp(14, 5, Math.max(lock, 0)) * (0.6 + 0.4 * pre);
      ctx.globalAlpha = alpha * pre * (ms > 0 ? 0.9 : 0.6);
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(xF, yF, r, 0, Math.PI * 2);
      ctx.stroke();
      // Crosshair ticks.
      const c = r + 5;
      ctx.beginPath();
      ctx.moveTo(xF - c - 6, yF);
      ctx.lineTo(xF - c, yF);
      ctx.moveTo(xF + c, yF);
      ctx.lineTo(xF + c + 6, yF);
      ctx.moveTo(xF, yF + c);
      ctx.lineTo(xF, yF + c + 6);
      ctx.stroke();
    }
    if (ms > 0) {
      // Flash.
      const fl = clamp(ms / CONFIG.flashMs);
      const fa = Math.pow(1 - fl, 2.2) * (ms < 60 ? ms / 60 : 1);
      if (fa > 0.002) {
        const R = L.narrow ? 90 : 140;
        glow.globalCompositeOperation = "lighter";
        glow.globalAlpha = alpha * fa;
        const rg = glow.createRadialGradient(xF, yF, 0, xF, yF, R);
        rg.addColorStop(0, "rgba(255,244,214,1)");
        rg.addColorStop(0.15, rgba(COLORS.gold, 0.75));
        rg.addColorStop(1, rgba(COLORS.goldDeep, 0));
        glow.fillStyle = rg;
        glow.fillRect(xF - R, yF - R, R * 2, R * 2);
        // Anamorphic streak.
        const sw = L.w * 0.42 * (0.6 + 0.4 * easeOut(fl));
        const lg = glow.createLinearGradient(xF - sw, 0, xF + sw, 0);
        lg.addColorStop(0, rgba(COLORS.gold, 0));
        lg.addColorStop(0.5, rgba(COLORS.goldPale, 0.9));
        lg.addColorStop(1, rgba(COLORS.gold, 0));
        glow.fillStyle = lg;
        glow.fillRect(xF - sw, yF - 1.2, sw * 2, 2.4);
      }
      // Shockwaves.
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = 1;
      for (let r = 0; r < 2; r++) {
        const k = clamp((ms - r * 180) / CONFIG.shockMs);
        if (k <= 0 || k >= 1) continue;
        const rad = 6 + easeOut(k) * L.shock * (r === 0 ? 1 : 0.7);
        const a = Math.pow(1 - k, 1.6);
        ctx.globalAlpha = alpha * a * 0.75;
        ctx.strokeStyle = r === 0 ? COLORS.gold : COLORS.goldPale;
        ctx.beginPath();
        ctx.arc(xF, yF, rad, 0, Math.PI * 2);
        ctx.stroke();
        glow.globalAlpha = alpha * a * 0.6;
        glow.strokeStyle = COLORS.gold;
        glow.lineWidth = 2.5 * (1 - k) + 0.5;
        glow.beginPath();
        glow.arc(xF, yF, rad, 0, Math.PI * 2);
        glow.stroke();
      }
      // Sparks.
      ctx.strokeStyle = COLORS.goldPale;
      glow.strokeStyle = COLORS.gold;
      ctx.lineCap = "round";
      glow.lineCap = "round";
      const reach = L.shock * 0.75;
      for (let j = 0; j < SP; j++) {
        const k = ms / sLife[j];
        if (k >= 1) continue;
        const d0 = easeOut(Math.max(0, k - 0.08)) * reach * sSpd[j];
        const d1 = easeOut(k) * reach * sSpd[j];
        const ca = Math.cos(sAng[j]);
        const sa = Math.sin(sAng[j]);
        const a = 1 - k;
        ctx.globalAlpha = alpha * a * 0.55;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xF + ca * d0, yF + sa * d0);
        ctx.lineTo(xF + ca * d1, yF + sa * d1);
        ctx.stroke();
        glow.globalAlpha = alpha * a;
        glow.lineWidth = 1.8;
        glow.beginPath();
        glow.moveTo(xF + ca * d0, yF + sa * d0);
        glow.lineTo(xF + ca * d1, yF + sa * d1);
        glow.stroke();
      }
      // Persistent hot core at the fracture.
      const hold = 0.55 + 0.45 * Math.pow(1 - clamp(ms / 1400), 2);
      glow.globalCompositeOperation = "lighter";
      glow.globalAlpha = alpha * hold;
      const cg = glow.createRadialGradient(xF, yF, 0, xF, yF, 18);
      cg.addColorStop(0, "rgba(255,240,205,1)");
      cg.addColorStop(0.35, rgba(COLORS.gold, 0.5));
      cg.addColorStop(1, rgba(COLORS.gold, 0));
      glow.fillStyle = cg;
      glow.fillRect(xF - 18, yF - 18, 36, 36);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = alpha;
      ctx.fillStyle = COLORS.goldPale;
      ctx.beginPath();
      ctx.arc(xF, yF, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    glow.restore();
    ctx.restore();
  }

  function drawLabels(f: SceneFrame) {
    const { ctx, p, fonts } = f;
    const labels = copy.intro.canvas;
    const nar = L.narrow;
    const size = nar ? 9 : 11;
    const la = easeOut(seg(p, 0.1, 0.3));
    drawLabel(ctx, fonts.mono, labels.axisHuman, L.x0 + (1 - la) * -8, L.yAxis + (nar ? 16 : 20), COLORS.dim, la, "left", size);
    const ia = easeOut(seg(p, L.pF - 0.12, L.pF + 0.02)) * (1 - 0.45 * seg(p, L.pF + 0.2, L.pF + 0.4));
    drawLabel(ctx, fonts.mono, introScenesA.shift.inflection, L.xF, L.yF + (nar ? 26 : 30), COLORS.gold, ia, "center", nar ? 8.5 : 10);
    const aa = easeOut(seg(p, L.pF + 0.24, L.pF + 0.42));
    if (aa > 0) {
      const y = L.fanTop - (nar ? 16 : 20) + (1 - aa) * 6;
      drawLabel(ctx, fonts.mono, labels.axisAgent, L.x1 - 2, y, COLORS.goldPale, aa, "right", size);
      ctx.save();
      ctx.globalAlpha *= aa;
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(L.x1 - 3, L.fanTop - 3, 6, 6);
      ctx.restore();
    }
  }

  return {
    id: "shift",
    resize,
    draw(f: SceneFrame) {
      if (f.alpha <= 0) return;
      if (f.w !== L.w || f.h !== L.h) resize(f.w, f.h);
      drawAxis(f);
      drawFan(f);
      drawHuman(f);
      drawParticles(f);
      drawFracture(f);
      drawLabels(f);
    },
  };
}
