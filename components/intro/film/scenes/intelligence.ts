import seed from "@/lib/sim/seed.json";
import { introScenes } from "@/content/copy/intro-scenes";
import type { FilmScene, SceneFrame } from "../types";
import { COLORS, clamp, easeInOut, easeOut, lerp, mulberry32, rgba, seg } from "../util";
import { glyph, label, panel, ring, safeZone, spark, text, typed } from "../kit";

/**
 * 04 — Agentic intelligence. Intelligent game APIs (sports betting, board games, skill-based games)
 * feed an LLM reasoning network; signal waves fire layer to layer and light up the three outputs:
 * gaming reasoning, performance benchmarking and model evaluation. An agent trace types underneath.
 */
const CONFIG = {
  layers: [5, 7, 5] as const,
  layersNarrow: [5, 6, 5] as const,
  inputs: [0.0, 0.2] as const,
  net: [0.1, 0.36] as const,
  /** Signal waves launch from the inputs at these progress points. */
  waves: [0.3, 0.46, 0.62, 0.78] as const,
  /** Progress a wave takes to cross one gap between columns. */
  hop: 0.055,
  outputs: [0.44, 0.66] as const,
  trace: [0.5, 0.78] as const,
  traceText: "ASSESS → CALCULATE → EVALUATE → EXECUTE",
};

const C = introScenes.intelligence;

type Node = { x: number; y: number };

export function createIntelligenceScene(): FilmScene {
  const rng = mulberry32(seed.seed ^ 0x1a7e);
  /** Per-edge weight (0..1) for line brightness, generated generously and indexed by column/edge. */
  const weights = Array.from({ length: 512 }, () => rng());

  const L = {
    w: 0,
    h: 0,
    narrow: false,
    cols: [] as Node[][],
    inBox: [] as { x: number; y: number; w: number; h: number }[],
    outBox: [] as { x: number; y: number; w: number; h: number }[],
    modelLabel: { x: 0, y: 0 },
    inLabel: { x: 0, y: 0 },
    outLabel: { x: 0, y: 0 },
    trace: { x: 0, y: 0 },
  };

  function resize(w: number, h: number) {
    const narrow = w < 760;
    const z = safeZone(w, h, narrow);
    L.w = w;
    L.h = h;
    L.narrow = narrow;
    L.cols = [];
    L.inBox = [];
    L.outBox = [];
    const layers = narrow ? CONFIG.layersNarrow : CONFIG.layers;
    if (!narrow) {
      const bw = clamp(w * 0.18, 200, 275);
      const bh = 46;
      const gap = clamp(z.height * 0.08, 16, 34);
      const tot = 3 * bh + 2 * gap;
      const top = z.cy - tot / 2 - 10;
      for (let i = 0; i < 3; i++) L.inBox.push({ x: w * 0.06, y: top + i * (bh + gap), w: bw, h: bh });
      for (let i = 0; i < 3; i++) L.outBox.push({ x: w * 0.94 - bw, y: top + i * (bh + gap), w: bw, h: bh });
      // Input ports column, hidden layers, output ports column.
      const xIn = w * 0.06 + bw;
      const xOut = w * 0.94 - bw;
      const span = xOut - xIn;
      L.cols.push(L.inBox.map((b) => ({ x: xIn, y: b.y + b.h / 2 })));
      layers.forEach((n, li) => {
        const x = xIn + span * (0.25 + li * 0.25);
        const H = Math.min(z.height * 0.56, tot + 30) * (li === 1 ? 1 : 0.8);
        L.cols.push(Array.from({ length: n }, (_, j) => ({ x, y: top + tot / 2 - H / 2 + (H * j) / (n - 1) })));
      });
      L.cols.push(L.outBox.map((b) => ({ x: xOut, y: b.y + b.h / 2 })));
      L.inLabel = { x: w * 0.06, y: top - 20 };
      L.outLabel = { x: w * 0.94 - bw, y: top - 20 };
      const netH = Math.min(z.height * 0.56, tot + 30);
      L.modelLabel = { x: w / 2, y: top + tot / 2 - netH / 2 - 40 };
      L.trace = { x: w / 2, y: top + tot / 2 + netH / 2 + 34 };
    } else {
      const bw = (w - 32 - 16) / 3;
      const bh = 34;
      const top = z.top + 16;
      const bottom = z.bottom - 40;
      for (let i = 0; i < 3; i++) L.inBox.push({ x: 16 + i * (bw + 8), y: top, w: bw, h: bh });
      for (let i = 0; i < 3; i++) L.outBox.push({ x: 16 + i * (bw + 8), y: bottom - bh, w: bw, h: bh });
      const yIn = top + bh;
      const yOut = bottom - bh;
      const span = yOut - yIn;
      L.cols.push(L.inBox.map((b) => ({ x: b.x + b.w / 2, y: yIn })));
      layers.forEach((n, li) => {
        const y = yIn + span * (0.25 + li * 0.25);
        const W = w * (li === 1 ? 0.78 : 0.62);
        L.cols.push(Array.from({ length: n }, (_, j) => ({ x: w / 2 - W / 2 + (W * j) / (n - 1), y })));
      });
      L.cols.push(L.outBox.map((b) => ({ x: b.x + b.w / 2, y: yOut })));
      L.inLabel = { x: w / 2, y: top - 12 };
      L.outLabel = { x: w / 2, y: bottom + 14 };
      L.modelLabel = { x: w / 2, y: 0 };
      L.trace = { x: w / 2, y: bottom + 30 };
    }
  }

  /** 0..1 brightness of a wave front passing column c at progress p. */
  function waveAt(p: number, c: number) {
    let v = 0;
    for (const w0 of CONFIG.waves) {
      const d = p - (w0 + c * CONFIG.hop);
      if (d >= 0 && d < 0.09) v = Math.max(v, 1 - d / 0.09);
    }
    return v;
  }

  function drawNet(f: SceneFrame) {
    const { ctx, glow, p } = f;
    const nk = seg(p, CONFIG.net[0], CONFIG.net[1]);
    if (nk <= 0) return;
    const nCols = L.cols.length;
    // Edges.
    let wi = 0;
    for (let c = 0; c < nCols - 1; c++) {
      const A = L.cols[c];
      const B = L.cols[c + 1];
      const ck = easeInOut(clamp(nk * 1.6 - c * 0.15));
      const wave = waveAt(p, c + 0.5);
      for (const a of A) {
        for (const b of B) {
          const wt = weights[wi++ % weights.length];
          if (ck <= 0) continue;
          const ex = lerp(a.x, b.x, ck);
          const ey = lerp(a.y, b.y, ck);
          ctx.save();
          ctx.globalAlpha *= 0.06 + wt * 0.12 + wave * wt * 0.5;
          ctx.strokeStyle = wave > 0.1 && wt > 0.55 ? COLORS.gold : COLORS.steel;
          ctx.lineWidth = 0.7 + wave * wt;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          ctx.restore();
          if (wave > 0.15 && wt > 0.6) {
            glow.save();
            glow.globalAlpha *= wave * wt * 0.5;
            glow.strokeStyle = COLORS.gold;
            glow.lineWidth = 1.6;
            glow.beginPath();
            glow.moveTo(a.x, a.y);
            glow.lineTo(b.x, b.y);
            glow.stroke();
            glow.restore();
          }
        }
      }
      // Signal sparks travelling along the strongest edges of this gap.
      for (const w0 of CONFIG.waves) {
        const u = (p - (w0 + c * CONFIG.hop)) / CONFIG.hop;
        if (u <= 0 || u >= 1) continue;
        for (let ai = 0; ai < A.length; ai++) {
          for (let bi = 0; bi < B.length; bi++) {
            if (weights[(c * 97 + ai * 13 + bi * 7) % weights.length] < 0.72) continue;
            const a = A[ai];
            const b = B[bi];
            spark(f, lerp(a.x, b.x, easeInOut(u)), lerp(a.y, b.y, easeInOut(u)), 1.6, 0.9);
          }
        }
      }
    }
    // Hidden nodes.
    for (let c = 1; c < nCols - 1; c++) {
      const nkk = easeOut(clamp(nk * 1.6 - (c - 1) * 0.15));
      const wave = waveAt(p, c);
      for (const n of L.cols[c]) {
        ctx.save();
        ctx.globalAlpha *= nkk;
        ctx.fillStyle = "#0E0F12";
        ctx.strokeStyle = wave > 0.1 ? COLORS.goldPale : rgba(COLORS.gold, 0.6);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(n.x, n.y, L.narrow ? 4 : 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        if (wave > 0) spark(f, n.x, n.y, L.narrow ? 2.4 : 3.2, wave);
      }
    }
  }

  function drawIO(f: SceneFrame) {
    const { p, ctx, fonts } = f;
    const n = L.narrow;
    const ia = easeOut(seg(p, CONFIG.inputs[0], CONFIG.inputs[0] + 0.14));
    label(f, C.inputsLabel, L.inLabel.x, L.inLabel.y, { size: n ? 8.5 : 9.5, color: COLORS.faint, alpha: ia, align: n ? "center" : "left" });
    L.inBox.forEach((b, i) => {
      const k = easeOut(seg(p, CONFIG.inputs[0] + i * 0.04, CONFIG.inputs[1] + i * 0.04));
      const hot = waveAt(p, 0);
      panel(f, b.x, b.y, b.w, b.h, k, { hot: hot * 0.5 });
      if (n) {
        text(ctx, fonts.mono, C.inputs[i].split(" ")[0], b.x + b.w / 2, b.y + b.h / 2, { size: 8.5, color: COLORS.text, alpha: k, align: "center", track: 0.1 });
      } else {
        glyph(ctx, [0, 3, 4][i], b.x + 22, b.y + b.h / 2, 7, COLORS.gold, k);
        text(ctx, fonts.mono, C.inputs[i], b.x + 42, b.y + b.h / 2, { size: 10, color: COLORS.text, alpha: k, track: 0.12 });
      }
    });

    const oa = easeOut(seg(p, CONFIG.outputs[0] - 0.06, CONFIG.outputs[0] + 0.06));
    label(f, C.outputsLabel, L.outLabel.x, L.outLabel.y, { size: n ? 8.5 : 9.5, color: COLORS.faint, alpha: oa, align: n ? "center" : "left" });
    L.outBox.forEach((b, i) => {
      const t0 = lerp(CONFIG.outputs[0], CONFIG.outputs[1], i / 2);
      const k = easeOut(seg(p, t0 - 0.06, t0 + 0.04));
      if (k <= 0) return;
      const lit = p >= t0;
      const hot = Math.max(lit ? clamp(1 - (p - t0) * 6) : 0, waveAt(p, L.cols.length - 1) * 0.6);
      panel(f, b.x, b.y, b.w, b.h, k, { hot: hot * 0.8 + (lit ? 0.12 : 0) });
      const nm = C.outputs[i];
      if (n) {
        text(ctx, fonts.mono, nm.split(" ").slice(-1)[0], b.x + b.w / 2, b.y + b.h / 2, { size: 8.5, color: lit ? COLORS.goldPale : COLORS.dim, alpha: k, align: "center", track: 0.1 });
      } else {
        ctx.save();
        ctx.globalAlpha *= k;
        ctx.fillStyle = lit ? COLORS.gold : COLORS.line;
        ctx.translate(b.x + 18, b.y + b.h / 2);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-3.5, -3.5, 7, 7);
        ctx.restore();
        text(ctx, fonts.mono, nm, b.x + 34, b.y + b.h / 2, { size: 9.5, color: lit ? COLORS.goldPale : COLORS.dim, alpha: k, track: 0.08 });
      }
      ring(f, b.x + 18, b.y + b.h / 2, 4, 30, (p - t0) * 5);
    });

    // Model label and agent trace.
    const ma = easeOut(seg(p, 0.16, 0.32));
    if (!n) {
      text(ctx, fonts.display, C.model, L.modelLabel.x, L.modelLabel.y, { size: 13, weight: 600, color: COLORS.goldPale, alpha: ma, align: "center", track: 0.16 });
      label(f, C.modelSub, L.modelLabel.x, L.modelLabel.y + 18, { size: 9, color: COLORS.dim, alpha: ma, align: "center" });
    }
    const tk = seg(p, CONFIG.trace[0], CONFIG.trace[1]);
    if (tk > 0) {
      label(f, `> ${typed(CONFIG.traceText, tk)}`, L.trace.x, L.trace.y, { size: n ? 8 : 10, color: COLORS.copperSoft, alpha: easeOut(tk * 4), align: "center" });
    }
  }

  return {
    id: "intelligence",
    resize,
    draw(f) {
      if (f.w !== L.w || f.h !== L.h) resize(f.w, f.h);
      drawNet(f);
      drawIO(f);
    },
  };
}
