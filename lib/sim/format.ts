/**
 * Locale-pinned (en-US) number and time formatters so server and client output match.
 */

export type NumberFormat = "int" | "compact" | "usd" | "ms" | "pct";

const intFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const usdCentsFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1284000 → "1,284,000" */
export function formatInt(n: number): string {
  return intFmt.format(Math.round(n));
}

/** 1284000 → "1.28M", 18400 → "18.4K", 153700 → "154K", 950 → "950" (3 significant digits). */
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  const units: [number, string][] = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [size, suffix] of units) {
    if (abs >= size) {
      const v = n / size;
      const a = Math.abs(v);
      const digits = a >= 100 ? 0 : a >= 10 ? 1 : 2;
      return `${trimZeros(v.toFixed(digits))}${suffix}`;
    }
  }
  return formatInt(n);
}

function trimZeros(s: string): string {
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

/** 153700 → "$153,700"; { cents: true } → "$12.40"; { compact: true } → "$154K". */
export function formatUsd(n: number, opts: { cents?: boolean; compact?: boolean } = {}): string {
  if (opts.compact) return (n < 0 ? "-$" : "$") + formatCompact(Math.abs(n));
  return opts.cents ? usdCentsFmt.format(n) : usdFmt.format(n);
}

/** 42 → "42 ms"; 4.25 → "4.3 ms"; 1830 → "1.83 s" */
export function formatMs(n: number): string {
  if (n >= 1000) return `${trimZeros((n / 1000).toFixed(2))} s`;
  if (n < 10 && !Number.isInteger(n)) return `${n.toFixed(1)} ms`;
  return `${Math.round(n)} ms`;
}

/** 2.3 → "2.3%" (value already in percent). */
export function formatPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

/** Dispatcher used by StatTicker-style components. */
export function formatNumber(n: number, format: NumberFormat = "int"): string {
  switch (format) {
    case "compact":
      return formatCompact(n);
    case "usd":
      return formatUsd(n);
    case "ms":
      return formatMs(n);
    case "pct":
      return formatPct(n);
    case "int":
    default:
      return formatInt(n);
  }
}

/** "just now", "12s ago", "3m ago", "2h ago", "4d ago". */
export function formatRelative(ts: number, now: number = Date.now()): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 1) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "21:04:09 UTC" (pass { suffix: false } for "21:04:09"). */
export function formatUtcTime(ts: number, opts: { suffix?: boolean } = {}): string {
  const d = new Date(ts);
  const t = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  return opts.suffix === false ? t : `${t} UTC`;
}

/** Shorten an id/hash: "0x9f3a…be21". */
export function formatHash(hash: string, head = 6, tail = 4): string {
  const h = hash.startsWith("0x") ? hash.slice(2) : hash;
  if (h.length <= head + tail) return `0x${h}`;
  return `0x${h.slice(0, head)}…${h.slice(-tail)}`;
}
