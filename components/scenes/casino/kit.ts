"use client";
import * as THREE from "three";
import { afterCanvasFonts, canvasFont } from "@/lib/canvas-fonts";

/**
 * Shared toolkit for the game pods that orbit the hero roulette wheel: one material registry
 * (so every pod fades with the scene), procedural canvas textures, the robot-agent rig and small
 * particle pools. Everything is created once per quality tier and disposed with the kit.
 */

export const TAU = Math.PI * 2;

export const PAL = {
  gold: "#E8B65A",
  goldPale: "#F7DFA3",
  goldDeep: "#B07A2A",
  lacquer: "#0C0E11",
  ivory: "#F3EAD7",
  ruby: "#C8283F",
  teal: "#2EE6DC",
  emerald: "#2FD08A",
  felt: "#0E4234",
} as const;

/* ------------------------------------------------------------------ */
/* Easing / timing                                                     */
/* ------------------------------------------------------------------ */
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const seg = (u: number, a: number, b: number) => clamp01((u - a) / (b - a));
export const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
export const easeOut = (x: number, p = 3) => 1 - Math.pow(1 - clamp01(x), p);
export const easeIn = (x: number, p = 2) => Math.pow(clamp01(x), p);
export const backOut = (x: number, s = 1.7) => {
  const t = clamp01(x) - 1;
  return t * t * ((s + 1) * t + s) + 1;
};
export const lerp = THREE.MathUtils.lerp;
export const hop = (s: number) => 4 * s * (1 - s);
/** Deterministic hash -> [0,1) for per-cycle choices. */
export const hash = (n: number) => {
  let t = (n * 0x9e3779b1) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Fixed-period beat with edge detection: `cross(x)` is true on the frame the cycle passes x. */
export class Beat {
  k = -1;
  u = 0;
  prev = 0;
  constructor(public period: number, public offset = 0) {}
  step(t: number) {
    const tt = t + this.offset;
    const k = Math.floor(tt / this.period);
    const u = tt - k * this.period;
    if (k !== this.k) {
      this.k = k;
      this.prev = -1;
    } else this.prev = this.u;
    this.u = u;
    return this;
  }
  cross(x: number) {
    return this.prev < x && this.u >= x;
  }
}

export interface Clock {
  t: number;
  dt: number;
  on: boolean;
  fo: number;
}

/* ------------------------------------------------------------------ */
/* Canvas textures                                                     */
/* ------------------------------------------------------------------ */
function canvasTexture(w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void, opts: { srgb?: boolean; flipY?: boolean } = {}) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const run = () => {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    paint(ctx);
    ctx.restore();
  };
  run();
  const t = new THREE.CanvasTexture(c);
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = opts.flipY ?? true;
  t.anisotropy = 8;
  afterCanvasFonts(() => {
    run();
    t.needsUpdate = true;
  });
  return t;
}

function goldGrad(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.05, cx, cy, r);
  g.addColorStop(0, "#fff0c4");
  g.addColorStop(0.45, "#e8b65a");
  g.addColorStop(1, "#8a5a1c");
  return g;
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, n: number, r0: number, r1: number, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r1 : r0;
    const a = rot + (i / (n * 2)) * TAU;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Soft radial sprite (white), tinted by material colour. */
function glowTexture() {
  return canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.18, "rgba(255,255,255,0.55)");
    g.addColorStop(0.5, "rgba(255,255,255,0.12)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }, { srgb: false });
}

/** Top deck of every pod: lacquer with gold inlay rings and tick marks. */
function deckTexture() {
  const S = 1024;
  return canvasTexture(S, S, (ctx) => {
    const c = S / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, "#1c1d21");
    g.addColorStop(0.75, "#111215");
    g.addColorStop(1, "#08090b");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    // black marble veining (deterministic)
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let v = 0; v < 70; v++) {
      const gold = v % 9 === 0;
      ctx.strokeStyle = gold ? "rgba(232,182,90,0.22)" : `rgba(210,200,185,${0.025 + rnd() * 0.06})`;
      ctx.lineWidth = gold ? 1.5 : 0.6 + rnd() * 2.2;
      ctx.beginPath();
      let x = rnd() * S;
      let y = rnd() * S;
      ctx.moveTo(x, y);
      const a = 0.6 + rnd() * 0.5;
      for (let k = 0; k < 6; k++) {
        const nx = x + Math.cos(a + (rnd() - 0.5) * 1.2) * (60 + rnd() * 120);
        const ny = y + Math.sin(a + (rnd() - 0.5) * 1.2) * (60 + rnd() * 120);
        ctx.quadraticCurveTo((x + nx) / 2 + (rnd() - 0.5) * 60, (y + ny) / 2 + (rnd() - 0.5) * 60, nx, ny);
        x = nx;
        y = ny;
      }
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(232,182,90,0.75)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(c, c, c * 0.955, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(232,182,90,0.45)";
    ctx.beginPath();
    ctx.arc(c, c, c * 0.9, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * TAU;
      const l = i % 8 === 0 ? 0.05 : 0.022;
      ctx.lineWidth = i % 8 === 0 ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a) * c * 0.9, c + Math.sin(a) * c * 0.9);
      ctx.lineTo(c + Math.cos(a) * c * (0.9 - l), c + Math.sin(a) * c * (0.9 - l));
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(232,182,90,0.12)";
    ctx.lineWidth = 2;
    for (const k of [0.62, 0.35]) {
      ctx.beginPath();
      ctx.arc(c, c, c * k, 0, TAU);
      ctx.stroke();
    }
  });
}

/** Coin atlas (flipY=false): heads cap | tails cap on top 512 rows, reeded edge strip below. */
function coinTexture() {
  return canvasTexture(1024, 640, (ctx) => {
    for (let k = 0; k < 2; k++) {
      const cx = k * 512 + 256;
      const cy = 256;
      ctx.fillStyle = goldGrad(ctx, cx, cy, 256);
      ctx.fillRect(k * 512, 0, 512, 512);
      ctx.strokeStyle = "#7a4d15";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, 228, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = "#fff1c8";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 214, 0, TAU);
      ctx.stroke();
      for (let d = 0; d < 60; d++) {
        const a = (d / 60) * TAU;
        ctx.fillStyle = d % 2 ? "#7a4d15" : "#ffe9b0";
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * 192, cy + Math.sin(a) * 192, 5, 0, TAU);
        ctx.fill();
      }
      if (k === 0) {
        ctx.fillStyle = "#6e4511";
        ctx.font = `600 230px ${canvasFont("display")}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("A", cx + 4, cy + 18);
        ctx.fillStyle = "#fff3cf";
        ctx.fillText("A", cx - 2, cy + 12);
      } else {
        ctx.fillStyle = "#2a7f7a";
        star(ctx, cx, cy, 8, 150, 62);
        ctx.fill();
        ctx.fillStyle = "#bff7f2";
        star(ctx, cx, cy, 8, 120, 50);
        ctx.fill();
        ctx.fillStyle = goldGrad(ctx, cx, cy, 70);
        ctx.beginPath();
        ctx.arc(cx, cy, 44, 0, TAU);
        ctx.fill();
      }
    }
    ctx.fillStyle = "#c48e3a";
    ctx.fillRect(0, 512, 1024, 128);
    for (let x = 0; x < 1024; x += 8) {
      ctx.fillStyle = x % 16 ? "#f7d999" : "#8a5a1c";
      ctx.fillRect(x, 512, 4, 128);
    }
  }, { flipY: false });
}

/** Chip atlas (flipY=false) for blackjack bets. */
function chipTexture() {
  return canvasTexture(512, 640, (ctx) => {
    const cx = 256;
    const cy = 256;
    ctx.fillStyle = "#9d1f30";
    ctx.fillRect(0, 0, 512, 640);
    ctx.fillStyle = "#f3ead7";
    for (let s = 0; s < 8; s++) {
      const a = ((s + 0.5) / 8) * TAU;
      ctx.beginPath();
      ctx.arc(cx, cy, 256, a - 0.14, a + 0.14);
      ctx.arc(cx, cy, 190, a + 0.14, a - 0.14, true);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = PAL.gold;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, 176, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = PAL.gold;
    star(ctx, cx, cy, 5, 110, 46);
    ctx.fill();
    ctx.fillStyle = "#f3ead7";
    for (let s = 0; s < 8; s++) ctx.fillRect(((s + 0.5) / 8) * 512 - 20, 512, 40, 128);
  }, { flipY: false });
}

/** Dice faces: 6 cells in +x,-x,+y,-y,+z,-z order; values 3,4,1,6,2,5 (opposites sum to 7). */
export const DIE_FACE_VALUES = [3, 4, 1, 6, 2, 5];
const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};
function diceTexture(mask: boolean) {
  return canvasTexture(256 * 6, 256, (ctx) => {
    DIE_FACE_VALUES.forEach((v, f) => {
      const x0 = f * 256;
      if (mask) {
        ctx.fillStyle = "#000";
        ctx.fillRect(x0, 0, 256, 256);
      } else {
        const g = ctx.createLinearGradient(x0, 0, x0 + 256, 256);
        g.addColorStop(0, "#e2324b");
        g.addColorStop(1, "#8e1426");
        ctx.fillStyle = g;
        ctx.fillRect(x0, 0, 256, 256);
        ctx.strokeStyle = "rgba(255,222,160,0.85)";
        ctx.lineWidth = 6;
        roundRect(ctx, x0 + 14, 14, 228, 228, 38);
        ctx.stroke();
      }
      for (const [px, py] of PIPS[v]) {
        const cx = x0 + 128 + px * 62;
        const cy = 128 + py * 62;
        ctx.fillStyle = mask ? "#fff" : "#fbf3e2";
        ctx.beginPath();
        ctx.arc(cx, cy, v === 1 ? 34 : 24, 0, TAU);
        ctx.fill();
        if (!mask) {
          ctx.fillStyle = "rgba(232,182,90,0.9)";
          ctx.beginPath();
          ctx.arc(cx, cy, v === 1 ? 14 : 9, 0, TAU);
          ctx.fill();
        }
      }
    });
  });
}

/**
 * Slot reel strip: 8 symbols around the reel. Symbols are drawn rotated a quarter turn because the
 * reel's U runs around its (horizontal) axis.
 */
export const SLOT_SYMBOLS = 8;
function slotTexture() {
  const C = 256;
  return canvasTexture(C * SLOT_SYMBOLS, C, (ctx) => {
    for (let k = 0; k < SLOT_SYMBOLS; k++) {
      const x0 = k * C;
      const g = ctx.createLinearGradient(x0, 0, x0 + C, 0);
      g.addColorStop(0, "#c9bfa9");
      g.addColorStop(0.5, "#fbf6ea");
      g.addColorStop(1, "#c9bfa9");
      ctx.fillStyle = g;
      ctx.fillRect(x0, 0, C, C);
      ctx.save();
      ctx.translate(x0 + C / 2, C / 2);
      ctx.rotate(Math.PI / 2);
      drawSymbol(ctx, k);
      ctx.restore();
      ctx.fillStyle = "rgba(120,90,40,0.35)";
      ctx.fillRect(x0, 0, 3, C);
    }
  });
}

function drawSymbol(ctx: CanvasRenderingContext2D, k: number) {
  ctx.lineJoin = "round";
  switch (k) {
    case 0: {
      // lucky seven
      ctx.font = `700 190px ${canvasFont("display")}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 14;
      ctx.strokeStyle = "#e8b65a";
      ctx.strokeText("7", 0, 10);
      ctx.fillStyle = "#c8283f";
      ctx.fillText("7", 0, 10);
      break;
    }
    case 1: {
      // cherries
      ctx.strokeStyle = "#2f7d3a";
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(-40, 30);
      ctx.quadraticCurveTo(-20, -40, 20, -70);
      ctx.moveTo(42, 22);
      ctx.quadraticCurveTo(40, -30, 20, -70);
      ctx.stroke();
      for (const [x, y] of [[-42, 46], [42, 38]]) {
        const g = ctx.createRadialGradient(x - 12, y - 12, 4, x, y, 40);
        g.addColorStop(0, "#ff8a96");
        g.addColorStop(0.5, "#d3203b");
        g.addColorStop(1, "#6d0d1c");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 38, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case 2: {
      // bell
      ctx.fillStyle = goldGrad(ctx, 0, -10, 90);
      ctx.beginPath();
      ctx.moveTo(-70, 50);
      ctx.quadraticCurveTo(-62, -70, 0, -78);
      ctx.quadraticCurveTo(62, -70, 70, 50);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-82, 46, 164, 18);
      ctx.beginPath();
      ctx.arc(0, 74, 16, 0, TAU);
      ctx.fill();
      break;
    }
    case 3: {
      // diamond
      ctx.fillStyle = "#33d6cf";
      ctx.beginPath();
      ctx.moveTo(0, -80);
      ctx.lineTo(70, -20);
      ctx.lineTo(0, 84);
      ctx.lineTo(-70, -20);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#c8fffb";
      ctx.beginPath();
      ctx.moveTo(0, -80);
      ctx.lineTo(28, -20);
      ctx.lineTo(0, 84);
      ctx.lineTo(-28, -20);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#0f6c6a";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-70, -20);
      ctx.lineTo(70, -20);
      ctx.stroke();
      break;
    }
    case 4: {
      // crown
      ctx.fillStyle = goldGrad(ctx, 0, 0, 100);
      ctx.beginPath();
      ctx.moveTo(-80, 50);
      ctx.lineTo(-90, -50);
      ctx.lineTo(-40, -5);
      ctx.lineTo(0, -70);
      ctx.lineTo(40, -5);
      ctx.lineTo(90, -50);
      ctx.lineTo(80, 50);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#c8283f";
      for (const x of [-45, 0, 45]) {
        ctx.beginPath();
        ctx.arc(x, 28, 11, 0, TAU);
        ctx.fill();
      }
      break;
    }
    case 5: {
      // triple bar
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = "#1a1c21";
        roundRect(ctx, -82, -72 + i * 52, 164, 40, 10);
        ctx.fill();
        ctx.strokeStyle = "#e8b65a";
        ctx.lineWidth = 5;
        ctx.stroke();
      }
      break;
    }
    case 6: {
      // star
      ctx.fillStyle = goldGrad(ctx, 0, 0, 100);
      star(ctx, 0, 6, 5, 88, 38);
      ctx.fill();
      ctx.strokeStyle = "#8a5a1c";
      ctx.lineWidth = 5;
      ctx.stroke();
      break;
    }
    default: {
      // emerald
      ctx.fillStyle = "#1e9a5c";
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + Math.PI / 6;
        ctx.lineTo(Math.cos(a) * 78, Math.sin(a) * 78);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#7ff0b5";
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + Math.PI / 6;
        ctx.lineTo(Math.cos(a) * 40, Math.sin(a) * 40);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
}

/** Card atlas: 10 faces + 1 back, left to right. */
export const CARDS = [
  ["A", "♠"], ["K", "♥"], ["Q", "♠"], ["J", "♦"], ["10", "♣"],
  ["9", "♥"], ["8", "♠"], ["7", "♦"], ["A", "♥"], ["5", "♣"],
] as const;
export const CARD_BACK = CARDS.length;
export const CARD_CELLS = CARDS.length + 1;
function cardTexture() {
  const W = 200;
  const H = 280;
  return canvasTexture(W * CARD_CELLS, H, (ctx) => {
    const serif = canvasFont("display");
    for (let i = 0; i < CARD_CELLS; i++) {
      const x0 = i * W;
      ctx.save();
      roundRect(ctx, x0 + 4, 4, W - 8, H - 8, 18);
      ctx.clip();
      if (i === CARD_BACK) {
        const g = ctx.createLinearGradient(x0, 0, x0 + W, H);
        g.addColorStop(0, "#1a1c22");
        g.addColorStop(1, "#0b0c0f");
        ctx.fillStyle = g;
        ctx.fillRect(x0, 0, W, H);
        ctx.strokeStyle = "rgba(232,182,90,0.5)";
        ctx.lineWidth = 2;
        for (let d = -H; d < W + H; d += 16) {
          ctx.beginPath();
          ctx.moveTo(x0 + d, 0);
          ctx.lineTo(x0 + d + H, H);
          ctx.moveTo(x0 + d + H, 0);
          ctx.lineTo(x0 + d, H);
          ctx.stroke();
        }
        ctx.strokeStyle = PAL.gold;
        ctx.lineWidth = 6;
        roundRect(ctx, x0 + 16, 16, W - 32, H - 32, 12);
        ctx.stroke();
        ctx.fillStyle = "#0c0e11";
        ctx.beginPath();
        ctx.arc(x0 + W / 2, H / 2, 44, 0, TAU);
        ctx.fill();
        ctx.fillStyle = PAL.gold;
        ctx.font = `600 64px ${serif}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("A", x0 + W / 2, H / 2 + 4);
      } else {
        const [rank, suit] = CARDS[i];
        const red = suit === "♥" || suit === "♦";
        ctx.fillStyle = "#fbf7ee";
        ctx.fillRect(x0, 0, W, H);
        ctx.strokeStyle = "rgba(176,122,42,0.6)";
        ctx.lineWidth = 3;
        roundRect(ctx, x0 + 12, 12, W - 24, H - 24, 10);
        ctx.stroke();
        ctx.fillStyle = red ? "#c8283f" : "#16181d";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `600 46px ${serif}`;
        ctx.fillText(rank, x0 + 38, 46);
        ctx.font = `40px ${serif}, "Segoe UI Symbol", "Apple Symbols", sans-serif`;
        ctx.fillText(suit, x0 + 38, 92);
        ctx.save();
        ctx.translate(x0 + W - 38, H - 46);
        ctx.rotate(Math.PI);
        ctx.font = `600 46px ${serif}`;
        ctx.fillText(rank, 0, 0);
        ctx.restore();
        ctx.font = `130px ${serif}, "Segoe UI Symbol", "Apple Symbols", sans-serif`;
        ctx.fillText(suit, x0 + W / 2, H / 2 + 8);
      }
      ctx.restore();
    }
  });
}

/** Blackjack felt (half disc toward the viewer): green baize, gold arc and two bet rings. */
function feltTexture() {
  const S = 512;
  return canvasTexture(S, S, (ctx) => {
    const c = S / 2;
    const g = ctx.createRadialGradient(c, c, 20, c, c, c);
    g.addColorStop(0, "#14644c");
    g.addColorStop(1, "#08291f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = "rgba(232,182,90,0.8)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(c, c, c * 0.66, 0.08, Math.PI - 0.08);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c, c, c * 0.72, 0.1, Math.PI - 0.1);
    ctx.stroke();
    ctx.strokeStyle = "rgba(247,223,163,0.55)";
    ctx.lineWidth = 3;
    for (const a of [Math.PI * 0.32, Math.PI * 0.68]) {
      ctx.beginPath();
      ctx.arc(c + Math.cos(a) * c * 0.84, c + Math.sin(a) * c * 0.84, 22, 0, TAU);
      ctx.stroke();
    }
  });
}

/** Mines tile face: dark lacquer, gold bevel, faint diamond emblem. */
function tileTexture() {
  return canvasTexture(256, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 256, 256);
    g.addColorStop(0, "#2a2d34");
    g.addColorStop(1, "#111317");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "#c99a48";
    ctx.lineWidth = 12;
    roundRect(ctx, 10, 10, 236, 236, 26);
    ctx.stroke();
    ctx.strokeStyle = "rgba(232,182,90,0.35)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(128, 70);
    ctx.lineTo(186, 128);
    ctx.lineTo(128, 186);
    ctx.lineTo(70, 128);
    ctx.closePath();
    ctx.stroke();
  });
}

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */
export function lathe(points: [number, number][], segs: number) {
  return new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segs);
}

/**
 * Coin/chip disc (axis Y) with atlas UVs: `cells` caps across the top 80% of the atlas, edge strip below.
 * With cells=2 the top face samples cell 0 and the bottom face cell 1.
 */
export function discGeometry(R: number, h: number, cells: 1 | 2, b = R * 0.06) {
  const g = lathe(
    [[0, -h], [R - b, -h], [R - b * 0.3, -h + b * 0.3], [R, -h + b], [R, h - b], [R - b * 0.3, h - b * 0.3], [R - b, h], [0, h]],
    48,
  );
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (Math.abs(y) > h - 0.0005 && r < R - b * 0.5) {
      const th = Math.atan2(x, z);
      const k = r / R;
      const cell = cells === 2 && y < 0 ? 1 : 0;
      const sx = y < 0 ? -1 : 1;
      uv.setXY(i, (cell + 0.5 + 0.5 * k * Math.sin(th) * sx) / cells, (0.5 + 0.5 * k * Math.cos(th)) * 0.8);
    } else {
      uv.setXY(i, uv.getX(i), 0.8 + 0.2 * ((y + h) / (2 * h)));
    }
  }
  uv.needsUpdate = true;
  return g;
}

/* ------------------------------------------------------------------ */
/* Kit                                                                 */
/* ------------------------------------------------------------------ */
type Disposable = { dispose(): void };

export class Kit {
  readonly fadeMats: THREE.Material[] = [];
  private readonly trash: Disposable[] = [];
  private env: THREE.Texture | null = null;

  readonly tex;
  readonly mat;
  readonly geo;

  constructor(readonly q: 1 | 2) {
    this.tex = {
      glow: this.own(glowTexture()),
      deck: this.own(deckTexture()),
      coin: this.own(coinTexture()),
      chip: this.own(chipTexture()),
      dice: this.own(diceTexture(false)),
      diceMask: this.own(diceTexture(true)),
      slot: this.own(slotTexture()),
      cards: this.own(cardTexture()),
      felt: this.own(feltTexture()),
      tile: this.own(tileTexture()),
    };
    const goldP: THREE.MeshPhysicalMaterialParameters = { color: new THREE.Color(PAL.gold), metalness: 1, roughness: 0.24, envMapIntensity: 1.25 };
    this.mat = {
      gold: q === 2 ? this.reg(new THREE.MeshPhysicalMaterial({ ...goldP, clearcoat: 0.4, clearcoatRoughness: 0.15 })) : this.std(goldP),
      goldDeep: this.std({ color: new THREE.Color(PAL.goldDeep).lerp(new THREE.Color(PAL.gold), 0.4), metalness: 1, roughness: 0.32, envMapIntensity: 1.2 }),
      lacquer: this.std({ color: new THREE.Color(PAL.lacquer), metalness: 0.4, roughness: 0.22, envMapIntensity: 0.6 }),
      deck: this.gloss({ map: this.tex.deck, metalness: 0.25, roughness: 0.16, envMapIntensity: 1.0 }),
      robot: this.std({ color: new THREE.Color("#8a8f99"), metalness: 0.8, roughness: 0.28, envMapIntensity: 1.3 }),
      ivory: this.std({ color: new THREE.Color(PAL.ivory), metalness: 0.1, roughness: 0.35, envMapIntensity: 0.8 }),
      coin: this.std({ map: this.tex.coin, metalness: 1, roughness: 0.28, envMapIntensity: 1.3 }),
      chip: this.std({ map: this.tex.chip, metalness: 0.3, roughness: 0.42, envMapIntensity: 0.8 }),
      black: this.std({ color: new THREE.Color("#030304"), metalness: 0.2, roughness: 0.6 }),
      obsidian: this.gloss({ color: new THREE.Color("#060709"), metalness: 0.35, roughness: 0.1, envMapIntensity: 2.0 }),
      marble: this.gloss({ map: null, color: new THREE.Color("#0b0c0e"), metalness: 0.2, roughness: 0.18, envMapIntensity: 1.1 }),
      spark: this.basic({ color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false }),
    };
    this.geo = {
      daisRim: this.own(lathe([[0.9, -0.1], [0.99, -0.1], [1.035, -0.075], [1.045, -0.035], [1.03, 0.0], [0.985, 0.012], [0.95, 0.012]], 96)),
      daisTop: this.own(new THREE.CircleGeometry(0.96, 96).rotateX(-Math.PI / 2).translate(0, 0.006, 0)),
      daisUnder: this.own(lathe([[0, -0.66], [0.06, -0.6], [0.2, -0.46], [0.48, -0.26], [0.76, -0.14], [0.92, -0.1]], 64)),
      daisBand: this.own(new THREE.TorusGeometry(0.5, 0.012, 8, 72).rotateX(Math.PI / 2).translate(0, -0.25, 0)),
      emitter: this.own(new THREE.SphereGeometry(0.05, 16, 12).translate(0, -0.66, 0)),
      plane: this.own(new THREE.PlaneGeometry(1, 1)),
      led: this.own(new THREE.SphereGeometry(1, 8, 6)),
      spark: this.own(new THREE.OctahedronGeometry(1, 0)),
      ring: this.own(new THREE.RingGeometry(0.86, 1, 64)),
      // AI agent core (local units): obsidian orb, glowing lens, gyroscope rings, tethered manipulator nodes
      core: this.own(new THREE.SphereGeometry(0.3, 48, 32)),
      iris: this.own(new THREE.SphereGeometry(0.302, 48, 12, 0, TAU, 0, 0.6).rotateX(Math.PI / 2)),
      pupil: this.own(new THREE.SphereGeometry(0.304, 32, 8, 0, TAU, 0, 0.24).rotateX(Math.PI / 2)),
      lens: this.own(new THREE.TorusGeometry(0.3 * Math.sin(0.62), 0.011, 10, 64).translate(0, 0, 0.3 * Math.cos(0.62))),
      gyro: this.own(new THREE.TorusGeometry(0.42, 0.012, 10, 96)),
      gyroThin: this.own(new THREE.TorusGeometry(0.49, 0.006, 8, 96)),
      tether: this.own(new THREE.CylinderGeometry(0.007, 0.007, 0.48, 6).translate(0, -0.3, 0)),
      node: this.own(new THREE.SphereGeometry(0.07, 24, 16).translate(0, -0.6, 0)),
      nodeRing: this.own(new THREE.TorusGeometry(0.095, 0.01, 8, 40).rotateX(Math.PI / 2).translate(0, -0.6, 0)),
      pool: this.own(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)),
      // robot (local units, ~1.7 tall)
      botBase: this.own(new THREE.CylinderGeometry(0.42, 0.5, 0.14, 32).translate(0, 0.07, 0)),
      botTorso: this.own(new THREE.CapsuleGeometry(0.3, 0.42, 6, 20).scale(1.15, 1, 0.85).translate(0, 0.65, 0)),
      botCollar: this.own(new THREE.TorusGeometry(0.17, 0.035, 10, 32).rotateX(Math.PI / 2).translate(0, 1.2, 0)),
      botHead: this.own(new THREE.SphereGeometry(0.27, 32, 20).scale(1.12, 0.92, 1)),
      botVisor: this.own(new THREE.CylinderGeometry(0.285, 0.285, 0.11, 32, 1, true, -1.05, 2.1).scale(1.12, 1, 1.02).translate(0, 0.02, 0)),
      botAntenna: this.own(new THREE.CylinderGeometry(0.014, 0.014, 0.2, 8).translate(0, 0.33, 0)),
      botTip: this.own(new THREE.SphereGeometry(0.045, 12, 8).translate(0, 0.45, 0)),
      botChest: this.own(new THREE.CircleGeometry(0.085, 24).translate(0, 0.78, 0.262)),
      botArm: this.own(new THREE.CapsuleGeometry(0.075, 0.38, 4, 12).translate(0, -0.27, 0)),
      botHand: this.own(new THREE.SphereGeometry(0.1, 16, 12).translate(0, -0.56, 0)),
    };
  }

  own<T extends Disposable>(x: T): T {
    this.trash.push(x);
    return x;
  }

  /** Register a material so it fades with the scene; `base` is its opacity at full visibility. */
  reg<T extends THREE.Material>(m: T, base = 1): T {
    m.transparent = true;
    m.opacity = 0;
    m.userData.base = base;
    this.fadeMats.push(m);
    if (this.env && (m instanceof THREE.MeshStandardMaterial)) m.envMap = this.env;
    return this.own(m);
  }

  std(p: THREE.MeshStandardMaterialParameters, base = 1) {
    return this.reg(new THREE.MeshStandardMaterial(p), base);
  }

  /** Glossy material: physical clearcoat on high quality. */
  gloss(p: THREE.MeshPhysicalMaterialParameters, base = 1) {
    if (this.q === 2) return this.reg(new THREE.MeshPhysicalMaterial({ clearcoat: 0.8, clearcoatRoughness: 0.08, ...p }), base);
    const { clearcoat: _c, clearcoatRoughness: _r, ...rest } = p;
    return this.reg(new THREE.MeshStandardMaterial(rest), base);
  }

  basic(p: THREE.MeshBasicMaterialParameters, base = 1) {
    return this.reg(new THREE.MeshBasicMaterial({ toneMapped: false, ...p }), base);
  }

  /** Additive light material (HDR colour so bloom catches it). */
  light(color: THREE.ColorRepresentation, k = 1, base = 1, map: THREE.Texture | null = null) {
    return this.basic({ color: new THREE.Color(color).multiplyScalar(k), blending: THREE.AdditiveBlending, depthWrite: false, map }, base);
  }

  setEnv(env: THREE.Texture) {
    this.env = env;
    for (const m of this.fadeMats) {
      if (m instanceof THREE.MeshStandardMaterial) {
        m.envMap = env;
        m.needsUpdate = true;
      }
    }
  }

  fade(fo: number) {
    for (const m of this.fadeMats) m.opacity = (m.userData.base as number) * fo;
  }

  dispose() {
    this.trash.forEach((x) => x.dispose());
  }
}

/* ------------------------------------------------------------------ */
/* Particle pools                                                      */
/* ------------------------------------------------------------------ */
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _c = new THREE.Color();

/** Ballistic additive sparks in pod-local space. */
export class Sparks {
  readonly mesh: THREE.InstancedMesh;
  private p: Float32Array;
  private v: Float32Array;
  private life: Float32Array;
  private max: Float32Array;
  private size: Float32Array;
  private col: THREE.Color[];
  private next = 0;
  private dirty = true;
  constructor(kit: Kit, readonly n: number, readonly gravity = -2.4) {
    this.mesh = new THREE.InstancedMesh(kit.geo.spark, kit.mat.spark, n);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    this.p = new Float32Array(n * 3);
    this.v = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    this.max = new Float32Array(n).fill(1);
    this.size = new Float32Array(n);
    this.col = new Array(n).fill(0).map(() => new THREE.Color());
    for (let i = 0; i < n; i++) {
      this.mesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
      this.mesh.setColorAt(i, _c.setRGB(0, 0, 0));
    }
  }
  burst(o: THREE.Vector3, color: THREE.ColorRepresentation, count: number, speed: number, opts: { up?: number; spread?: number; size?: number; life?: number; dir?: THREE.Vector3 } = {}) {
    const up = opts.up ?? 1;
    const spread = opts.spread ?? 1;
    for (let k = 0; k < count; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.n;
      const a = Math.random() * TAU;
      const e = Math.random() * 2 - 1;
      const r = Math.sqrt(1 - e * e);
      const sp = speed * (0.35 + Math.random() * 0.65);
      let vx = Math.cos(a) * r * spread;
      let vy = Math.abs(e) * up + (1 - up) * e;
      let vz = Math.sin(a) * r * spread;
      if (opts.dir) {
        vx = opts.dir.x + vx * 0.35;
        vy = opts.dir.y + vy * 0.35;
        vz = opts.dir.z + vz * 0.35;
      }
      this.p.set([o.x, o.y, o.z], i * 3);
      this.v.set([vx * sp, vy * sp, vz * sp], i * 3);
      this.max[i] = (opts.life ?? 0.9) * (0.6 + Math.random() * 0.6);
      this.life[i] = this.max[i];
      this.size[i] = (opts.size ?? 0.016) * (0.6 + Math.random() * 0.8);
      this.col[i].set(color).multiplyScalar(2.2 + Math.random() * 1.6);
    }
    this.dirty = true;
  }
  update(dt: number) {
    if (!this.dirty) return;
    let alive = false;
    const drag = Math.exp(-dt * 1.6);
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const j = i * 3;
      if (this.life[i] <= 0) {
        this.mesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
        continue;
      }
      alive = true;
      this.v[j + 1] += this.gravity * dt;
      this.v[j] *= drag;
      this.v[j + 1] *= drag;
      this.v[j + 2] *= drag;
      this.p[j] += this.v[j] * dt;
      this.p[j + 1] += this.v[j + 1] * dt;
      this.p[j + 2] += this.v[j + 2] * dt;
      const k = this.life[i] / this.max[i];
      _s.setScalar(this.size[i] * (0.4 + 0.6 * k));
      _q.setFromAxisAngle(_p.set(0.3, 1, 0.2).normalize(), this.life[i] * 9);
      _m.compose(_p.set(this.p[j], this.p[j + 1], this.p[j + 2]), _q, _s);
      this.mesh.setMatrixAt(i, _m);
      this.mesh.setColorAt(i, _c.copy(this.col[i]).multiplyScalar(k));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.dirty = alive;
  }
}

/** Expanding shock rings (flat on the deck by default). */
export class Waves {
  readonly group = new THREE.Group();
  private items: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; t: number; dur: number; size: number; k: number }[] = [];
  constructor(kit: Kit, n = 3) {
    for (let i = 0; i < n; i++) {
      const mat = kit.own(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
      const mesh = new THREE.Mesh(kit.geo.ring, mat);
      mesh.visible = false;
      mesh.renderOrder = 4;
      this.group.add(mesh);
      this.items.push({ mesh, mat, t: 1, dur: 1, size: 1, k: 1 });
    }
  }
  fire(p: THREE.Vector3, color: THREE.ColorRepresentation, size = 0.5, dur = 0.7, flat = true, k = 2.2) {
    const it = this.items.reduce((a, b) => (b.t / b.dur > a.t / a.dur ? b : a));
    it.t = 0;
    it.dur = dur;
    it.size = size;
    it.k = k;
    it.mat.color.set(color).multiplyScalar(2.4);
    it.mesh.position.copy(p);
    it.mesh.rotation.set(flat ? -Math.PI / 2 : 0, 0, 0);
    it.mesh.visible = true;
  }
  update(dt: number, fo: number) {
    for (const it of this.items) {
      if (!it.mesh.visible) continue;
      it.t += dt;
      const s = it.t / it.dur;
      if (s >= 1) {
        it.mesh.visible = false;
        continue;
      }
      it.mesh.scale.setScalar(0.05 + it.size * easeOut(s, 2));
      it.mat.opacity = Math.min(1, (1 - s) * it.k) * fo;
    }
  }
}

/** Everything a game pod needs from its host. */
export interface PodCtx {
  kit: Kit;
  clock: { current: Clock };
  accent: THREE.Color;
  index: number;
  /** A round settled on this pod: sends a value streak into the roulette wheel. */
  emit: (strength: number, color?: THREE.ColorRepresentation) => void;
}
