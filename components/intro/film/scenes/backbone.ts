import { introScenes } from "@/content/copy/intro-scenes";
import type { FilmScene, SceneFrame } from "../types";
import { COLORS, clamp, easeInOut, easeOut, easeOutExpo, lerp, seg } from "../util";
import { emblemCore, label, packets, panel, ring, safeZone, text, wire, type Pt } from "../kit";

/**
 * 01 — The backbone. The Agentium core ignites; operator brands drop their lines into it; the four
 * platform modules (player accounts, wallets, bonuses, operations) fly in, dock with a flash and
 * start trading packets with the core.
 */
export const BACKBONE = {
  core: [0.02, 0.3] as const,
  operators: [0.08, 0.3] as const,
  /** Module i flies in over [dock[i] - fly, dock[i]] (scene progress). */
  dock: [0.34, 0.41, 0.48, 0.55] as const,
  fly: 0.17,
  wires: 0.16,
};

const C = introScenes.backbone;

type Mod = { x: number; y: number; w: number; h: number; side: -1 | 1; anchor: Pt; path: Pt[] };

export function createBackboneScene(): FilmScene {
  const L = { w: 0, h: 0, narrow: false, cx: 0, cy: 0, R: 50, top: 0, opY: 0, opX: [0, 0, 0], mods: [] as Mod[], opPaths: [] as Pt[][] };

  function resize(w: number, h: number) {
    const narrow = w < 760;
    const z = safeZone(w, h, narrow);
    L.w = w;
    L.h = h;
    L.narrow = narrow;
    L.top = z.top;
    L.R = narrow ? clamp(w * 0.1, 30, 40) : clamp(Math.min(w, h) * 0.075, 42, 74);
    L.opY = z.top + (narrow ? 18 : 34);
    const opGap = narrow ? w * 0.29 : clamp(w * 0.13, 120, 200);
    L.opX = [z.cx - opGap, z.cx, z.cx + opGap];
    L.cx = z.cx;
    L.mods = [];
    if (!narrow) {
      L.cy = z.top + z.height * 0.58;
      const mw = clamp(w * 0.15, 170, 230);
      const mh = 62;
      const dx = clamp(w * 0.27, 250, 420);
      const dy = clamp(z.height * 0.2, 54, 90);
      const spots: [number, number, -1 | 1][] = [
        [-1, -1, -1],
        [-1, 1, -1],
        [1, -1, 1],
        [1, 1, 1],
      ];
      for (const [sx, sy, side] of spots) {
        const x = z.cx + sx * dx - mw / 2;
        const y = L.cy + sy * dy - mh / 2;
        const inner = side < 0 ? x + mw : x;
        const anchor = { x: inner, y: y + mh / 2 };
        const elbowX = L.cx + side * L.R * 1.9;
        const th = Math.atan2(anchor.y - L.cy, elbowX - L.cx);
        const rim = { x: L.cx + Math.cos(th) * L.R * 1.32, y: L.cy + Math.sin(th) * L.R * 1.32 };
        L.mods.push({ x, y, w: mw, h: mh, side, anchor, path: [anchor, { x: elbowX, y: anchor.y }, rim] });
      }
    } else {
      L.cy = z.top + z.height * 0.4;
      const mw = (w - 48) / 2;
      const mh = 48;
      const y0 = L.cy + L.R * 1.75;
      for (let i = 0; i < 4; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 16 + col * (mw + 16);
        const y = y0 + row * (mh + 12);
        const anchor = { x: x + mw / 2, y };
        const side = (col ? 1 : -1) as -1 | 1;
        const rim = { x: L.cx + side * L.R * 0.7, y: L.cy + L.R * 1.12 };
        L.mods.push({ x, y, w: mw, h: mh, side, anchor, path: [anchor, rim] });
      }
    }
    L.opPaths = L.opX.map((x, i) => {
      const th = -Math.PI / 2 + (i - 1) * 0.42;
      const rim = { x: L.cx + Math.cos(th) * L.R * 1.32, y: L.cy + Math.sin(th) * L.R * 1.32 };
      return [{ x, y: L.opY + 14 }, { x, y: lerp(L.opY + 14, rim.y, 0.5) }, rim];
    });
  }

  function drawOperators(f: SceneFrame) {
    const k = seg(f.p, BACKBONE.operators[0], BACKBONE.operators[1]);
    if (k <= 0) return;
    if (!L.narrow) label(f, C.operators, L.cx, L.opY - 24, { size: 9.5, color: COLORS.faint, alpha: easeOut(k) });
    C.operatorVerbs.forEach((v, i) => {
      const kk = easeOut(seg(f.p, BACKBONE.operators[0] + i * 0.04, BACKBONE.operators[0] + 0.16 + i * 0.04));
      if (kk <= 0) return;
      const x = L.opX[i];
      const bw = L.narrow ? 72 : 96;
      panel(f, x - bw / 2, L.opY - 12, bw, 24, kk, { fill: 0.8 });
      label(f, v, x, L.opY, { size: L.narrow ? 8.5 : 10, color: COLORS.text, alpha: kk });
      const wk = easeInOut(seg(f.p, 0.16 + i * 0.03, 0.36 + i * 0.03));
      wire(f, L.opPaths[i], wk, { alpha: 0.35 });
      if (wk >= 1) packets(f, L.opPaths[i], 2, { speed: 0.55, phase: i * 0.31, r: 1.5 });
    });
  }

  function drawModules(f: SceneFrame) {
    const { p } = f;
    L.mods.forEach((m, i) => {
      const d = BACKBONE.dock[i];
      const k = seg(p, d - BACKBONE.fly, d);
      if (k <= 0) return;
      const e = easeOutExpo(k);
      // Fly in from the outside edge (desktop) or from below (narrow).
      const ox = L.narrow ? 0 : m.side * (1 - e) * L.w * 0.18;
      const oy = L.narrow ? (1 - e) * 40 : 0;
      const hot = clamp(1 - (p - d) * 6) * (p >= d ? 1 : 0);
      f.ctx.save();
      f.glow.save();
      f.ctx.translate(ox, oy);
      f.glow.translate(ox, oy);
      panel(f, m.x, m.y, m.w, m.h, easeOut(k * 1.2), { hot });
      const mod = C.modules[i];
      const tx = m.x + (L.narrow ? 12 : 16);
      text(f.ctx, f.fonts.mono, mod.code, tx, m.y + (L.narrow ? 15 : 19), { size: L.narrow ? 9 : 10.5, color: COLORS.gold, alpha: e, track: 0.14 });
      text(f.ctx, f.fonts.display, mod.name, tx, m.y + m.h - (L.narrow ? 15 : 19), { size: L.narrow ? 12.5 : 15.5, weight: 500, color: COLORS.text, alpha: e });
      // Status lamp.
      const lampA = p >= d ? 1 : 0;
      if (lampA) {
        const lx = m.x + m.w - 14;
        const ly = m.y + (L.narrow ? 15 : 19);
        f.ctx.save();
        f.ctx.fillStyle = COLORS.green;
        f.ctx.globalAlpha *= 0.7 + 0.3 * Math.sin(f.local / 260 + i);
        f.ctx.beginPath();
        f.ctx.arc(lx, ly, 2.4, 0, Math.PI * 2);
        f.ctx.fill();
        f.ctx.restore();
      }
      f.ctx.restore();
      f.glow.restore();

      // Dock flash at the module's inner edge, then the wire to the core.
      ring(f, m.anchor.x, m.anchor.y, 3, 26, (p - d) * 5);
      const wk = easeInOut(seg(p, d, d + BACKBONE.wires));
      if (!L.narrow || Math.floor(i / 2) === 0) {
        wire(f, m.path, wk, { alpha: 0.5 });
        if (wk >= 1) {
          packets(f, m.path, 2, { speed: 0.7, phase: i * 0.23, r: 1.6 });
          packets(f, [...m.path].reverse(), 1, { speed: 0.5, phase: i * 0.4 + 0.5, r: 1.3, color: COLORS.copperSoft });
        }
      }
      // Core answers each dock with a ring.
      ring(f, L.cx, L.cy, L.R * 1.1, L.R * 1.9, (p - d - BACKBONE.wires) * 4);
    });
  }

  function drawCore(f: SceneFrame) {
    const k = easeOut(seg(f.p, BACKBONE.core[0], BACKBONE.core[1]));
    emblemCore(f, L.cx, L.cy, L.R, k);
    const lk = easeOut(seg(f.p, 0.18, 0.34));
    const ly = L.cy + L.R * 2.05;
    if (!L.narrow) label(f, C.core, L.cx, ly, { size: 10.5, color: COLORS.goldPale, alpha: lk });
    // Ignition ring.
    ring(f, L.cx, L.cy, L.R * 0.4, L.R * 3, seg(f.p, 0.12, 0.42));
  }

  return {
    id: "backbone",
    resize,
    draw(f) {
      if (f.w !== L.w || f.h !== L.h) resize(f.w, f.h);
      drawOperators(f);
      drawModules(f);
      drawCore(f);
    },
  };
}
