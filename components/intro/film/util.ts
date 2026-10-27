import { TOKENS } from "@/lib/tokens";

export { mulberry32, type RandomFn } from "@/lib/sim/prng";

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Normalised position of p inside [a, b], clamped. */
export const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeOutExpo = (t: number) => (clamp(t) === 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)));
export const easeInOut = (t: number) => {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * clamp(t)) - 1) / 2;

/** Brand + data palette. GOLD tones match the AGENTIUM logo; data colours carry meaning only. */
export const COLORS = {
  bg: TOKENS.bg,
  bgElev: TOKENS.bgElev,
  bgElev2: TOKENS.bgElev2,
  text: TOKENS.text,
  dim: TOKENS.textDim,
  faint: TOKENS.textFaint,
  line: TOKENS.line,
  copper: TOKENS.copper,
  copperSoft: TOKENS.copperSoft,
  steel: TOKENS.steel,
  gold: "#E8B65A",
  goldDeep: "#B07A2A",
  goldPale: "#F7DFA3",
  red: TOKENS.dataRed,
  green: TOKENS.dataGreen,
  blue: TOKENS.dataBlue,
  dataGold: TOKENS.dataGold,
} as const;

export function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp(a)})`;
}

export function hexHash(rng: () => number, len: number) {
  let s = "";
  for (let i = 0; i < len; i++) s += Math.floor(rng() * 16).toString(16);
  return s;
}

type TrackedCtx = CanvasRenderingContext2D & { letterSpacing?: string };

/** Mono system label with 0.14em tracking. */
export function drawLabel(
  ctx: CanvasRenderingContext2D,
  font: string,
  text: string,
  x: number,
  y: number,
  color: string,
  alpha: number,
  align: CanvasTextAlign = "left",
  size = 11,
) {
  if (alpha <= 0) return;
  const c = ctx as TrackedCtx;
  c.save();
  c.globalAlpha *= clamp(alpha);
  c.font = `500 ${size}px ${font}`;
  c.fillStyle = color;
  c.textAlign = align;
  c.textBaseline = "middle";
  if ("letterSpacing" in c) c.letterSpacing = `${(size * 0.14).toFixed(1)}px`;
  c.fillText(text, x, y);
  c.restore();
}
