import seed from "@/lib/sim/seed.json";
import { introScenes } from "@/content/copy/intro-scenes";
import type { FilmScene, SceneFrame } from "../types";
import { COLORS, clamp, easeInOut, easeOut, hexHash, lerp, mulberry32, rgba, seg } from "../util";
import { label, packets, panel, pointAt, ring, safeZone, spark, text, typed, wire, type Pt } from "../kit";

/**
 * 03 — Settled on-chain. Supported wallets emit deposits, withdrawals and transactions; each one flies
 * into the block that is filling; the block seals with a flash, its hash types in and it turns
 * CONFIRMED while the next block links on.
 */
const CONFIG = {
  blocks: 5,
  blocksNarrow: 4,
  first: 0.05,
  step: 0.15,
  /** Fill window per block; it seals at the end of it. */
  fill: 0.12,
  txPerBlock: 6,
  txFly: 0.07,
  heightBase: 4812330,
};

const C = introScenes.settlement;

type Block = { x: number; y: number; w: number; h: number; t0: number; hash: string; n: number; link: Pt[] };

export function createSettlementScene(): FilmScene {
  const rng = mulberry32(seed.seed ^ 0x5e77);
  const hashes = Array.from({ length: CONFIG.blocks }, () => `0x${hexHash(rng, 4)}…${hexHash(rng, 4)}`);
  const txJit = Array.from({ length: CONFIG.blocks * CONFIG.txPerBlock }, () => rng());

  const L = {
    w: 0,
    h: 0,
    narrow: false,
    wallets: [] as { x: number; y: number; w: number; h: number; port: Pt }[],
    blocks: [] as Block[],
    walletLabel: { x: 0, y: 0 },
    chainLabel: { x: 0, y: 0 },
  };

  function resize(w: number, h: number) {
    const narrow = w < 760;
    const z = safeZone(w, h, narrow);
    L.w = w;
    L.h = h;
    L.narrow = narrow;
    L.wallets = [];
    L.blocks = [];
    const nB = narrow ? CONFIG.blocksNarrow : CONFIG.blocks;
    if (!narrow) {
      const ww = clamp(w * 0.13, 150, 200);
      const wh = 50;
      const gap = clamp(z.height * 0.09, 18, 40);
      const total = 3 * wh + 2 * gap;
      for (let i = 0; i < 3; i++) {
        const x = w * 0.07;
        const y = z.cy - total / 2 + i * (wh + gap);
        L.wallets.push({ x, y, w: ww, h: wh, port: { x: x + ww, y: y + wh / 2 } });
      }
      L.walletLabel = { x: w * 0.07, y: z.cy - total / 2 - 22 };
      const x0 = w * 0.33;
      const x1 = w * 0.9;
      const bgap = 22;
      const bw = (x1 - x0 - bgap * (nB - 1)) / nB;
      const bh = clamp(bw * 0.95, 110, 170);
      for (let i = 0; i < nB; i++) {
        const x = x0 + i * (bw + bgap);
        const y = z.cy - bh / 2;
        L.blocks.push({ x, y, w: bw, h: bh, t0: CONFIG.first + i * CONFIG.step, hash: hashes[i], n: CONFIG.heightBase + i, link: i ? [{ x: x - bgap, y: z.cy }, { x, y: z.cy }] : [] });
      }
      L.chainLabel = { x: x0, y: z.cy - bh / 2 - 22 };
    } else {
      const ww = (w - 32 - 16) / 3;
      const wh = 30;
      for (let i = 0; i < 3; i++) {
        const x = 16 + i * (ww + 8);
        const y = z.top + 18;
        L.wallets.push({ x, y, w: ww, h: wh, port: { x: x + ww / 2, y: y + wh } });
      }
      L.walletLabel = { x: w / 2, y: z.top + 4 };
      const y0 = z.top + Math.max(92, (z.height - 4 * 58) / 2 + 40);
      const bgap = 12;
      const bh = Math.min(46, (z.bottom - y0 - bgap * (nB - 1)) / nB);
      for (let i = 0; i < nB; i++) {
        const y = y0 + i * (bh + bgap);
        L.blocks.push({ x: 16, y, w: w - 32, h: bh, t0: CONFIG.first + i * CONFIG.step * 1.2, hash: hashes[i], n: CONFIG.heightBase + i, link: i ? [{ x: w / 2, y: y - bgap }, { x: w / 2, y }] : [] });
      }
      L.chainLabel = { x: w / 2, y: y0 - 14 };
    }
  }

  function drawWallets(f: SceneFrame) {
    const { p } = f;
    const la = easeOut(seg(p, 0.0, 0.14));
    if (L.narrow) label(f, C.walletSub, L.walletLabel.x, L.walletLabel.y, { size: 8.5, color: COLORS.faint, alpha: la, align: "center" });
    else label(f, C.walletSub, L.walletLabel.x, L.walletLabel.y, { size: 9.5, color: COLORS.faint, alpha: la });
    L.wallets.forEach((wl, i) => {
      const k = easeOut(seg(p, 0.0 + i * 0.04, 0.16 + i * 0.04));
      if (k <= 0) return;
      // A wallet pulses when it sends.
      let hot = 0;
      for (const b of L.blocks) {
        for (let j = i; j < CONFIG.txPerBlock; j += 3) {
          const t = b.t0 + j * (CONFIG.fill / CONFIG.txPerBlock);
          const d = p - t;
          if (d >= 0 && d < 0.04) hot = Math.max(hot, 1 - d / 0.04);
        }
      }
      panel(f, wl.x, wl.y, wl.w, wl.h, k, { hot: hot * 0.6 });
      if (L.narrow) {
        text(f.ctx, f.fonts.mono, C.wallets[i], wl.x + wl.w / 2, wl.y + wl.h / 2, { size: 8.5, color: COLORS.text, alpha: k, align: "center", track: 0.1 });
      } else {
        // Wallet glyph.
        const gx = wl.x + 22;
        const gy = wl.y + wl.h / 2;
        f.ctx.save();
        f.ctx.globalAlpha *= k;
        f.ctx.strokeStyle = COLORS.gold;
        f.ctx.lineWidth = 1.2;
        f.ctx.strokeRect(gx - 9, gy - 7, 18, 14);
        f.ctx.beginPath();
        f.ctx.moveTo(gx + 3, gy - 2);
        f.ctx.lineTo(gx + 9, gy - 2);
        f.ctx.lineTo(gx + 9, gy + 3);
        f.ctx.lineTo(gx + 3, gy + 3);
        f.ctx.closePath();
        f.ctx.stroke();
        f.ctx.restore();
        text(f.ctx, f.fonts.mono, C.wallets[i], wl.x + 44, gy, { size: 10.5, color: COLORS.text, alpha: k, track: 0.12 });
      }
    });
  }

  function txPath(from: Pt, b: Block): Pt[] {
    const to = L.narrow ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    const pts: Pt[] = [];
    for (let s = 0; s <= 16; s++) {
      const u = s / 16;
      const m = 1 - u;
      const c1 = L.narrow ? { x: from.x, y: lerp(from.y, to.y, 0.6) } : { x: lerp(from.x, to.x, 0.5), y: from.y };
      const c2 = L.narrow ? { x: to.x, y: lerp(from.y, to.y, 0.4) } : { x: lerp(from.x, to.x, 0.6), y: to.y - (b.h / 2) * 0.9 };
      pts.push({
        x: m * m * m * from.x + 3 * m * m * u * c1.x + 3 * m * u * u * c2.x + u * u * u * to.x,
        y: m * m * m * from.y + 3 * m * m * u * c1.y + 3 * m * u * u * c2.y + u * u * u * to.y,
      });
    }
    return pts;
  }

  function drawTx(f: SceneFrame) {
    const { p } = f;
    L.blocks.forEach((b, bi) => {
      for (let j = 0; j < CONFIG.txPerBlock; j++) {
        const t = b.t0 + j * (CONFIG.fill / CONFIG.txPerBlock) - CONFIG.txFly * 0.6;
        const k = seg(p, t, t + CONFIG.txFly);
        if (k <= 0 || k >= 1) continue;
        const wl = L.wallets[j % 3];
        const path = txPath(wl.port, b);
        const u = easeInOut(k);
        // Short comet trail.
        for (let s = 0; s < 6; s++) {
          const q = pointAt(path, Math.max(0, u - s * 0.025));
          spark(f, q.x, q.y, (L.narrow ? 1.6 : 2.2) * (1 - s / 6), (1 - s / 6) * 0.9, j % 3 === 1 ? COLORS.copperSoft : COLORS.goldPale);
        }
        if (!L.narrow && txJit[bi * CONFIG.txPerBlock + j] > 0.5) {
          const q = pointAt(path, u);
          label(f, `tx_${hexHash(mulberry32(bi * 31 + j), 4)}`, q.x + 8, q.y - 10, { size: 8, color: COLORS.dim, alpha: Math.sin(Math.PI * k) * 0.8 });
        }
      }
    });
  }

  function drawChain(f: SceneFrame) {
    const { p, ctx, fonts } = f;
    const la = easeOut(seg(p, 0.02, 0.16));
    if (L.narrow) label(f, C.chain, L.chainLabel.x, L.chainLabel.y, { size: 8.5, color: COLORS.faint, alpha: la, align: "center" });
    else label(f, C.chain, L.chainLabel.x, L.chainLabel.y, { size: 9.5, color: COLORS.faint, alpha: la });
    L.blocks.forEach((b, i) => {
      const k = easeOut(seg(p, b.t0 - 0.05, b.t0 + 0.03));
      if (k <= 0) return;
      const seal = b.t0 + CONFIG.fill;
      const sealed = p >= seal;
      const hot = sealed ? clamp(1 - (p - seal) * 7) : 0;
      if (b.link.length) {
        const lk = easeInOut(seg(p, b.t0 - 0.06, b.t0));
        wire(f, b.link, lk, { width: 2, alpha: 0.8, glow: 0.6 });
        if (lk >= 1) packets(f, b.link, 1, { speed: 1.2, phase: i * 0.3, r: 1.6 });
      }
      panel(f, b.x, b.y, b.w, b.h, k, { hot: hot * 0.9 + (sealed ? 0.08 : 0), border: sealed ? COLORS.gold : COLORS.steel });
      // Fill gauge: tx count.
      const filled = Math.min(CONFIG.txPerBlock, Math.floor(seg(p, b.t0, seal) * CONFIG.txPerBlock + (sealed ? 1 : 0)));
      if (!L.narrow) {
        const px = b.x + 14;
        text(ctx, fonts.mono, C.block, px, b.y + 18, { size: 9, color: COLORS.dim, alpha: k, track: 0.14 });
        text(ctx, fonts.mono, `#${b.n.toLocaleString("en-US")}`, px, b.y + 38, { size: 13, weight: 600, color: sealed ? COLORS.goldPale : COLORS.text, alpha: k, track: 0.02 });
        // Tx cells.
        const cw = (b.w - 28 - 5 * 4) / 6;
        for (let c = 0; c < CONFIG.txPerBlock; c++) {
          ctx.save();
          ctx.globalAlpha *= k;
          ctx.fillStyle = c < filled ? rgba(COLORS.gold, sealed ? 0.75 : 0.55) : rgba(COLORS.line, 0.8);
          ctx.fillRect(px + c * (cw + 4), b.y + b.h * 0.5, cw, 6);
          ctx.restore();
        }
        const hk = easeOut(seg(p, seal, seal + 0.06));
        text(ctx, fonts.mono, typed(b.hash, hk), px, b.y + b.h * 0.5 + 24, { size: 9.5, color: COLORS.dim, alpha: k * (hk > 0 ? 1 : 0), track: 0.04 });
        if (sealed) {
          const ca = easeOut(seg(p, seal + 0.03, seal + 0.08));
          ctx.save();
          ctx.globalAlpha *= ca;
          ctx.fillStyle = COLORS.green;
          ctx.beginPath();
          ctx.arc(px + 3, b.y + b.h - 18, 2.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          text(ctx, fonts.mono, C.confirmed, px + 12, b.y + b.h - 18, { size: 8.5, color: COLORS.green, alpha: ca, track: 0.14 });
        }
      } else {
        const cy = b.y + b.h / 2;
        text(ctx, fonts.mono, `${C.block} #${b.n.toLocaleString("en-US")}`, b.x + 12, cy, { size: 9.5, weight: 600, color: sealed ? COLORS.goldPale : COLORS.text, alpha: k, track: 0.06 });
        const cw = 7;
        for (let c = 0; c < CONFIG.txPerBlock; c++) {
          ctx.save();
          ctx.globalAlpha *= k;
          ctx.fillStyle = c < filled ? rgba(COLORS.gold, 0.7) : rgba(COLORS.line, 0.8);
          ctx.fillRect(b.x + b.w * 0.56 + c * (cw + 3), cy - 3, cw, 6);
          ctx.restore();
        }
        if (sealed) {
          ctx.save();
          ctx.globalAlpha *= easeOut(seg(p, seal, seal + 0.05));
          ctx.fillStyle = COLORS.green;
          ctx.beginPath();
          ctx.arc(b.x + b.w - 14, cy, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      ring(f, b.x + b.w / 2, b.y + b.h / 2, b.h * 0.2, b.h * 0.9, (p - seal) * 6);
    });
  }

  return {
    id: "settlement",
    resize,
    draw(f) {
      if (f.w !== L.w || f.h !== L.h) resize(f.w, f.h);
      drawWallets(f);
      drawChain(f);
      drawTx(f);
    },
  };
}
