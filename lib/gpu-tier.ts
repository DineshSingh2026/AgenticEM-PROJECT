import type { Quality } from "@/lib/scene-store";

let cached: Promise<Quality> | null = null;

/**
 * Resolve the render quality tier for this device.
 * 0 → no WebGL (posters only), 1 → half counts / no bloom, 2 → full.
 * detect-gpu tiers 3 (desktop or mobile) are clamped to 2. Any failure resolves to 1.
 */
export function getGpuTier(): Promise<Quality> {
  if (typeof window === "undefined") return Promise.resolve(1);
  if (cached) return cached;
  cached = (async (): Promise<Quality> => {
    try {
      const { getGPUTier } = await import("detect-gpu");
      const res = await getGPUTier();
      if (res.type === "WEBGL_UNSUPPORTED" || res.type === "BLOCKLISTED") return 0;
      if (res.type === "SSR") return 1;
      const t = Math.max(0, Math.min(3, Math.round(res.tier)));
      if (t >= 2) return 2;
      return t as Quality;
    } catch {
      return 1;
    }
  })();
  return cached;
}
