/**
 * Seeded PRNG utilities (mulberry32). Pure functions, no side effects at import.
 * Every visitor gets the same sequence for the same seed.
 */

export type RandomFn = () => number;

/** mulberry32: returns a function producing floats in [0, 1). */
export function mulberry32(seed: number): RandomFn {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform float in [min, max). */
export function uniform(rng: RandomFn, min: number, max: number): number {
  return min + (max - min) * rng();
}

/** Uniform integer in [min, max] (inclusive). */
export function int(rng: RandomFn, min: number, max: number): number {
  return Math.floor(min + (max - min + 1) * rng());
}

/** Log-uniform float in [min, max). Both bounds must be > 0. */
export function logUniform(rng: RandomFn, min: number, max: number): number {
  const lo = Math.log(min);
  const hi = Math.log(max);
  return Math.exp(lo + (hi - lo) * rng());
}

/** Standard normal sample (Box-Muller). */
export function gaussian(rng: RandomFn): number {
  let u = 0;
  while (u === 0) u = rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Exponential sample with the given rate (events per unit). */
export function exponential(rng: RandomFn, rate: number): number {
  let u = 0;
  while (u === 0) u = rng();
  return -Math.log(u) / rate;
}

/** Poisson sample with mean lambda (Knuth; fine for small lambda). */
export function poisson(rng: RandomFn, lambda: number): number {
  if (lambda <= 0) return 0;
  if (lambda > 30) {
    // Normal approximation for large means.
    return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * gaussian(rng)));
  }
  const l = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > l);
  return k - 1;
}

/** Pick a key from a weight map (weights need not sum to 1). */
export function pickWeighted<K extends string>(rng: RandomFn, weights: Record<K, number>): K {
  const keys = Object.keys(weights) as K[];
  let total = 0;
  for (const k of keys) total += weights[k];
  let r = rng() * total;
  for (const k of keys) {
    r -= weights[k];
    if (r < 0) return k;
  }
  return keys[keys.length - 1];
}

/** Uniform pick from an array. */
export function pick<T>(rng: RandomFn, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

const HEX = "0123456789abcdef";

/** Random lowercase hex string of `length` chars. */
export function hex(rng: RandomFn, length: number): string {
  let s = "";
  for (let i = 0; i < length; i++) s += HEX[Math.floor(rng() * 16)];
  return s;
}

/** Convenience wrapper bundling a seeded stream with the helpers. */
export interface Rng {
  next: RandomFn;
  uniform(min: number, max: number): number;
  int(min: number, max: number): number;
  logUniform(min: number, max: number): number;
  gaussian(): number;
  exponential(rate: number): number;
  poisson(lambda: number): number;
  pickWeighted<K extends string>(weights: Record<K, number>): K;
  pick<T>(items: readonly T[]): T;
  hex(length: number): string;
}

export function createRng(seed: number): Rng {
  const next = mulberry32(seed);
  return {
    next,
    uniform: (min, max) => uniform(next, min, max),
    int: (min, max) => int(next, min, max),
    logUniform: (min, max) => logUniform(next, min, max),
    gaussian: () => gaussian(next),
    exponential: (rate) => exponential(next, rate),
    poisson: (lambda) => poisson(next, lambda),
    pickWeighted: (weights) => pickWeighted(next, weights),
    pick: (items) => pick(next, items),
    hex: (length) => hex(next, length),
  };
}
