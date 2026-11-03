import seed from "@/lib/sim/seed.json";
import { introScenes } from "@/content/copy/intro-scenes";
import type { FilmScene, SceneFrame } from "../types";
import { COLORS, clamp, easeInOut, easeOut, easeOutExpo, lerp, mulberry32, seg } from "../util";
import { emblemCore, label, packets, panel, ring, spark, wire, type Pt } from "../kit";

/**
 * 04 — Global B2B Gaming Network. The Agentium hub ignites inside a slowly turning wireframe globe;
 * operator and provider tenants are spawned out of it onto a shared ring and wired back to the core;
 * each tenant then reaches out to its endpoints — human players (gold) and authorized autonomous
 * agents (steel, with a green authorization lamp) — and value flows both ways along every link.
 * The chapter copy (title + a full sentence of body) sits bottom-left in HTML, so this scene keeps
 * its visuals higher than the other chapters (see `zone`).
 */
export const NETWORK = {
  core: [0.0, 0.16] as const,
  globe: [0.03, 0.24] as const,
  /** Tenant i leaves the hub at tenantAt + i * tenantStagger and docks tenantFly later. */
  tenantAt: 0.1,
  tenantStagger: 0.045,
  tenantFly: 0.1,
  /** Endpoint k is linked at linkAt + k * linkStagger (scaled so all land by linkEnd). */
  linkAt: 0.36,
  linkEnd: 0.68,
  header: [0.08, 0.24] as const,
  legend: [0.44, 0.58] as const,
  /** Hub broadcast ring period, ms. */
  pulseMs: 1700,
};

const C = introScenes.network;

type Chip = { x: number; y: number; w: number; h: number; c: Pt; from: Pt; hub: Pt[] };
type End = { x: number; y: number; agent: boolean; tenant: number; path: Pt[]; at: number; phase: number };

/** Where a ray from the chip centre towards `to` leaves the chip rectangle. */
function edgePt(ch: { c: Pt; w: number; h: number }, to: Pt, pad = 0): Pt {
  const dx = to.x - ch.c.x;
  const dy = to.y - ch.c.y;
  const t = Math.min((ch.w / 2 + pad) / Math.max(1e-6, Math.abs(dx)), (ch.h / 2 + pad) / Math.max(1e-6, Math.abs(dy)));
  return { x: ch.c.x + dx * t, y: ch.c.y + dy * t };
}

/**
 * Visual area for this scene. Like `safeZone`, but the bottom is pulled up to clear the taller HTML
 * chapter block (title + 3–6 lines of body copy), and on narrow screens there is no live stat in the
 * top-right, so the top only clears the letterbox bar.
 */
function zone(w: number, h: number, narrow: boolean) {
  const bar = clamp(h * 0.08, 44, 84);
  const top = bar + (narrow ? 22 : 28);
  const copyTop = h - (bar + h * 0.06) - (narrow ? 230 : 215);
  const bottom = Math.max(top + 200, Math.min(h * (narrow ? 0.56 : 0.58), copyTop));
  return { top, bottom, cx: w / 2, cy: (top + bottom) / 2, height: bottom - top };
}

/** Human player: head + shoulders inside a faint halo ring. */
function human(c: CanvasRenderingContext2D, x: number, y: number, s: number, a: number) {
  if (a <= 0) return;
  c.save();
  c.globalAlpha *= clamp(a);
  c.strokeStyle = COLORS.goldPale;
  c.fillStyle = COLORS.goldPale;
  c.lineWidth = 1.2;
  c.beginPath();
  c.arc(x, y - s * 0.32, s * 0.3, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(x, y + s * 0.62, s * 0.62, Math.PI * 1.08, Math.PI * 1.92);
  c.stroke();
  c.globalAlpha *= 0.45;
  c.beginPath();
  c.arc(x, y, s * 1.2, 0, Math.PI * 2);
  c.stroke();
  c.restore();
}

/** Autonomous agent: steel hexagon with a lit square "eye". */
function agent(c: CanvasRenderingContext2D, x: number, y: number, s: number, a: number) {
  if (a <= 0) return;
  c.save();
  c.globalAlpha *= clamp(a);
  c.strokeStyle = COLORS.steel;
  c.fillStyle = COLORS.steel;
  c.lineWidth = 1.2;
  c.beginPath();
  for (let i = 0; i < 6; i++) {
    const th = Math.PI / 6 + (i * Math.PI) / 3;
    const px = x + Math.cos(th) * s * 1.05;
    const py = y + Math.sin(th) * s * 1.05;
    if (i) c.lineTo(px, py);
    else c.moveTo(px, py);
  }
  c.closePath();
  c.stroke();
  const e = s * 0.32;
  c.fillRect(x - e, y - e, e * 2, e * 2);
  c.restore();
}

export function createNetworkScene(): FilmScene {
  const rng = mulberry32(seed.seed ^ 0x6e7);
  const jitter = Array.from({ length: 64 }, () => rng());

  const L = {
    w: 0,
    h: 0,
    narrow: false,
    cx: 0,
    cy: 0,
    R: 50,
    G: 90,
    rx: 200,
    ry: 100,
    chips: [] as Chip[],
    ends: [] as End[],
    headerY: 0,
    legendY: 0,
    glyph: 8,
  };

  function resize(w: number, h: number) {
    const narrow = w < 760;
    const z = zone(w, h, narrow);
    L.w = w;
    L.h = h;
    L.narrow = narrow;
    L.cx = z.cx;
    L.cy = z.cy;
    L.chips = [];
    L.ends = [];
    let rx2: number;
    let ry2: number;
    let cw: number;
    let chh: number;
    let offs: number[];
    if (!narrow) {
      L.R = clamp(Math.min(w, z.height) * 0.12, 36, 58);
      L.rx = clamp(w * 0.2, 190, 300);
      L.ry = z.height * 0.28;
      rx2 = clamp(w * 0.36, 320, 520);
      ry2 = z.height * 0.4;
      cw = 118;
      chh = 28;
      offs = [-0.3, 0, 0.3];
      L.glyph = 7.5;
      L.headerY = Math.max(z.top + 4, L.cy - ry2 - 24);
      L.legendY = Math.min(z.bottom - 4, L.cy + ry2 + 28);
    } else {
      L.R = clamp(w * 0.072, 22, 30);
      L.rx = w * 0.27;
      L.ry = z.height * 0.26;
      rx2 = w * 0.42;
      ry2 = z.height * 0.38;
      cw = 76;
      chh = 21;
      offs = [-0.24, 0.24];
      L.glyph = 6;
      L.headerY = Math.max(z.top + 2, L.cy - ry2 - 22);
      L.legendY = Math.min(z.bottom - 2, L.cy + ry2 + 22);
    }
    L.G = L.R * 1.85;

    const hubC = { x: L.cx, y: L.cy };
    C.tenants.forEach((_, i) => {
      const th = -Math.PI / 3 + (i * Math.PI) / 3;
      const c = { x: L.cx + Math.cos(th) * L.rx, y: L.cy + Math.sin(th) * L.ry };
      const chip = { c, w: cw, h: chh };
      const rim = { x: L.cx + Math.cos(th) * L.R * 1.3, y: L.cy + Math.sin(th) * L.R * 1.3 };
      L.chips.push({ x: c.x - cw / 2, y: c.y - chh / 2, w: cw, h: chh, c, from: hubC, hub: [rim, edgePt(chip, hubC, 2)] });
      offs.forEach((o, j) => {
        const k = L.ends.length;
        const ae = th + o;
        const r = 0.95 + jitter[k] * 0.1;
        const e = { x: L.cx + Math.cos(ae) * rx2 * r, y: L.cy + Math.sin(ae) * ry2 * r };
        const start = edgePt(chip, e, 2);
        const len = Math.hypot(e.x - start.x, e.y - start.y) || 1;
        const stop = L.glyph * 1.6;
        const end = { x: e.x - ((e.x - start.x) / len) * stop, y: e.y - ((e.y - start.y) / len) * stop };
        L.ends.push({ ...e, agent: (i + j) % 2 === 1, tenant: i, path: [start, end], at: 0, phase: jitter[k + 32] });
      });
    });
    // Links light in a ring-wise sweep, not tenant by tenant.
    const order = L.ends.map((_, k) => k).sort((a, b) => (a % offs.length) - (b % offs.length) || a - b);
    const step = (NETWORK.linkEnd - NETWORK.linkAt) / Math.max(1, L.ends.length - 1);
    order.forEach((k, n) => (L.ends[k].at = NETWORK.linkAt + n * step));
  }

  const tenantDock = (i: number) => NETWORK.tenantAt + i * NETWORK.tenantStagger + NETWORK.tenantFly;

  function drawGlobe(f: SceneFrame) {
    const { ctx, glow, local, p } = f;
    const k = easeOut(seg(p, NETWORK.globe[0], NETWORK.globe[1]));
    if (k <= 0) return;
    const G = L.G * lerp(0.6, 1, k);
    ctx.save();
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 0.8;
    ctx.globalAlpha *= 0.16 * k;
    // Meridians turning.
    for (let m = 0; m < 4; m++) {
      const ph = local / 5200 + (m * Math.PI) / 4;
      ctx.beginPath();
      ctx.ellipse(L.cx, L.cy, Math.max(0.5, G * Math.abs(Math.cos(ph))), G, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Parallels.
    for (const l of [-0.55, 0, 0.55]) {
      const rr = G * Math.sqrt(1 - l * l);
      ctx.beginPath();
      ctx.ellipse(L.cx, L.cy + l * G, rr, rr * 0.16, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha *= 2.6;
    ctx.beginPath();
    ctx.arc(L.cx, L.cy, G, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    glow.save();
    glow.globalAlpha *= 0.22 * k;
    glow.strokeStyle = COLORS.gold;
    glow.lineWidth = 1.5;
    glow.beginPath();
    glow.arc(L.cx, L.cy, G, 0, Math.PI * 2);
    glow.stroke();
    glow.restore();
  }

  function drawTenantRing(f: SceneFrame) {
    const { ctx, local, p } = f;
    const k = easeInOut(seg(p, NETWORK.tenantAt, tenantDock(C.tenants.length - 1)));
    if (k <= 0) return;
    ctx.save();
    ctx.globalAlpha *= 0.32;
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 7]);
    ctx.lineDashOffset = -local / 45;
    ctx.beginPath();
    ctx.ellipse(L.cx, L.cy, L.rx, L.ry, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
    ctx.stroke();
    ctx.restore();
  }

  function drawHubWires(f: SceneFrame) {
    L.chips.forEach((ch, i) => {
      const d = tenantDock(i);
      const wk = easeInOut(seg(f.p, d, d + 0.06));
      wire(f, ch.hub, wk, { alpha: 0.5, glow: 0.35 });
      if (wk >= 1) {
        packets(f, ch.hub, 1, { speed: 0.9, phase: i * 0.29, r: 1.6 });
        packets(f, [...ch.hub].reverse(), 1, { speed: 0.7, phase: i * 0.41 + 0.5, r: 1.3, color: COLORS.copperSoft });
      }
    });
  }

  function drawLinks(f: SceneFrame) {
    const { p } = f;
    for (const e of L.ends) {
      const wk = easeInOut(seg(p, e.at, e.at + 0.05));
      if (wk <= 0) continue;
      const col = e.agent ? COLORS.steel : COLORS.gold;
      wire(f, e.path, wk, { color: col, alpha: e.agent ? 0.5 : 0.45, glow: 0.3 });
      if (wk >= 1) {
        const pc = e.agent ? COLORS.steel : COLORS.goldPale;
        packets(f, e.path, 1, { speed: 0.55 + e.phase * 0.35, phase: e.phase, r: L.narrow ? 1.3 : 1.6, color: pc });
        packets(f, [...e.path].reverse(), 1, { speed: 0.45 + e.phase * 0.2, phase: e.phase + 0.5, r: 1.1, alpha: 0.7, color: pc });
      }
    }
  }

  function drawEnds(f: SceneFrame) {
    const { ctx, glow, p, local } = f;
    L.ends.forEach((e, k) => {
      const t0 = e.at + 0.04;
      const kk = seg(p, t0, t0 + 0.06);
      if (kk <= 0) return;
      const s = L.glyph * lerp(0.4, 1, easeOutExpo(kk));
      const breathe = 0.8 + 0.2 * Math.sin(local / 420 + k * 1.3);
      if (e.agent) agent(ctx, e.x, e.y, s, easeOut(kk) * breathe);
      else human(ctx, e.x, e.y, s, easeOut(kk) * breathe);
      // Soft emissive dot so endpoints bloom like the rest of the network.
      glow.save();
      glow.globalAlpha *= easeOut(kk) * 0.35;
      glow.fillStyle = e.agent ? COLORS.steel : COLORS.gold;
      glow.beginPath();
      glow.arc(e.x, e.y, s * 1.1, 0, Math.PI * 2);
      glow.fill();
      glow.restore();
      ring(f, e.x, e.y, s, s * 3.4, (p - t0) * 9, e.agent ? COLORS.steel : COLORS.goldPale);
      // Authorized agents get a green lamp once the handshake completes.
      if (e.agent && p >= t0 + 0.05) {
        ctx.save();
        ctx.fillStyle = COLORS.green;
        ctx.globalAlpha *= 0.75 + 0.25 * Math.sin(local / 260 + k);
        ctx.beginPath();
        ctx.arc(e.x + s * 1.15, e.y - s * 1.0, L.narrow ? 1.6 : 2.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
  }

  function drawChips(f: SceneFrame) {
    const { ctx, glow, p, fonts } = f;
    L.chips.forEach((ch, i) => {
      const t0 = NETWORK.tenantAt + i * NETWORK.tenantStagger;
      const k = seg(p, t0, t0 + NETWORK.tenantFly);
      if (k <= 0) return;
      const e = easeOutExpo(k);
      const ox = lerp(ch.from.x - ch.c.x, 0, e);
      const oy = lerp(ch.from.y - ch.c.y, 0, e);
      const d = tenantDock(i);
      const hot = clamp(1 - (p - d) * 6) * (p >= d ? 1 : 0);
      ctx.save();
      glow.save();
      ctx.translate(ox, oy);
      glow.translate(ox, oy);
      panel(f, ch.x, ch.y, ch.w, ch.h, easeOut(k * 1.2), { hot: hot * 0.9 + 0.05 });
      const isOp = i % 2 === 0;
      const name = C.tenants[i];
      if (L.narrow) {
        label(f, name, ch.c.x, ch.c.y + 0.5, { size: 6.8, color: COLORS.text, alpha: e, align: "center" });
      } else {
        // Operator: solid square; provider: outlined diamond.
        const mx = ch.x + 13;
        ctx.save();
        ctx.globalAlpha *= e;
        ctx.strokeStyle = COLORS.gold;
        ctx.fillStyle = COLORS.gold;
        ctx.lineWidth = 1.1;
        if (isOp) ctx.fillRect(mx - 3, ch.c.y - 3, 6, 6);
        else {
          ctx.beginPath();
          ctx.moveTo(mx, ch.c.y - 4);
          ctx.lineTo(mx + 4, ch.c.y);
          ctx.lineTo(mx, ch.c.y + 4);
          ctx.lineTo(mx - 4, ch.c.y);
          ctx.closePath();
          ctx.stroke();
        }
        ctx.restore();
        label(f, name, ch.c.x + 7, ch.c.y + 0.5, { size: 9.5, color: COLORS.text, alpha: e, align: "center" });
      }
      ctx.restore();
      glow.restore();
      ring(f, ch.c.x, ch.c.y, 4, L.narrow ? 26 : 40, (p - d) * 5);
    });
  }

  function measure(f: SceneFrame, s: string, size: number) {
    const c = f.ctx as CanvasRenderingContext2D & { letterSpacing?: string };
    c.save();
    c.font = `500 ${size}px ${f.fonts.mono}`;
    if ("letterSpacing" in c) c.letterSpacing = `${(size * 0.14).toFixed(2)}px`;
    const wdt = c.measureText(s).width;
    c.restore();
    return wdt;
  }

  function drawHeader(f: SceneFrame) {
    const k = easeOut(seg(f.p, NETWORK.header[0], NETWORK.header[1]));
    if (k <= 0) return;
    const size = L.narrow ? 8.5 : 10;
    label(f, C.header, L.cx, L.headerY, { size, color: COLORS.dim, alpha: k, align: "center" });
    // Flanking gold rules grow out from the label.
    const half = measure(f, C.header, size) / 2 + (L.narrow ? 8 : 14);
    const len = (L.narrow ? 18 : 40) * k;
    const { ctx } = f;
    ctx.save();
    ctx.globalAlpha *= 0.6 * k;
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(L.cx - half, L.headerY);
    ctx.lineTo(L.cx - half - len, L.headerY);
    ctx.moveTo(L.cx + half, L.headerY);
    ctx.lineTo(L.cx + half + len, L.headerY);
    ctx.stroke();
    ctx.restore();
  }

  function drawLegend(f: SceneFrame) {
    const k = easeOut(seg(f.p, NETWORK.legend[0], NETWORK.legend[1]));
    if (k <= 0) return;
    const size = L.narrow ? 8 : 9.5;
    const s = L.narrow ? 5 : 6;
    const gap = L.narrow ? 18 : 34;
    const gl = s * 2.4 + (L.narrow ? 6 : 8); // glyph slot + spacing
    const wh = gl + measure(f, C.humans, size);
    const wa = gl + measure(f, C.agents, size);
    let x = L.cx - (wh + gap + wa) / 2;
    const y = L.legendY + (1 - k) * 6;
    human(f.ctx, x + s * 1.2, y, s, k);
    label(f, C.humans, x + gl, y + 0.5, { size, color: COLORS.dim, alpha: k });
    x += wh + gap;
    agent(f.ctx, x + s * 1.2, y, s, k);
    label(f, C.agents, x + gl, y + 0.5, { size, color: COLORS.dim, alpha: k });
  }

  return {
    id: "network",
    resize,
    draw(f) {
      if (f.w !== L.w || f.h !== L.h) resize(f.w, f.h);
      drawGlobe(f);
      drawTenantRing(f);
      drawHubWires(f);
      drawLinks(f);
      drawEnds(f);
      drawChips(f);
      emblemCore(f, L.cx, L.cy, L.R, easeOut(seg(f.p, NETWORK.core[0], NETWORK.core[1])));
      ring(f, L.cx, L.cy, L.R * 0.4, L.R * 3, seg(f.p, 0.04, 0.32));
      // Once every tenant is docked, the hub keeps broadcasting.
      if (f.p > tenantDock(C.tenants.length - 1)) {
        ring(f, L.cx, L.cy, L.R * 1.1, L.G * 1.35, (f.local % NETWORK.pulseMs) / NETWORK.pulseMs);
      }
      // A spark rides the tenant ring while it draws.
      const rk = seg(f.p, NETWORK.tenantAt, tenantDock(C.tenants.length - 1));
      if (rk > 0 && rk < 1) {
        const a = -Math.PI / 2 + Math.PI * 2 * easeInOut(rk);
        spark(f, L.cx + Math.cos(a) * L.rx, L.cy + Math.sin(a) * L.ry, 2.4, 1);
      }
      drawHeader(f);
      drawLegend(f);
    },
  };
}
