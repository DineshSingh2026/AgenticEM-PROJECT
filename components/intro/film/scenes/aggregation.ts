import seed from "@/lib/sim/seed.json";
import { introScenes } from "@/content/copy/intro-scenes";
import type { FilmScene, SceneFrame } from "../types";
import { COLORS, clamp, easeInOut, easeOut, lerp, mulberry32, rgba, seg } from "../util";
import { glyph, label, packets, panel, ring, safeZone, spark, text, wire, type Pt } from "../kit";

/**
 * 02 — One integration. A constellation of game providers lights up; each fires a curve into a single
 * gold API gate; one hot line leaves the gate and fills the operator's catalogue tile by tile.
 */
export const AGGREGATION = {
  providers: 24,
  /** Provider curves land in the gate across this progress window (drives the HTML counter). */
  connect: [0.12, 0.5] as const,
  gate: [0.16, 0.34] as const,
  out: [0.4, 0.52] as const,
  tiles: [0.46, 0.82] as const,
  cols: 5,
  rows: 4,
};

const C = introScenes.aggregation;

type Prov = { x: number; y: number; kind: number; t: number; path: Pt[] };

export function createAggregationScene(): FilmScene {
  const rng = mulberry32(seed.seed ^ 0xa66);
  const N = AGGREGATION.providers;
  const kinds = Array.from({ length: N }, (_, i) => i % 5);
  const order = Array.from({ length: N }, (_, i) => i).sort(() => rng() - 0.5);
  const jit = Array.from({ length: N }, () => rng());
  const tileOrder = Array.from({ length: AGGREGATION.cols * AGGREGATION.rows }, () => rng());

  const L = {
    w: 0,
    h: 0,
    narrow: false,
    provs: [] as Prov[],
    gate: { x: 0, y: 0, w: 0, h: 0 },
    gateIn: { x: 0, y: 0 },
    gateOut: { x: 0, y: 0 },
    out: [] as Pt[],
    grid: { x: 0, y: 0, tile: 0, gap: 0 },
    provLabel: { x: 0, y: 0 },
    catLabel: { x: 0, y: 0 },
  };

  function resize(w: number, h: number) {
    const narrow = w < 760;
    const z = safeZone(w, h, narrow);
    L.w = w;
    L.h = h;
    L.narrow = narrow;
    L.provs = [];
    const { cols, rows } = AGGREGATION;
    if (!narrow) {
      const cy = z.cy;
      const gw = 22;
      const gh = clamp(z.height * 0.5, 150, 240);
      L.gate = { x: w * 0.47 - gw / 2, y: cy - gh / 2, w: gw, h: gh };
      L.gateIn = { x: L.gate.x, y: cy };
      L.gateOut = { x: L.gate.x + gw, y: cy };
      // Providers on two arcs to the left of the gate.
      const ax = w * 0.47;
      for (let i = 0; i < N; i++) {
        const ringI = i % 2;
        const j = Math.floor(i / 2);
        const R = (ringI ? 0.36 : 0.29) * w;
        const span = 0.62 + ringI * 0.08;
        const th = Math.PI + lerp(-span, span, (j + 0.5 + (jit[i] - 0.5) * 0.4) / (N / 2));
        const x = ax + Math.cos(th) * R;
        const y = clamp(cy + Math.sin(th) * R * 0.62, z.top + 12, z.bottom - 12);
        const mid = lerp(x, L.gateIn.x, 0.55);
        const path: Pt[] = [];
        for (let s = 0; s <= 24; s++) {
          const u = s / 24;
          const m = 1 - u;
          path.push({
            x: m * m * m * x + 3 * m * m * u * mid + 3 * m * u * u * mid + u * u * u * L.gateIn.x,
            y: m * m * m * y + 3 * m * m * u * y + 3 * m * u * u * cy + u * u * u * cy,
          });
        }
        L.provs.push({ x, y, kind: kinds[i], t: 0, path });
      }
      L.provLabel = { x: w * 0.1, y: z.top + 4 };
      const gx = w * 0.6;
      const areaW = Math.min(w * 0.32, 440);
      const gap = 8;
      const tile = (areaW - gap * (cols - 1)) / cols;
      const gridH = rows * tile + (rows - 1) * gap;
      L.grid = { x: gx, y: cy - gridH / 2 + 10, tile, gap };
      L.out = [L.gateOut, { x: gx - 18, y: cy }];
      L.catLabel = { x: gx, y: L.grid.y - 30 };
    } else {
      const gy = z.top + z.height * 0.36;
      const gw = w * 0.56;
      L.gate = { x: (w - gw) / 2, y: gy - 9, w: gw, h: 18 };
      L.gateIn = { x: w / 2, y: L.gate.y };
      L.gateOut = { x: w / 2, y: L.gate.y + 18 };
      for (let i = 0; i < N; i++) {
        const row = i % 2;
        const j = Math.floor(i / 2);
        const x = lerp(w * 0.08, w * 0.92, (j + 0.5) / (N / 2)) + (jit[i] - 0.5) * 6;
        const y = z.top + 10 + row * 22;
        const path: Pt[] = [];
        for (let s = 0; s <= 20; s++) {
          const u = s / 20;
          const m = 1 - u;
          const my = lerp(y, L.gateIn.y, 0.6);
          path.push({
            x: m * m * m * x + 3 * m * m * u * x + 3 * m * u * u * L.gateIn.x + u * u * u * L.gateIn.x,
            y: m * m * m * y + 3 * m * m * u * my + 3 * m * u * u * my + u * u * u * L.gateIn.y,
          });
        }
        L.provs.push({ x, y, kind: kinds[i], t: 0, path });
      }
      const areaW = w - 48;
      const gap = 6;
      const tile = Math.min((areaW - gap * (cols - 1)) / cols, (z.bottom - (L.gateOut.y + 40) - gap * (rows - 1)) / rows);
      const gridW = cols * tile + (cols - 1) * gap;
      L.grid = { x: (w - gridW) / 2, y: L.gateOut.y + 34, tile, gap };
      L.out = [L.gateOut, { x: w / 2, y: L.grid.y - 8 }];
      L.provLabel = { x: w / 2, y: z.top - 12 };
      L.catLabel = { x: w / 2, y: L.grid.y - 18 };
    }
    // Connect order: shuffled so the counter climbs evenly across the whole constellation.
    order.forEach((idx, n) => {
      L.provs[idx].t = lerp(AGGREGATION.connect[0], AGGREGATION.connect[1], n / (N - 1));
    });
  }

  function drawProviders(f: SceneFrame) {
    const { p } = f;
    const la = easeOut(seg(p, 0.02, 0.18));
    if (L.narrow) label(f, C.providers, L.provLabel.x, L.provLabel.y, { size: 8.5, color: COLORS.faint, alpha: la, align: "center" });
    else label(f, C.providers, L.provLabel.x, L.provLabel.y, { size: 9.5, color: COLORS.faint, alpha: la });
    for (let i = 0; i < N; i++) {
      const pv = L.provs[i];
      const appear = easeOut(seg(p, pv.t - 0.12, pv.t - 0.04));
      if (appear <= 0) continue;
      const wk = easeInOut(seg(p, pv.t - 0.06, pv.t));
      const connected = p >= pv.t;
      wire(f, pv.path, wk, { alpha: connected ? 0.22 : 0.4, glow: 0.18, width: 0.9 });
      if (connected) packets(f, pv.path, 1, { speed: 0.9, phase: jit[i], r: 1.3, alpha: 0.85 });
      // Node.
      const s = L.narrow ? 4 : 7;
      f.ctx.save();
      f.ctx.globalAlpha *= appear;
      f.ctx.fillStyle = rgba(COLORS.bgElev, 0.95);
      f.ctx.strokeStyle = connected ? COLORS.gold : COLORS.line;
      f.ctx.lineWidth = 1;
      f.ctx.beginPath();
      f.ctx.rect(pv.x - s - 3, pv.y - s - 3, (s + 3) * 2, (s + 3) * 2);
      f.ctx.fill();
      f.ctx.stroke();
      f.ctx.restore();
      glyph(f.ctx, pv.kind, pv.x, pv.y, s * 0.62, connected ? COLORS.goldPale : COLORS.dim, appear);
      ring(f, pv.x, pv.y, s, s * 3.4, (p - pv.t) * 6);
    }
  }

  function drawGate(f: SceneFrame) {
    const { p, local } = f;
    const k = easeOut(seg(p, AGGREGATION.gate[0], AGGREGATION.gate[1]));
    if (k <= 0) return;
    const g = L.gate;
    const fill = seg(p, AGGREGATION.connect[0], AGGREGATION.connect[1]);
    panel(f, g.x, g.y, g.w, g.h, k, { hot: 0.2 + 0.3 * fill });
    // Energy fill: rises with the connected count.
    const glow = f.glow;
    glow.save();
    glow.globalAlpha *= k * (0.12 + 0.18 * fill) * (0.85 + 0.15 * Math.sin(local / 140));
    const grd = L.narrow ? glow.createLinearGradient(g.x, 0, g.x + g.w, 0) : glow.createLinearGradient(0, g.y + g.h, 0, g.y);
    grd.addColorStop(0, rgba(COLORS.goldPale, 0.9));
    grd.addColorStop(clamp(fill), rgba(COLORS.gold, 0.6));
    grd.addColorStop(1, rgba(COLORS.gold, 0));
    glow.fillStyle = grd;
    glow.fillRect(g.x + 3, g.y + 3, g.w - 6, g.h - 6);
    glow.restore();
    f.ctx.save();
    f.ctx.globalAlpha *= k * 0.9;
    const cg = L.narrow ? f.ctx.createLinearGradient(g.x, 0, g.x + g.w, 0) : f.ctx.createLinearGradient(0, g.y + g.h, 0, g.y);
    cg.addColorStop(0, rgba(COLORS.gold, 0.7));
    cg.addColorStop(clamp(fill), rgba(COLORS.gold, 0.35));
    cg.addColorStop(clamp(fill + 0.001), rgba(COLORS.gold, 0.04));
    cg.addColorStop(1, rgba(COLORS.gold, 0.04));
    f.ctx.fillStyle = cg;
    f.ctx.fillRect(g.x + 3, g.y + 3, g.w - 6, g.h - 6);
    f.ctx.restore();

    const la = easeOut(seg(p, 0.24, 0.4));
    if (!L.narrow) {
      text(f.ctx, f.fonts.display, C.gate, g.x + g.w / 2, g.y - 26, { size: 22, weight: 600, color: COLORS.goldPale, alpha: la, align: "center" });
      label(f, C.gateSub, g.x + g.w / 2, g.y + g.h + 22, { size: 9.5, color: COLORS.dim, alpha: la, align: "center" });
    } else {
      text(f.ctx, f.fonts.mono, `${C.gate} · ${C.gateSub}`, g.x + g.w / 2, g.y + g.h / 2, { size: 9, weight: 600, color: "#1A1408", alpha: la * clamp(fill * 2), align: "center", track: 0.12 });
    }
  }

  function drawCatalogue(f: SceneFrame) {
    const { p } = f;
    const ok = easeInOut(seg(p, AGGREGATION.out[0], AGGREGATION.out[1]));
    wire(f, L.out, ok, { width: 2, alpha: 0.9, glow: 0.8 });
    if (ok >= 1) packets(f, L.out, 3, { speed: 1.4, r: 2.2 });
    const { cols, rows } = AGGREGATION;
    const { x, y, tile, gap } = L.grid;
    const la = easeOut(seg(p, AGGREGATION.out[0], AGGREGATION.tiles[0] + 0.05));
    if (L.narrow) label(f, C.catalogue, L.catLabel.x, L.catLabel.y, { size: 8.5, color: COLORS.faint, alpha: la, align: "center" });
    else {
      label(f, C.catalogue, L.catLabel.x, L.catLabel.y, { size: 9.5, color: COLORS.faint, alpha: la });
      for (let c = 0; c < cols; c++) label(f, C.types[c], x + c * (tile + gap) + tile / 2, y - 12, { size: 8, color: COLORS.dim, alpha: la * 0.9, align: "center" });
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        // Fill sweeps from the entry side with a little scatter.
        const order = (L.narrow ? r / rows : c / cols) * 0.7 + tileOrder[i] * 0.3;
        const t0 = lerp(AGGREGATION.tiles[0], AGGREGATION.tiles[1] - 0.08, order);
        const k = seg(p, t0, t0 + 0.08);
        const tx = x + c * (tile + gap);
        const ty = y + r * (tile + gap);
        // Empty slot.
        f.ctx.save();
        f.ctx.globalAlpha *= la * 0.6;
        f.ctx.strokeStyle = COLORS.line;
        f.ctx.lineWidth = 1;
        f.ctx.strokeRect(tx + 0.5, ty + 0.5, tile - 1, tile - 1);
        f.ctx.restore();
        if (k <= 0) continue;
        const e = easeOut(k);
        const hot = clamp(1 - (p - t0 - 0.08) * 14);
        f.ctx.save();
        f.ctx.globalAlpha *= e;
        const tg = f.ctx.createLinearGradient(tx, ty, tx, ty + tile);
        tg.addColorStop(0, rgba(COLORS.gold, 0.12 + 0.16 * hot));
        tg.addColorStop(1, rgba(COLORS.goldDeep, 0.05));
        f.ctx.fillStyle = tg;
        f.ctx.fillRect(tx, ty, tile, tile);
        f.ctx.strokeStyle = rgba(COLORS.gold, 0.55 + 0.4 * hot);
        f.ctx.strokeRect(tx + 0.5, ty + 0.5, tile - 1, tile - 1);
        f.ctx.restore();
        glyph(f.ctx, c, tx + tile / 2, ty + tile / 2, tile * 0.2, COLORS.goldPale, e);
        if (hot > 0) spark(f, tx + tile / 2, ty + tile / 2, tile * 0.07, hot * 0.5);
      }
    }
  }

  return {
    id: "aggregation",
    resize,
    draw(f) {
      if (f.w !== L.w || f.h !== L.h) resize(f.w, f.h);
      drawProviders(f);
      drawCatalogue(f);
      drawGate(f);
    },
  };
}
