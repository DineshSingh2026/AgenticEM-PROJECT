import seed from "@/lib/sim/seed.json";
import { introScenes } from "@/content/copy/intro-scenes";
import type { FilmScene, SceneFrame } from "../types";
import { COLORS, clamp, easeInOut, easeOut, lerp, mulberry32, seg } from "../util";
import { emblemCore, panel, ring, safeZone, spark, text, wire, type Pt } from "../kit";

/**
 * 05 — Four revenue engines. Around the Agentium core a ring splits into four segments that ignite in
 * turn (API subscriptions, token credits, white-label, revenue share), each wired to its card. Credit
 * tokens spiral in from the dark and value orbits the lit ring. The engine then collapses this frame
 * into the closing lockup.
 */
export const REVENUE = {
  core: [0.0, 0.22] as const,
  /** Segment i ignites at ignite[i] (drives the HTML counter). */
  ignite: [0.2, 0.32, 0.44, 0.56] as const,
  credits: [0.08, 0.95] as const,
  creditCount: 26,
};

const C = introScenes.revenue;

type Card = { x: number; y: number; w: number; h: number; path: Pt[]; mid: number };

export function createRevenueScene(): FilmScene {
  const rng = mulberry32(seed.seed ^ 0x4e7);
  const credits = Array.from({ length: REVENUE.creditCount }, () => ({ th: rng() * Math.PI * 2, t0: rng(), sp: 0.7 + rng() * 0.6, r: 0.8 + rng() * 0.6 }));

  const L = { w: 0, h: 0, narrow: false, cx: 0, cy: 0, R: 50, ringR: 90, cards: [] as Card[] };

  /** Segment i spans this angle range (clockwise from top-left). */
  const segAng = (i: number): [number, number] => {
    const base = -Math.PI * 0.75 + (i * Math.PI) / 2;
    return [base + 0.09, base + Math.PI / 2 - 0.09];
  };

  function resize(w: number, h: number) {
    const narrow = w < 760;
    const z = safeZone(w, h, narrow);
    L.w = w;
    L.h = h;
    L.narrow = narrow;
    L.cards = [];
    if (!narrow) {
      L.cx = w / 2;
      L.cy = z.cy;
      L.R = clamp(Math.min(w, h) * 0.07, 40, 66);
      L.ringR = L.R * 2.05;
      const cw = clamp(w * 0.17, 190, 250);
      const ch = 64;
      const dx = clamp(w * 0.3, 280, 460);
      const dy = clamp(z.height * 0.24, 70, 120);
      const spots: [number, number][] = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ];
      spots.forEach(([sx, sy], i) => {
        const x = L.cx + sx * dx - cw / 2;
        const y = L.cy + sy * dy - ch / 2;
        const [a0, a1] = segAng(i);
        const mid = (a0 + a1) / 2;
        const on = { x: L.cx + Math.cos(mid) * L.ringR, y: L.cy + Math.sin(mid) * L.ringR };
        const anchor = { x: sx < 0 ? x + cw : x, y: y + ch / 2 };
        L.cards.push({ x, y, w: cw, h: ch, mid, path: [on, { x: lerp(on.x, anchor.x, 0.45), y: anchor.y }, anchor] });
      });
    } else {
      L.cx = w / 2;
      L.R = clamp(w * 0.085, 26, 36);
      L.ringR = L.R * 2;
      const total = L.ringR * 2 + 30 + 2 * 44 + 12;
      L.cy = z.top + Math.max(18, (z.height - total) / 2) + L.ringR;
      const cw = (w - 48) / 2;
      const ch = 44;
      const y0 = L.cy + L.ringR + 30;
      // Reading order R1 R2 / R3 R4; the ring keeps its clockwise quadrants.
      const grid: [number, number][] = [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ];
      grid.forEach(([col, row], i) => {
        const x = 16 + col * (cw + 16);
        const y = y0 + row * (ch + 12);
        const [a0, a1] = segAng(i);
        const mid = (a0 + a1) / 2;
        L.cards.push({ x, y, w: cw, h: ch, mid, path: [] });
      });
    }
  }

  function drawRing(f: SceneFrame) {
    const { ctx, glow, p, local } = f;
    const base = easeOut(seg(p, 0.06, 0.24));
    if (base <= 0) return;
    for (let i = 0; i < 4; i++) {
      const [a0, a1] = segAng(i);
      const t = REVENUE.ignite[i];
      const lit = p >= t;
      const k = easeInOut(seg(p, t - 0.02, t + 0.08));
      // Dim track.
      ctx.save();
      ctx.globalAlpha *= base * 0.35;
      ctx.strokeStyle = COLORS.line;
      ctx.lineWidth = L.narrow ? 5 : 8;
      ctx.beginPath();
      ctx.arc(L.cx, L.cy, L.ringR, a0, lerp(a0, a1, base));
      ctx.stroke();
      ctx.restore();
      if (k <= 0) continue;
      // Lit arc, sweeping in.
      const end = lerp(a0, a1, k);
      const thick = L.narrow ? 4 : 6;
      ctx.save();
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = thick;
      ctx.lineCap = "butt";
      ctx.beginPath();
      ctx.arc(L.cx, L.cy, L.ringR, a0, end);
      ctx.stroke();
      ctx.restore();
      glow.save();
      glow.globalAlpha *= 0.55 + 0.25 * Math.sin(local / 300 + i);
      glow.strokeStyle = COLORS.gold;
      glow.lineWidth = thick + 4;
      glow.beginPath();
      glow.arc(L.cx, L.cy, L.ringR, a0, end);
      glow.stroke();
      glow.restore();
      if (k < 1) spark(f, L.cx + Math.cos(end) * L.ringR, L.cy + Math.sin(end) * L.ringR, 3, 1);
      // Value orbiting each lit segment.
      if (lit && k >= 1) {
        for (let j = 0; j < 2; j++) {
          const u = ((local / 1000) * 0.45 + j / 2 + i * 0.17) % 1;
          const a = lerp(a0, a1, u);
          spark(f, L.cx + Math.cos(a) * L.ringR, L.cy + Math.sin(a) * L.ringR, 2, Math.sin(Math.PI * u));
        }
      }
      ring(f, L.cx + Math.cos((a0 + a1) / 2) * L.ringR, L.cy + Math.sin((a0 + a1) / 2) * L.ringR, 4, 34, (p - t - 0.08) * 5);
    }
    // All four lit: one full-ring pulse.
    ring(f, L.cx, L.cy, L.ringR, L.ringR * 1.6, (p - REVENUE.ignite[3] - 0.1) * 3);
  }

  function drawCredits(f: SceneFrame) {
    const { p, local } = f;
    const on = seg(p, REVENUE.credits[0], REVENUE.credits[0] + 0.1) * (1 - seg(p, 0.88, REVENUE.credits[1]));
    if (on <= 0) return;
    const far = Math.max(L.w, L.h) * (L.narrow ? 0.5 : 0.42);
    for (const c of credits) {
      const u = (((local / 1000) * 0.32 * c.sp + c.t0) % 1 + 1) % 1;
      const r = lerp(far * c.r, L.ringR * 1.05, easeInOut(u));
      const th = c.th + u * 1.6;
      const x = L.cx + Math.cos(th) * r;
      const y = L.cy + Math.sin(th) * r * 0.82;
      const a = on * Math.sin(Math.PI * u) * 0.9;
      if (a <= 0.02) continue;
      // Coin: ring + "CR".
      const s = L.narrow ? 4.5 : 6.5;
      f.ctx.save();
      f.ctx.globalAlpha *= a;
      f.ctx.strokeStyle = COLORS.gold;
      f.ctx.lineWidth = 1;
      f.ctx.beginPath();
      f.ctx.arc(x, y, s, 0, Math.PI * 2);
      f.ctx.stroke();
      f.ctx.restore();
      if (!L.narrow) text(f.ctx, f.fonts.mono, C.credit, x, y + 0.5, { size: 5.5, weight: 700, color: COLORS.goldPale, alpha: a, align: "center" });
      spark(f, x, y, 1.2, a * 0.5);
    }
  }

  function drawCards(f: SceneFrame) {
    const { p, ctx, fonts } = f;
    L.cards.forEach((cd, i) => {
      const t = REVENUE.ignite[i];
      const k = easeOut(seg(p, t - 0.04, t + 0.1));
      if (k <= 0) return;
      const hot = clamp(1 - (p - t - 0.06) * 5) * (p >= t + 0.06 ? 1 : 0);
      if (cd.path.length) {
        wire(f, cd.path, easeInOut(seg(p, t, t + 0.08)), { alpha: 0.55, glow: 0.4 });
      }
      panel(f, cd.x, cd.y, cd.w, cd.h, k, { hot: hot * 0.8 + 0.06 });
      const e = C.engines[i];
      const px = cd.x + (L.narrow ? 12 : 16);
      text(ctx, fonts.mono, e.code, px, cd.y + (L.narrow ? 14 : 20), { size: L.narrow ? 9 : 10.5, color: COLORS.gold, alpha: k, track: 0.14 });
      text(ctx, fonts.display, e.name, px, cd.y + cd.h - (L.narrow ? 14 : 20), { size: L.narrow ? 11 : 15, weight: 600, color: COLORS.text, alpha: k, track: 0.04 });
    });
  }

  return {
    id: "revenue",
    resize,
    draw(f) {
      if (f.w !== L.w || f.h !== L.h) resize(f.w, f.h);
      drawCredits(f);
      drawRing(f);
      drawCards(f);
      emblemCore(f, L.cx, L.cy, L.R, easeOut(seg(f.p, REVENUE.core[0], REVENUE.core[1])), { rings: false });
      ring(f, L.cx, L.cy, L.R * 0.5, L.R * 2.4, seg(f.p, 0.04, 0.3));
    },
  };
}
