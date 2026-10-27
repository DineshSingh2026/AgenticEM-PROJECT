import type { FilmScene, SceneFrame } from "../types";
import { COLORS, clamp, easeInOut, easeInOutSine, easeOut, hexHash, lerp, mulberry32, rgba, seg } from "../util";
import { copy } from "@/content/copy";
import { introScenesB as S } from "@/content/copy/intro-scenes-b";

/**
 * 03 — "Every round, settled".
 * A perspective field of agent nodes recedes toward a horizon; rounds settle as slow gold flashes
 * with agent↔agent arcs. Below, a glass ledger chain slides left while the newest block assembles,
 * cascades its hash, and confirms with a gold edge flare. Pure function of `local` (seekable).
 */
const CONFIG = {
  seed: 0x5e771e,
  field: {
    cols: 40,
    colsNarrow: 22,
    rows: 28,
    zNear: 1,
    zFar: 7.6,
    xSpan: 1.5,
    /** World units of dolly per ms (camera drifts into the field). */
    dolly: 0.00021,
  },
  events: {
    /** Settlement event start times (ms, scene-local). Fewer, bigger, slower. */
    times: [120, 620, 1120, 1600, 2080, 2560, 3020],
    life: 1500,
    /** Fraction of life spent drawing the arc before the settle flash. */
    travel: 0.36,
  },
  chain: {
    newHeight: 4812314,
    blocksBehind: 7,
    traceStart: 80,
    traceEnd: 520,
    labelAt: 380,
    hashStart: 560,
    hashStep: 66,
    confirmAt: 1820,
    shiftStart: 2180,
    shiftEnd: 3220,
    /** Slow continuous drift, px per ms. */
    drift: 0.012,
  },
} as const;

const HEX = "0123456789abcdef";
const TAU = Math.PI * 2;

function scramble(i: number, k: number) {
  let x = Math.imul(i + 17, 374761393) ^ Math.imul(k + 3, 668265263);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return HEX[(x >>> 0) & 15];
}

interface SettleEvent {
  t: number;
  ax: number;
  az: number;
  bx: number;
  bz: number;
  big: boolean;
  label: string;
}

export function createSettlementScene(): FilmScene {
  let W = 0;
  let H = 0;
  let narrow = false;
  // Field (world coordinates).
  let n = 0;
  let fx = new Float32Array(0);
  let fz = new Float32Array(0);
  let fph = new Float32Array(0);
  let fsz = new Float32Array(0);
  // Projection.
  let cx = 0;
  let horizon = 0;
  let depthH = 0;
  let halfW = 0;
  // Chain layout.
  let bw = 0;
  let bh = 0;
  let pitch = 0;
  let chainY = 0;
  let anchor = 0;
  let labelMinY = 0;
  let fsLabel = 11;
  let fsHash = 12;
  let fsStatus = 10;
  const events: SettleEvent[] = [];
  const hashes: string[] = [];
  const heights: string[] = [];
  const txs: string[] = [];
  let blockFill: CanvasGradient | null = null;
  let gridGrad: CanvasGradient | null = null;
  let sprite: HTMLCanvasElement | null = null;
  let gridCtx: CanvasRenderingContext2D | null = null;

  const zEff = (zw: number, local: number) => {
    const span = CONFIG.field.zFar - CONFIG.field.zNear;
    let z = zw - CONFIG.field.zNear - local * CONFIG.field.dolly;
    z = ((z % span) + span) % span;
    return z + CONFIG.field.zNear;
  };
  const px = (x: number, z: number) => cx + (x * halfW) / z;
  const py = (z: number) => horizon + depthH / z;

  function makeSprite() {
    if (sprite || typeof document === "undefined") return;
    sprite = document.createElement("canvas");
    sprite.width = sprite.height = 64;
    const c = sprite.getContext("2d");
    if (!c) return;
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,240,200,1)");
    g.addColorStop(0.18, rgba(COLORS.goldPale, 0.85));
    g.addColorStop(0.45, rgba(COLORS.gold, 0.32));
    g.addColorStop(1, rgba(COLORS.gold, 0));
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  }

  function glowAt(g: CanvasRenderingContext2D, x: number, y: number, r: number, a: number, base: number) {
    if (!sprite || a <= 0.003) return;
    g.globalAlpha = base * clamp(a);
    g.drawImage(sprite, x - r, y - r, r * 2, r * 2);
  }

  function resize(w: number, h: number) {
    W = w;
    H = h;
    narrow = w < 760;
    const rng = mulberry32(CONFIG.seed);
    const bar = clamp(h * 0.08, 44, 84);
    const F = CONFIG.field;
    const cols = narrow ? F.colsNarrow : F.cols;
    n = cols * F.rows;
    fx = new Float32Array(n);
    fz = new Float32Array(n);
    fph = new Float32Array(n);
    fsz = new Float32Array(n);
    const span = F.zFar - F.zNear;
    for (let r = 0; r < F.rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        fx[i] = -F.xSpan + ((c + 0.5 + (rng() - 0.5) * 0.5) / cols) * F.xSpan * 2;
        fz[i] = F.zNear + ((r + rng() * 0.6) / F.rows) * span;
        fph[i] = rng() * TAU;
        fsz[i] = 0.75 + rng() * 0.6;
      }
    }
    cx = w / 2;
    labelMinY = narrow ? h * 0.19 : bar + 38;
    halfW = narrow ? w * 0.62 : w * 0.5;
    if (narrow) {
      horizon = h * 0.2;
      depthH = h * 0.4 - horizon;
    } else {
      horizon = bar + h * 0.035;
      depthH = h * 0.385 - horizon;
    }

    // Settlement events: place nodes so they sit at a pleasant depth when they fire.
    events.length = 0;
    const E = CONFIG.events;
    for (let k = 0; k < E.times.length; k++) {
      const t = E.times[k] + E.life * E.travel;
      const targetZ = 1.45 + rng() * 2.1;
      const zw = targetZ + t * F.dolly; // zEff(zw, t) ≈ targetZ
      const side = k % 2 === 0 ? -1 : 1;
      const ax = side * (0.1 + ((k * 0.37) % 1) * 0.75) * (narrow ? 0.6 : 1);
      const dx = (0.24 + rng() * 0.3) * -side * (narrow ? 0.7 : 1);
      events.push({
        t: E.times[k],
        ax,
        az: zw,
        bx: ax + dx,
        bz: zw + (rng() - 0.5) * 0.9,
        big: k % 2 === 0,
        label: `${copy.intro.canvas.settled} · ${S.roundPrefix}${hexHash(rng, 6)}`,
      });
    }

    // Chain.
    hashes.length = 0;
    heights.length = 0;
    txs.length = 0;
    const C = CONFIG.chain;
    for (let k = -1; k <= C.blocksBehind; k++) {
      hashes.push(hexHash(rng, 16));
      heights.push(`${copy.intro.canvas.block} #${(C.newHeight - k).toLocaleString("en-US")}`);
      txs.push(`${(380 + Math.floor(rng() * 900)).toLocaleString("en-US")} ${S.tx}`);
    }
    if (narrow) {
      bw = Math.min(158, w * 0.42);
      bh = 82;
      pitch = bw + 30;
      chainY = h * 0.475;
      anchor = w * 0.5 - bw * 0.15;
      fsLabel = 9.5;
      fsHash = 10;
      fsStatus = 9;
    } else {
      bw = clamp(w * 0.142, 176, 226);
      bh = 98;
      pitch = bw + Math.round(bw * 0.3);
      chainY = h * 0.455;
      anchor = w * 0.62;
      fsLabel = 11;
      fsHash = 13.5;
      fsStatus = 10;
    }
    blockFill = null;
    gridGrad = null;
    gridCtx = null;
  }

  function ensureGradients(ctx: CanvasRenderingContext2D) {
    if (!blockFill) {
      blockFill = ctx.createLinearGradient(0, chainY, 0, chainY + bh);
      blockFill.addColorStop(0, "rgba(34,38,46,0.82)");
      blockFill.addColorStop(0.5, "rgba(20,23,29,0.86)");
      blockFill.addColorStop(1, "rgba(13,15,19,0.92)");
    }
    if (!gridGrad || gridCtx !== ctx) {
      gridCtx = ctx;
      gridGrad = ctx.createLinearGradient(0, horizon, 0, horizon + depthH);
      gridGrad.addColorStop(0, rgba(COLORS.steel, 0));
      gridGrad.addColorStop(1, rgba(COLORS.steel, 0.11));
    }
  }

  function drawField(f: SceneFrame, base: number, local: number) {
    const { ctx } = f;
    const F = CONFIG.field;
    const reveal = easeOut(seg(local, -350, 900));
    if (reveal <= 0) return;
    const revealZ = F.zNear + reveal * (F.zFar - F.zNear + 0.5);

    // Horizon haze: a wide, flat gold light sitting on the vanishing line.
    if (sprite) {
      ctx.globalAlpha = base * reveal * 0.16;
      ctx.drawImage(sprite, cx - W * 0.55, horizon - depthH * 0.22, W * 1.1, depthH * 0.7);
      f.glow.globalAlpha = base * reveal * 0.12;
      f.glow.drawImage(sprite, cx - W * 0.3, horizon + depthH * 0.06, W * 0.6, depthH * 0.16);
    }
    // Perspective grid: radial rails + a few depth lines.
    ctx.globalAlpha = base * reveal;
    ctx.strokeStyle = gridGrad!;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -F.xSpan; x <= F.xSpan + 1e-3; x += F.xSpan / 5) {
      ctx.moveTo(px(x, F.zFar), py(F.zFar));
      ctx.lineTo(px(x, 1), py(1));
    }
    for (let r = 0; r < 7; r++) {
      const z = zEff(F.zNear + r * ((F.zFar - F.zNear) / 7), local);
      if (z > revealZ) continue;
      const y = py(z);
      ctx.moveTo(px(-F.xSpan, z), y);
      ctx.lineTo(px(F.xSpan, z), y);
    }
    ctx.stroke();

    // Agent nodes.
    ctx.fillStyle = COLORS.steel;
    const tw = local * 0.0016;
    for (let i = 0; i < n; i++) {
      const z = zEff(fz[i], local);
      if (z > revealZ) continue;
      const fade = seg(z, 1, 1.55) * (1 - seg(z, 6.2, F.zFar));
      if (fade <= 0) continue;
      const s = 1 / z;
      const x = px(fx[i], z);
      if (x < -4 || x > W + 4) continue;
      const y = py(z);
      const a = fade * (0.18 + 0.62 * Math.pow(s, 0.8)) * (0.82 + 0.18 * Math.sin(tw + fph[i]));
      const r = (0.55 + 2.0 * s) * fsz[i];
      ctx.globalAlpha = base * reveal * a;
      if (r < 1.25) ctx.fillRect(x - r, y - r * 0.8, r * 2, r * 1.6);
      else {
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.82, 0, 0, TAU);
        ctx.fill();
      }
    }
  }

  function drawEvents(f: SceneFrame, base: number, local: number) {
    const { ctx, glow } = f;
    const E = CONFIG.events;
    for (let k = 0; k < events.length; k++) {
      const e = events[k];
      const u = (local - e.t) / E.life;
      if (u < 0 || u > 1) continue;
      const za = zEff(e.az, local);
      const zb = zEff(e.bz, local);
      const ax = px(e.ax, za);
      const ay = py(za);
      const bx = px(e.bx, zb);
      const by = py(zb);
      const sA = 1 / za;
      const sB = 1 / zb;
      const mx = (ax + bx) / 2;
      const dist = Math.abs(bx - ax);
      const my = Math.min(ay, by) - dist * 0.42 - 8;
      const nodeIn = easeOut(seg(u, 0, 0.12)) * (1 - seg(u, 0.82, 1));
      const travel = easeInOutSine(seg(u, 0.04, E.travel));
      const arcFade = 1 - seg(u, E.travel + 0.05, 0.85);

      // Hero nodes.
      ctx.fillStyle = COLORS.goldPale;
      ctx.globalAlpha = base * nodeIn;
      ctx.beginPath();
      ctx.arc(ax, ay, 1.4 + 2.4 * sA, 0, TAU);
      ctx.moveTo(bx + 1.4 + 2.4 * sB, by);
      ctx.arc(bx, by, 1.4 + 2.4 * sB, 0, TAU);
      ctx.fill();
      glowAt(glow, ax, ay, 10 + 14 * sA, nodeIn * 0.55, base);
      glowAt(glow, bx, by, 10 + 14 * sB, nodeIn * 0.55 * travel, base);

      // Arc agent → agent.
      if (travel > 0 && arcFade > 0) {
        const steps = 24;
        const m = Math.max(1, Math.round(steps * travel));
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = COLORS.gold;
        ctx.globalAlpha = base * 0.55 * arcFade;
        ctx.beginPath();
        let hx = ax;
        let hy = ay;
        for (let j = 0; j <= m; j++) {
          const v = (j / m) * travel;
          const iv = 1 - v;
          hx = iv * iv * ax + 2 * iv * v * mx + v * v * bx;
          hy = iv * iv * ay + 2 * iv * v * my + v * v * by;
          if (j === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.stroke();
        // Packet head.
        if (travel < 1) {
          ctx.globalAlpha = base;
          ctx.fillStyle = "#FFF4D6";
          ctx.fillRect(hx - 1.5, hy - 1.5, 3, 3);
          glowAt(glow, hx, hy, 16, 0.9, base);
        }
      }

      // Settle flash + rings at both agents.
      const fu = (local - (e.t + E.life * E.travel)) / (E.life * (1 - E.travel));
      if (fu >= 0 && fu <= 1) {
        const flash = Math.pow(1 - fu, 2.2);
        for (let side = 0; side < 2; side++) {
          const x = side ? ax : bx;
          const y = side ? ay : by;
          const s = side ? sA : sB;
          const delay = side ? 0.08 : 0;
          const ru = seg(fu, delay, 1);
          const rr = (e.big ? 54 : 38) * s * easeOut(ru) + 3;
          ctx.globalAlpha = base * (1 - ru) * 0.85;
          ctx.strokeStyle = COLORS.gold;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(x, y, rr, rr * 0.36, 0, 0, TAU);
          ctx.stroke();
          const r2u = seg(fu, delay + 0.18, 1);
          if (r2u > 0) {
            const r2 = (e.big ? 54 : 38) * s * easeOut(r2u) * 0.8 + 2;
            ctx.globalAlpha = base * (1 - r2u) * 0.45;
            ctx.beginPath();
            ctx.ellipse(x, y, r2, r2 * 0.36, 0, 0, TAU);
            ctx.stroke();
          }
          glowAt(glow, x, y, (e.big ? 50 : 34) * (0.55 + s), flash * (side ? 0.6 : 0.85), base);
          glow.globalAlpha = base * flash * 0.6;
          glow.strokeStyle = COLORS.gold;
          glow.lineWidth = 2;
          glow.beginPath();
          glow.ellipse(x, y, rr, rr * 0.36, 0, 0, TAU);
          glow.stroke();
        }
        // Label for the bigger settlements.
        if (e.big) {
          const la = seg(fu, 0, 0.12) * (1 - seg(fu, 0.65, 1));
          const ly = Math.max(labelMinY, my - 14 - 10 * easeOut(fu));
          ctx.globalAlpha = base * la * 0.5;
          ctx.strokeStyle = COLORS.gold;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(mx, my + (Math.min(ay, by) - my) * 0.5 - 2);
          ctx.lineTo(mx, ly + 7);
          ctx.stroke();
          label(ctx, f.fonts.mono, e.label, mx, ly, COLORS.goldPale, base * la, "center", narrow ? 9 : 10);
        }
      }
    }
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
    weight = 500,
    tracking = 0.14,
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

  /** Rect perimeter trace (0..1) clockwise from the top-left corner. */
  function tracePath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, u: number) {
    const per = 2 * (w + h);
    let L = per * clamp(u);
    ctx.moveTo(x, y);
    const seg1 = Math.min(L, w);
    ctx.lineTo(x + seg1, y);
    L -= seg1;
    if (L <= 0) return;
    const seg2 = Math.min(L, h);
    ctx.lineTo(x + w, y + seg2);
    L -= seg2;
    if (L <= 0) return;
    const seg3 = Math.min(L, w);
    ctx.lineTo(x + w - seg3, y + h);
    L -= seg3;
    if (L <= 0) return;
    ctx.lineTo(x, y + h - Math.min(L, h));
  }

  function drawBlock(
    f: SceneFrame,
    base: number,
    local: number,
    slot: number,
    x: number,
    a: number,
    /** Local time since this block started assembling (Infinity = long confirmed). */
    age: number,
  ) {
    const { ctx, glow } = f;
    const C = CONFIG.chain;
    const y = chainY;
    const isLive = age < 1e8;
    const trace = isLive ? easeInOut(seg(age, C.traceStart, C.traceEnd)) : 1;
    const body = isLive ? easeOut(seg(age, C.traceStart + 120, C.traceEnd + 260)) : 1;
    const confirmed = !isLive || age >= C.confirmAt;
    const flareU = isLive ? seg(age, C.confirmAt, C.confirmAt + 900) : 1;
    const flare = isLive && age >= C.confirmAt ? Math.pow(1 - flareU, 1.6) : 0;

    // Glass body.
    if (body > 0) {
      ctx.globalAlpha = base * a * body;
      ctx.fillStyle = blockFill!;
      ctx.fillRect(x, y, bw, bh);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(x + 1, y + 1, bw - 2, 1);
      ctx.fillStyle = "rgba(255,255,255,0.018)";
      ctx.fillRect(x + 1, y + 2, bw - 2, bh * 0.38);
    }
    // Edges.
    ctx.lineWidth = 1;
    if (trace < 1) {
      ctx.globalAlpha = base * a;
      ctx.strokeStyle = COLORS.gold;
      ctx.beginPath();
      tracePath(ctx, x + 0.5, y + 0.5, bw - 1, bh - 1, trace);
      ctx.stroke();
      if (trace > 0) {
        // Bright tracer head on glow.
        const per = 2 * (bw + bh);
        let L = per * trace;
        let hx = x;
        let hy = y;
        if (L <= bw) hx = x + L;
        else if ((L -= bw) <= bh) (hx = x + bw), (hy = y + L);
        else if ((L -= bh) <= bw) (hx = x + bw - L), (hy = y + bh);
        else (hy = y + bh - (L - bw)), (hx = x);
        glowAt(glow, hx, hy, 14, 0.9, base * a);
      }
    } else {
      ctx.globalAlpha = base * a * (0.42 + 0.5 * flare);
      ctx.strokeStyle = COLORS.goldDeep;
      ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
      ctx.globalAlpha = base * a * (0.75 + 0.25 * flare);
      ctx.strokeStyle = slot === 0 && isLive ? COLORS.gold : rgba(COLORS.gold, 0.7);
      ctx.beginPath();
      ctx.moveTo(x + 0.5, y + 0.5);
      ctx.lineTo(x + bw - 0.5, y + 0.5);
      ctx.stroke();
      // Corner ticks.
      const tk = 7;
      ctx.strokeStyle = COLORS.gold;
      ctx.globalAlpha = base * a * 0.9;
      ctx.beginPath();
      ctx.moveTo(x - 3, y + tk);
      ctx.lineTo(x - 3, y - 3);
      ctx.lineTo(x + tk, y - 3);
      ctx.moveTo(x + bw + 3, y + bh - tk);
      ctx.lineTo(x + bw + 3, y + bh + 3);
      ctx.lineTo(x + bw - tk, y + bh + 3);
      ctx.stroke();
    }
    // Confirmation flare: edge glow + a light sweep around the perimeter.
    if (flare > 0) {
      glow.globalAlpha = base * a * flare;
      glow.strokeStyle = COLORS.gold;
      glow.lineWidth = 2.5;
      glow.strokeRect(x, y, bw, bh);
      const su = easeOut(flareU);
      glow.globalAlpha = base * a * Math.min(1, flare * 1.6);
      glow.strokeStyle = COLORS.goldPale;
      glow.lineWidth = 3;
      glow.beginPath();
      tracePath(glow, x, y, bw, bh, su);
      glow.stroke();
      ctx.globalAlpha = base * a * flare * 0.9;
      ctx.strokeStyle = COLORS.goldPale;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
      ctx.lineWidth = 1;
      ctx.globalAlpha = base * a * flare * 0.12;
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(x, y, bw, bh);
    }

    if (body <= 0) return;
    const idx = slot + 1;
    const pad = narrow ? 10 : 14;
    const mono = f.fonts.mono;
    const ta = base * a * body;
    // Header: BLOCK #… and tx count.
    const labelK = isLive ? seg(age, C.labelAt, C.labelAt + 260) : 1;
    label(ctx, mono, heights[idx], x + pad, y + pad + 4, COLORS.dim, ta * labelK, "left", fsLabel);
    if (!narrow) label(ctx, mono, txs[idx], x + bw - pad, y + pad + 4, COLORS.faint, ta * labelK * 0.9, "right", fsLabel - 1.5, 500, 0.08);

    // Hash.
    const hash = hashes[idx];
    const hy = y + bh * 0.5 + 1;
    const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
    c.font = `500 ${fsHash}px ${mono}`;
    c.textBaseline = "middle";
    c.textAlign = "left";
    if ("letterSpacing" in c) c.letterSpacing = "0.6px";
    const chars = narrow ? 12 : 16;
    if (!isLive || age > C.hashStart + chars * C.hashStep + 200) {
      c.globalAlpha = ta * (slot === 0 && isLive ? 1 : 0.8);
      c.fillStyle = slot === 0 && isLive ? COLORS.goldPale : COLORS.faint;
      c.fillText(`0x${hash.slice(0, chars)}`, x + pad, hy);
    } else if (age >= C.hashStart - 120) {
      const cw = c.measureText("0").width + 0.6;
      c.globalAlpha = ta;
      c.fillStyle = COLORS.goldPale;
      c.fillText("0x", x + pad, hy);
      const lockN = Math.floor((age - C.hashStart) / C.hashStep);
      const frameK = Math.floor(age / 55);
      for (let i = 0; i < chars; i++) {
        const cxp = x + pad + cw * (2 + i);
        if (i < lockN) {
          c.globalAlpha = ta;
          c.fillStyle = COLORS.goldPale;
          c.fillText(hash[i], cxp, hy);
          // Freshly locked glyph glints.
          const since = age - (C.hashStart + (i + 1) * C.hashStep);
          if (since < 220) glowAt(glow, cxp + cw / 2, hy, 9, 0.5 * (1 - since / 220), base * a);
        } else if (i < lockN + 4) {
          c.globalAlpha = ta * (0.75 - (i - lockN) * 0.17);
          c.fillStyle = COLORS.gold;
          c.fillText(scramble(i, frameK + idx * 31), cxp, hy);
        }
      }
    }
    if ("letterSpacing" in c) c.letterSpacing = "0px";

    // Status.
    const sy = y + bh - pad - 3;
    if (confirmed) {
      ctx.globalAlpha = ta;
      ctx.fillStyle = COLORS.green;
      ctx.fillRect(x + pad, sy - 3, 6, 6);
      if (flare > 0) glowAt(glow, x + pad + 3, sy, 12, flare, base * a);
      label(ctx, mono, S.confirmed, x + pad + 14, sy, slot === 0 && isLive ? COLORS.green : COLORS.faint, ta * (slot === 0 ? 1 : 0.85), "left", fsStatus);
    } else {
      const pulse = 0.55 + 0.45 * Math.sin(age * 0.0075);
      ctx.globalAlpha = ta * pulse;
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(x + pad, sy - 3, 6, 6);
      glowAt(glow, x + pad + 3, sy, 10, 0.6 * pulse * labelK, base * a);
      label(ctx, mono, S.pending, x + pad + 14, sy, COLORS.gold, ta * labelK, "left", fsStatus);
    }
    void local;
  }

  function drawConnector(f: SceneFrame, base: number, local: number, x0: number, x1: number, a: number, k: number) {
    if (a <= 0 || x1 - x0 < 2) return;
    const { ctx, glow } = f;
    const y = chainY + bh / 2;
    ctx.globalAlpha = base * a * 0.5;
    ctx.strokeStyle = COLORS.goldDeep;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    // Small terminals.
    ctx.globalAlpha = base * a * 0.8;
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x0 - 1, y - 2, 2, 4);
    ctx.fillRect(x1 - 1, y - 2, 2, 4);
    // Light packets carrying the chain forward.
    for (let j = 0; j < 2; j++) {
      let q = local / 1250 + j * 0.5 + k * 0.29;
      q = q - Math.floor(q);
      const e = easeInOutSine(q);
      const xx = lerp(x0, x1, e);
      const pa = Math.sin(Math.PI * q);
      ctx.globalAlpha = base * a * pa;
      ctx.fillStyle = "#FFF1CC";
      ctx.fillRect(xx - 3, y - 1, 6, 2);
      glowAt(glow, xx, y, 11, pa * 0.85, base * a);
    }
  }

  function drawChain(f: SceneFrame, base: number, local: number) {
    const C = CONFIG.chain;
    const intro = easeOut(seg(local, -200, 650));
    if (intro <= 0) return;
    const shift = pitch * easeInOut(seg(local, C.shiftStart, C.shiftEnd)) + local * C.drift;
    const slide = (1 - intro) * 40;
    const fadeL = narrow ? 0 : W * 0.04;

    // Section label.
    label(f.ctx, f.fonts.mono, S.ledger, narrow ? 26 : W * 0.06, chainY - (narrow ? 16 : 22), COLORS.faint, base * intro, "left", narrow ? 9 : 10);

    // Next slot (k = -1) begins after the slide.
    for (let k: number = C.blocksBehind; k >= -1; k--) {
      const x = anchor - k * pitch - shift + slide;
      if (x > W + 10 || x + bw < -10) continue;
      const edge = clamp((x + bw - fadeL) / (bw * 1.6));
      const depth = k <= 0 ? 1 : Math.max(0.3, 1 - (k - 1) * 0.11);
      let a = intro * edge * depth;
      let age = 1e9;
      if (k === 0) age = local;
      if (k === -1) {
        age = local - C.shiftStart - 300;
        if (age < 0) continue;
        a *= 0.92;
      }
      // Connector to the block on the right (k-1).
      const rightX = anchor - (k - 1) * pitch - shift + slide;
      if (k >= 1) drawConnector(f, base, local, x + bw, rightX, a * (k === 1 ? clamp(seg(local, 250, 700)) : 1), k);
      else if (k === 0 && local > C.shiftStart + 200) drawConnector(f, base, local, x + bw, rightX, a * seg(local, C.shiftStart + 200, C.shiftStart + 700), k);
      drawBlock(f, base, local, k, x, a, age);
    }
  }

  return {
    id: "settlement",
    resize,
    draw(f: SceneFrame) {
      if (f.w !== W || f.h !== H || f.narrow !== narrow) resize(f.w, f.h);
      makeSprite();
      const base = f.alpha;
      if (base <= 0) return;
      const { ctx, glow } = f;
      ensureGradients(ctx);
      ctx.save();
      glow.save();
      drawField(f, base, f.local);
      drawEvents(f, base, f.local);
      drawChain(f, base, f.local);
      ctx.restore();
      glow.restore();
      ctx.globalAlpha = base;
      glow.globalAlpha = base;
    },
  };
}
