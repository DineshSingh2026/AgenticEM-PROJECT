import seed from "@/lib/sim/seed.json";
import { copy } from "@/content/copy";
import { introScenesA } from "@/content/copy/intro-scenes-a";
import type { FilmScene, SceneFrame } from "../types";
import { COLORS, clamp, drawLabel, easeInOut, easeInOutSine, easeOut, lerp, mulberry32, rgba, seg } from "../util";

/**
 * 02 — One intelligence layer. Chaotic white data strands drift in from the left and converge into a
 * slowly turning glass-and-gold core; three perfectly parallel bundles stream out to the right and
 * branch to OPERATIONS / RISK / PROFITABILITY.
 */
const CONFIG = {
  strands: 150,
  strandsNarrow: 110,
  strandSegs: 30,
  strandParticles: 70,
  /** Strand heads arrive over p ∈ [0, inArrive]. */
  inStagger: 0.22,
  inDur: 0.36,
  linesPerBundle: 14,
  linesPerBundleNarrow: 10,
  bundleSegs: 72,
  packetsPerBundle: 10,
  bundleStart: 0.4,
  bundleDur: 0.32,
  bundleStagger: 0.06,
  colors: [COLORS.goldPale, COLORS.gold, COLORS.copper] as const,
  /** Core rotation (rad / ms) and fixed tilt. */
  yawSpeed: 0.00017,
  yaw0: 0.4,
  pitch: 0.56,
} as const;

// Cube topology.
const VERTS = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
] as const;
const EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
] as const;
/** Faces: vertex loop + outward normal. */
const FACES = [
  { v: [0, 1, 2, 3], n: [0, 0, -1] },
  { v: [5, 4, 7, 6], n: [0, 0, 1] },
  { v: [4, 0, 3, 7], n: [-1, 0, 0] },
  { v: [1, 5, 6, 2], n: [1, 0, 0] },
  { v: [3, 2, 6, 7], n: [0, 1, 0] },
  { v: [4, 5, 1, 0], n: [0, -1, 0] },
] as const;

/** The two faces adjacent to each edge. */
const EDGE_FACES: [number, number][] = EDGES.map(([a, b]) => {
  const out: number[] = [];
  FACES.forEach((F, i) => {
    const v = F.v as readonly number[];
    if (v.includes(a) && v.includes(b)) out.push(i);
  });
  return [out[0], out[1]];
});

export function createConvergenceScene(): FilmScene {
  const NS: number = CONFIG.strands;
  const SS = CONFIG.strandSegs;
  const BS = CONFIG.bundleSegs;
  const LPB: number = CONFIG.linesPerBundle;
  const NP = CONFIG.strandParticles;
  const PK = CONFIG.packetsPerBundle;

  // ---- Seeded static traits ----
  const rng = mulberry32(seed.seed ^ 0xc0e2);
  const sY0 = new Float32Array(NS);
  const sOff = new Float32Array(NS);
  const sDepth = new Float32Array(NS);
  const sF1 = new Float32Array(NS);
  const sF2 = new Float32Array(NS);
  const sP1 = new Float32Array(NS);
  const sP2 = new Float32Array(NS);
  const sSp = new Float32Array(NS);
  const sAmp = new Float32Array(NS);
  const sDelay = new Float32Array(NS);
  for (let i = 0; i < NS; i++) {
    sY0[i] = rng();
    sOff[i] = rng() * 2 - 1;
    sDepth[i] = rng();
    sF1[i] = 3 + rng() * 5;
    sF2[i] = 7 + rng() * 9;
    sP1[i] = rng() * Math.PI * 2;
    sP2[i] = rng() * Math.PI * 2;
    sSp[i] = 0.5 + rng() * 0.9;
    sAmp[i] = 0.35 + rng() * 0.65;
    sDelay[i] = rng() * CONFIG.inStagger;
  }
  const spLine = new Int16Array(NP);
  const spSpeed = new Float32Array(NP);
  const spPhase = new Float32Array(NP);
  for (let j = 0; j < NP; j++) {
    spLine[j] = Math.floor(rng() * NS);
    spSpeed[j] = 0.35 + rng() * 0.35;
    spPhase[j] = rng();
  }
  const pkLine = new Int16Array(3 * PK);
  const pkSpeed = new Float32Array(3 * PK);
  const pkPhase = new Float32Array(3 * PK);
  for (let j = 0; j < 3 * PK; j++) {
    pkLine[j] = Math.floor(rng() * LPB);
    pkSpeed[j] = 0.42 + rng() * 0.3;
    pkPhase[j] = rng();
  }

  // ---- Layout ----
  const bx = new Float32Array(3 * (BS + 1));
  const by = new Float32Array(3 * (BS + 1));
  const bnx = new Float32Array(3 * (BS + 1));
  const bny = new Float32Array(3 * (BS + 1));
  const sx = new Float32Array(SS + 1);
  const proj = new Float32Array(16); // projected cube xy
  const projIn = new Float32Array(16);
  const L = {
    w: 0,
    h: 0,
    narrow: false,
    cx: 0,
    cy: 0,
    R: 60,
    xL: 0,
    xIn: 0,
    endX: 0,
    yTop: 0,
    yBot: 0,
    bundleY: [0, 0, 0],
    count: NS,
    lpb: LPB,
    spacing: 2.4,
    noiseAmp: 40,
  };

  function resize(w: number, h: number) {
    const narrow = w < 760;
    const bar = clamp(h * 0.08, 44, 84);
    L.w = w;
    L.h = h;
    L.narrow = narrow;
    L.yTop = bar + (narrow ? h * 0.1 : 24);
    L.yBot = h * 0.62;
    L.cx = narrow ? w * 0.36 : w * 0.45;
    L.cy = narrow ? h * 0.385 : (L.yTop + L.yBot) / 2;
    L.R = narrow ? clamp(w * 0.085, 26, 40) : clamp(Math.min(w, h) * 0.085, 48, 96);
    L.xL = -w * 0.04;
    L.xIn = L.cx - L.R * 0.55;
    L.endX = narrow ? w * 0.6 : w * 0.775;
    const dy = narrow ? h * 0.115 : (L.yBot - L.yTop) * 0.36;
    L.bundleY[0] = L.cy - dy;
    L.bundleY[1] = L.cy;
    L.bundleY[2] = L.cy + dy;
    L.count = narrow ? CONFIG.strandsNarrow : NS;
    L.lpb = narrow ? CONFIG.linesPerBundleNarrow : LPB;
    L.spacing = narrow ? 1.9 : 2.5;
    L.noiseAmp = narrow ? h * 0.05 : h * 0.07;

    for (let s = 0; s <= SS; s++) sx[s] = lerp(L.xL, L.xIn, s / SS);

    const x0 = L.cx + L.R * 0.55;
    const xB = lerp(x0, L.endX, narrow ? 0.62 : 0.58);
    const curveN = Math.round(BS * 0.7);
    for (let b = 0; b < 3; b++) {
      const o = b * (BS + 1);
      const y0 = L.cy + (b - 1) * L.R * 0.28;
      const yb = L.bundleY[b];
      const c1x = lerp(x0, xB, 0.5);
      for (let s = 0; s <= BS; s++) {
        let x: number;
        let y: number;
        if (s <= curveN) {
          const u = s / curveN;
          const m = 1 - u;
          x = m * m * m * x0 + 3 * m * m * u * c1x + 3 * m * u * u * c1x + u * u * u * xB;
          y = m * m * m * y0 + 3 * m * m * u * y0 + 3 * m * u * u * yb + u * u * u * yb;
        } else {
          x = lerp(xB, L.endX, (s - curveN) / (BS - curveN));
          y = yb;
        }
        bx[o + s] = x;
        by[o + s] = y;
      }
      for (let s = 0; s <= BS; s++) {
        const a = Math.max(0, s - 1);
        const c = Math.min(BS, s + 1);
        const dx = bx[o + c] - bx[o + a];
        const dyy = by[o + c] - by[o + a];
        const len = Math.hypot(dx, dyy) || 1;
        bnx[o + s] = -dyy / len;
        bny[o + s] = dx / len;
      }
    }
  }

  // ---- Strands ----
  let qx = 0;
  let qy = 0;
  function strandPoint(i: number, s: number, t: number, chaos: number) {
    const u = s / SS;
    const m = Math.min(SS - 1, Math.floor(s));
    qx = lerp(sx[m], sx[m + 1], s - m);
    const c = easeInOutSine(Math.pow(u, 0.85));
    const y0 = lerp(L.yTop, L.yBot, sY0[i]);
    const yT = L.cy + sOff[i] * L.R * 0.42;
    const n = Math.sin(u * sF1[i] + t * sSp[i] + sP1[i]) * 0.65 + Math.sin(u * sF2[i] - t * sSp[i] * 0.7 + sP2[i]) * 0.35;
    qy = lerp(y0, yT, c) + n * L.noiseAmp * sAmp[i] * Math.pow(1 - c, 0.9) * chaos;
  }
  function strandReach(i: number, p: number) {
    return easeOut(seg(p, sDelay[i], sDelay[i] + CONFIG.inDur));
  }

  function drawStrands(f: SceneFrame) {
    const { ctx, glow, p, local, alpha } = f;
    const t = local / 1000;
    const chaos = 1 - 0.4 * easeInOut(seg(p, 0.25, 1));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = COLORS.text;
    for (let d = 0; d < 3; d++) {
      ctx.globalAlpha = alpha * (0.05 + d * d * 0.05);
      ctx.lineWidth = 0.5 + d * 0.3;
      ctx.beginPath();
      for (let i = 0; i < L.count; i++) {
        if (Math.min(2, Math.floor(sDepth[i] * 3)) !== d) continue;
        const r = strandReach(i, p);
        if (r <= 0) continue;
        const sEnd = r * SS;
        const m = Math.floor(sEnd);
        strandPoint(i, 0, t, chaos);
        ctx.moveTo(qx, qy);
        for (let s = 1; s <= m; s++) {
          strandPoint(i, s, t, chaos);
          ctx.lineTo(qx, qy);
        }
        if (sEnd > m) {
          strandPoint(i, sEnd, t, chaos);
          ctx.lineTo(qx, qy);
        }
      }
      ctx.stroke();
    }
    ctx.restore();

    // Heads + travelling light.
    glow.save();
    ctx.save();
    glow.globalCompositeOperation = "lighter";
    ctx.globalCompositeOperation = "lighter";
    glow.fillStyle = COLORS.text;
    ctx.fillStyle = "#FFFFFF";
    glow.globalAlpha = alpha * 0.8;
    ctx.globalAlpha = alpha * 0.75;
    glow.beginPath();
    ctx.beginPath();
    for (let i = 0; i < L.count; i++) {
      if (sDepth[i] < 0.45) continue;
      const r = strandReach(i, p);
      if (r <= 0 || r >= 0.999) continue;
      strandPoint(i, r * SS, t, chaos);
      const z = 0.8 + sDepth[i] * 1.2;
      glow.rect(qx - z, qy - z, z * 2, z * 2);
      ctx.rect(qx - 0.8, qy - 0.8, 1.6, 1.6);
    }
    for (let j = 0; j < NP; j++) {
      const i = spLine[j];
      if (i >= L.count) continue;
      const r = strandReach(i, p);
      const u = (t * spSpeed[j] + spPhase[j]) % 1;
      if (u > r) continue;
      strandPoint(i, u * SS, t, chaos);
      const fade = Math.sin(Math.PI * u);
      const z = 0.6 + fade * 1.2;
      glow.rect(qx - z, qy - z, z * 2, z * 2);
      ctx.rect(qx - z * 0.6, qy - z * 0.6, z * 1.2, z * 1.2);
    }
    glow.fill();
    ctx.fill();
    ctx.restore();
    glow.restore();
  }

  // ---- Bundles ----
  let bpx = 0;
  let bpy = 0;
  function bundlePoint(b: number, s: number, off: number) {
    const m = Math.min(BS - 1, Math.floor(s));
    const fr = s - m;
    const o = b * (BS + 1) + m;
    bpx = lerp(bx[o] + bnx[o] * off, bx[o + 1] + bnx[o + 1] * off, fr);
    bpy = lerp(by[o] + bny[o] * off, by[o + 1] + bny[o + 1] * off, fr);
  }
  function bundleReach(b: number, p: number) {
    const a = CONFIG.bundleStart + b * CONFIG.bundleStagger;
    return easeInOut(seg(p, a, a + CONFIG.bundleDur));
  }
  function traceBundleLine(c: CanvasRenderingContext2D, b: number, off: number, sEnd: number) {
    const o = b * (BS + 1);
    const m = Math.floor(sEnd);
    c.moveTo(bx[o] + bnx[o] * off, by[o] + bny[o] * off);
    for (let s = 1; s <= m; s++) c.lineTo(bx[o + s] + bnx[o + s] * off, by[o + s] + bny[o + s] * off);
    if (sEnd > m && m < BS) {
      bundlePoint(b, sEnd, off);
      c.lineTo(bpx, bpy);
    }
  }

  function drawBundles(f: SceneFrame) {
    const { ctx, glow, p, local, alpha } = f;
    const t = local / 1000;
    const lpb = L.lpb;
    const half = (lpb - 1) / 2;
    ctx.save();
    glow.save();
    ctx.globalCompositeOperation = "lighter";
    glow.globalCompositeOperation = "lighter";
    ctx.lineJoin = "round";
    for (let b = 0; b < 3; b++) {
      const r = bundleReach(b, p);
      if (r <= 0) continue;
      ctx.strokeStyle = CONFIG.colors[b];
      ctx.globalAlpha = alpha * 0.42;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let j = 0; j < lpb; j++) {
        const off = (j - half) * L.spacing;
        const lag = (Math.abs(j - half) / half) * 0.06;
        const rr = clamp(r * 1.06 - lag);
        if (rr <= 0) continue;
        traceBundleLine(ctx, b, off, rr * BS);
      }
      ctx.stroke();
      glow.strokeStyle = CONFIG.colors[b];
      glow.globalAlpha = alpha * 0.22;
      glow.lineWidth = 2.5;
      glow.beginPath();
      traceBundleLine(glow, b, 0, clamp(r * 1.06) * BS);
      glow.stroke();
      // Leading front flare.
      if (r < 1) {
        bundlePoint(b, clamp(r * 1.06) * BS, 0);
        glow.globalAlpha = alpha * 0.8 * Math.sin(Math.PI * r);
        glow.fillStyle = COLORS.goldPale;
        glow.beginPath();
        glow.arc(bpx, bpy, 5, 0, Math.PI * 2);
        glow.fill();
      }
    }
    // Packets.
    ctx.strokeStyle = COLORS.goldPale;
    glow.strokeStyle = COLORS.goldPale;
    ctx.lineCap = "round";
    glow.lineCap = "round";
    ctx.lineWidth = 1.3;
    glow.lineWidth = 2.4;
    ctx.globalAlpha = alpha * 0.95;
    glow.globalAlpha = alpha;
    ctx.beginPath();
    glow.beginPath();
    const tail = BS * 0.03;
    for (let b = 0; b < 3; b++) {
      const r = bundleReach(b, p);
      if (r < 0.2) continue;
      for (let k = 0; k < PK; k++) {
        const j = b * PK + k;
        const line = pkLine[j] % lpb;
        const off = (line - half) * L.spacing;
        const u = (t * pkSpeed[j] + pkPhase[j]) % 1;
        const sHead = u * BS;
        if (sHead > r * BS || sHead < tail) continue;
        bundlePoint(b, sHead - tail, off);
        ctx.moveTo(bpx, bpy);
        glow.moveTo(bpx, bpy);
        bundlePoint(b, sHead, off);
        ctx.lineTo(bpx, bpy);
        glow.lineTo(bpx, bpy);
      }
    }
    ctx.stroke();
    glow.stroke();
    glow.restore();
    ctx.restore();
  }

  // ---- Core ----
  function project(out: Float32Array, scale: number, yaw: number, pitch: number) {
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const spt = Math.sin(pitch);
    for (let i = 0; i < 8; i++) {
      const [x, y, z] = VERTS[i];
      const x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;
      const y1 = y * cp - z1 * spt;
      out[i * 2] = L.cx + x1 * scale;
      out[i * 2 + 1] = L.cy - y1 * scale;
    }
  }
  /** Depth of a rotated normal toward the viewer (>0 = facing camera). */
  function facing(n: readonly number[], yaw: number, pitch: number) {
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const z1 = -n[0] * sy + n[2] * cy;
    return -(n[1] * Math.sin(pitch) + z1 * Math.cos(pitch));
  }
  /** Light from top-left-front. */
  function shade(n: readonly number[], yaw: number, pitch: number) {
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const x1 = n[0] * cy + n[2] * sy;
    const z1 = -n[0] * sy + n[2] * cy;
    const y1 = n[1] * Math.cos(pitch) - z1 * Math.sin(pitch);
    const zz = -(n[1] * Math.sin(pitch) + z1 * Math.cos(pitch));
    return clamp(0.25 + (-x1 * 0.45 + y1 * 0.75 + zz * 0.35) * 0.6, 0, 1);
  }
  function facePath(c: CanvasRenderingContext2D, pts: Float32Array, v: readonly number[]) {
    c.moveTo(pts[v[0] * 2], pts[v[0] * 2 + 1]);
    for (let k = 1; k < 4; k++) c.lineTo(pts[v[k] * 2], pts[v[k] * 2 + 1]);
    c.closePath();
  }

  function drawCore(f: SceneFrame) {
    const { ctx, glow, p, local, alpha } = f;
    const { cx, cy, R } = L;
    const build = easeInOut(seg(p, 0.0, 0.3));
    if (build <= 0) return;
    const ignite = easeOut(seg(p, 0.22, 0.5));
    const yaw = CONFIG.yaw0 + local * CONFIG.yawSpeed;
    const pitch = CONFIG.pitch;
    const scale = R * 0.66 * (0.86 + 0.14 * easeOut(seg(p, 0, 0.4)));
    project(proj, scale, yaw, pitch);
    project(projIn, scale * 0.42, -yaw * 1.6 + 0.8, pitch + 0.25);
    const breathe = 0.5 + 0.5 * Math.sin(local / 520);

    ctx.save();
    glow.save();
    glow.globalCompositeOperation = "lighter";

    // Halo behind.
    glow.globalAlpha = alpha * (0.1 + 0.25 * ignite) * (0.85 + 0.15 * breathe);
    const hr = R * 2.4;
    const hg = glow.createRadialGradient(cx, cy, 0, cx, cy, hr);
    hg.addColorStop(0, rgba(COLORS.gold, 0.55));
    hg.addColorStop(0.35, rgba(COLORS.goldDeep, 0.18));
    hg.addColorStop(1, rgba(COLORS.goldDeep, 0));
    glow.fillStyle = hg;
    glow.fillRect(cx - hr, cy - hr, hr * 2, hr * 2);

    // Smoked-glass body: dims the strands passing behind it.
    ctx.globalAlpha = alpha * 0.62 * easeOut(seg(p, 0.05, 0.3));
    ctx.fillStyle = COLORS.bg;
    ctx.beginPath();
    for (let fi = 0; fi < 6; fi++) {
      const F = FACES[fi];
      if (facing(F.n, yaw, pitch) <= 0.02) continue;
      facePath(ctx, proj, F.v);
    }
    ctx.fill();

    // Back edges (seen through glass).
    ctx.lineCap = "round";
    ctx.strokeStyle = COLORS.gold;
    ctx.globalAlpha = alpha * 0.22 * build;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let fi = 0; fi < 6; fi++) {
      const F = FACES[fi];
      if (facing(F.n, yaw, pitch) > 0) continue;
      facePath(ctx, proj, F.v);
    }
    ctx.stroke();

    // Inner light + inner counter-rotating cube + refraction lines.
    const inner = ignite;
    if (inner > 0) {
      glow.globalAlpha = alpha * inner * (0.55 + 0.2 * breathe);
      const ir = R * 0.45;
      const ig = glow.createRadialGradient(cx, cy, 0, cx, cy, ir);
      ig.addColorStop(0, "rgba(255,243,214,1)");
      ig.addColorStop(0.3, rgba(COLORS.gold, 0.55));
      ig.addColorStop(1, rgba(COLORS.gold, 0));
      glow.fillStyle = ig;
      glow.fillRect(cx - ir, cy - ir, ir * 2, ir * 2);

      ctx.globalAlpha = alpha * inner * 0.6;
      ctx.strokeStyle = COLORS.goldPale;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let e = 0; e < 12; e++) {
        const [a, b] = EDGES[e];
        ctx.moveTo(projIn[a * 2], projIn[a * 2 + 1]);
        ctx.lineTo(projIn[b * 2], projIn[b * 2 + 1]);
      }
      ctx.stroke();
      ctx.globalAlpha = alpha * inner * 0.14;
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (let v = 0; v < 8; v++) {
        ctx.moveTo(projIn[v * 2], projIn[v * 2 + 1]);
        ctx.lineTo(proj[v * 2], proj[v * 2 + 1]);
      }
      ctx.stroke();
      ctx.globalAlpha = alpha * inner;
      ctx.fillStyle = "#FFF4DA";
      ctx.beginPath();
      ctx.arc(cx, cy, 1.6 + breathe * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Front glass faces.
    const faceA = easeOut(seg(p, 0.12, 0.38));
    if (faceA > 0) {
      for (let fi = 0; fi < 6; fi++) {
        const F = FACES[fi];
        if (facing(F.n, yaw, pitch) <= 0.02) continue;
        const sh = shade(F.n, yaw, pitch);
        const v = F.v;
        const g = ctx.createLinearGradient(proj[v[0] * 2], proj[v[0] * 2 + 1], proj[v[2] * 2], proj[v[2] * 2 + 1]);
        g.addColorStop(0, rgba(COLORS.goldPale, 0.05 + sh * 0.3));
        g.addColorStop(0.55, rgba(COLORS.gold, 0.02 + sh * 0.1));
        g.addColorStop(1, rgba(COLORS.goldDeep, 0.03 + sh * 0.18));
        ctx.globalAlpha = alpha * faceA;
        ctx.fillStyle = g;
        ctx.beginPath();
        facePath(ctx, proj, v);
        ctx.fill();
      }
      // Sheen band sweeping across the glass.
      const sweep = seg(p, 0.42, 0.82);
      if (sweep > 0 && sweep < 1) {
        ctx.save();
        ctx.beginPath();
        for (let fi = 0; fi < 6; fi++) {
          const F = FACES[fi];
          if (facing(F.n, yaw, pitch) <= 0.02) continue;
          facePath(ctx, proj, F.v);
        }
        ctx.clip();
        const k = easeInOutSine(sweep);
        const sxp = lerp(cx - R * 1.4, cx + R * 1.4, k);
        const sg = ctx.createLinearGradient(sxp - R * 0.35, cy - R, sxp + R * 0.35, cy + R);
        sg.addColorStop(0, "rgba(255,240,210,0)");
        sg.addColorStop(0.5, `rgba(255,240,210,${0.22 * Math.sin(Math.PI * sweep)})`);
        sg.addColorStop(1, "rgba(255,240,210,0)");
        ctx.globalAlpha = alpha;
        ctx.fillStyle = sg;
        ctx.fillRect(cx - R * 1.5, cy - R * 1.5, R * 3, R * 3);
        ctx.restore();
      }
    }

    // Front edges, drawn in, with rim light.
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 1.4;
    ctx.lineJoin = "round";
    ctx.globalAlpha = alpha * 0.95;
    glow.strokeStyle = COLORS.goldPale;
    glow.lineWidth = 2.2;
    glow.globalAlpha = alpha * (0.35 + 0.35 * ignite);
    ctx.beginPath();
    glow.beginPath();
    for (let e = 0; e < 12; e++) {
      const [a, b] = EDGES[e];
      // Front edge if it belongs to any visible face.
      const [f0, f1] = EDGE_FACES[e];
      if (facing(FACES[f0].n, yaw, pitch) <= 0.02 && facing(FACES[f1].n, yaw, pitch) <= 0.02) continue;
      const k = clamp(build * 1.3 - (e % 4) * 0.08);
      if (k <= 0) continue;
      const ax = proj[a * 2];
      const ay = proj[a * 2 + 1];
      const ex = lerp(ax, proj[b * 2], k);
      const ey = lerp(ay, proj[b * 2 + 1], k);
      ctx.moveTo(ax, ay);
      ctx.lineTo(ex, ey);
      glow.moveTo(ax, ay);
      glow.lineTo(ex, ey);
    }
    ctx.stroke();
    glow.stroke();
    // Vertex sparks.
    glow.globalAlpha = alpha * build * (0.5 + 0.5 * ignite);
    glow.fillStyle = "#FFF1CF";
    glow.beginPath();
    for (let v = 0; v < 8; v++) glow.rect(proj[v * 2] - 1.6, proj[v * 2 + 1] - 1.6, 3.2, 3.2);
    glow.fill();

    // Reflection pool under the core.
    const py = cy + R * 1.08;
    ctx.globalAlpha = alpha * 0.5 * ignite;
    const pg = ctx.createRadialGradient(cx, py, 0, cx, py, R * 1.3);
    pg.addColorStop(0, rgba(COLORS.gold, 0.22));
    pg.addColorStop(1, rgba(COLORS.gold, 0));
    ctx.fillStyle = pg;
    ctx.save();
    ctx.translate(cx, py);
    ctx.scale(1, 0.18);
    ctx.translate(-cx, -py);
    ctx.fillRect(cx - R * 1.3, py - R * 1.3, R * 2.6, R * 2.6);
    ctx.restore();

    glow.restore();
    ctx.restore();
  }

  function drawLabels(f: SceneFrame) {
    const { ctx, p, fonts, local } = f;
    const labels = copy.intro.canvas;
    const nar = L.narrow;
    const ca = easeOut(seg(p, 0.22, 0.42));
    if (nar) drawLabel(ctx, fonts.mono, labels.core, L.cx + L.R * 0.35, L.cy + L.R * 1.55, COLORS.goldPale, ca * 0.9, "right", 8.5);
    else drawLabel(ctx, fonts.mono, labels.core, L.cx, L.cy + L.R * 1.38, COLORS.goldPale, ca * 0.9, "center", 10);
    if (!nar) {
      const ia = easeOut(seg(p, 0.08, 0.28)) * (1 - 0.5 * seg(p, 0.6, 0.9));
      drawLabel(ctx, fonts.mono, introScenesA.convergence.input, L.w * 0.06, L.yTop + 6, COLORS.faint, ia, "left", 10);
    }
    for (let b = 0; b < 3; b++) {
      const a0 = CONFIG.bundleStart + b * CONFIG.bundleStagger + CONFIG.bundleDur * 0.85;
      const k = seg(p, a0, a0 + 0.14);
      if (k <= 0) continue;
      const mx = L.endX;
      const my = L.bundleY[b];
      // Marker: gold diamond + one-off ring.
      ctx.save();
      ctx.globalAlpha *= easeOut(k);
      ctx.fillStyle = COLORS.gold;
      ctx.translate(mx + (nar ? 4 : 6), my);
      ctx.rotate(Math.PI / 4);
      const ms = nar ? 3 : 3.6;
      ctx.fillRect(-ms, -ms, ms * 2, ms * 2);
      ctx.restore();
      const ringK = clamp((p - a0) * f.dur / 900);
      if (ringK < 1) {
        ctx.save();
        ctx.globalAlpha *= (1 - ringK) * 0.8;
        ctx.strokeStyle = COLORS.goldPale;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(mx + (nar ? 4 : 6), my, 4 + easeOut(ringK) * 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      f.glow.save();
      f.glow.globalAlpha *= easeOut(k) * (0.7 + 0.3 * Math.sin(local / 400 + b));
      f.glow.fillStyle = COLORS.gold;
      f.glow.beginPath();
      f.glow.arc(mx + (nar ? 4 : 6), my, 5, 0, Math.PI * 2);
      f.glow.fill();
      f.glow.restore();
      // Label with a left-to-right wipe.
      const lx = mx + (nar ? 14 : 20);
      const wipe = easeInOut(seg(p, a0 + 0.02, a0 + 0.16));
      ctx.save();
      ctx.beginPath();
      ctx.rect(lx - 2, my - 30, wipe * (L.w - lx), 60);
      ctx.clip();
      drawLabel(ctx, fonts.mono, `0${b + 1}`, lx, my - (nar ? 13 : 16), COLORS.goldDeep, 1, "left", nar ? 8 : 9);
      drawLabel(ctx, fonts.mono, labels.bundles[b], lx, my, b === 1 ? COLORS.goldPale : COLORS.text, 1, "left", nar ? 9.5 : 12);
      if (!nar) drawLabel(ctx, fonts.mono, introScenesA.convergence.notes[b], lx, my + 17, COLORS.dim, 0.8, "left", 9);
      ctx.restore();
    }
  }

  return {
    id: "convergence",
    resize,
    draw(f: SceneFrame) {
      if (f.alpha <= 0) return;
      if (f.w !== L.w || f.h !== L.h) resize(f.w, f.h);
      drawStrands(f);
      drawBundles(f);
      drawCore(f);
      drawLabels(f);
    },
  };
}
