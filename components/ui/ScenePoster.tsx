"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { SceneName } from "@/lib/scene-store";
import { cn } from "@/lib/cn";

export interface ScenePosterProps {
  scene: SceneName;
  className?: string;
  priority?: boolean;
}

/** Per-scene composition of the CSS fallback: glow positions (in %) and copper/steel balance. */
const LOOK: Record<SceneName, { c: [number, number]; s: [number, number]; copper: number; steel: number; gold?: number }> = {
  AgentField: { c: [62, 38], s: [30, 64], copper: 0.22, steel: 0.3 },
  VolumeBreak: { c: [70, 30], s: [25, 70], copper: 0.28, steel: 0.18 },
  Convergence: { c: [50, 50], s: [18, 40], copper: 0.3, steel: 0.22 },
  ExplodedStack: { c: [55, 62], s: [45, 25], copper: 0.26, steel: 0.26 },
  AgentLoop: { c: [50, 48], s: [72, 70], copper: 0.3, steel: 0.18 },
  Turbine: { c: [48, 52], s: [20, 22], copper: 0.32, steel: 0.2 },
  AnomalyStream: { c: [78, 46], s: [20, 54], copper: 0.24, steel: 0.28 },
  Ledger: { c: [64, 50], s: [26, 50], copper: 0.26, steel: 0.2 },
  ArenaGraph: { c: [50, 44], s: [50, 80], copper: 0.22, steel: 0.32 },
  HeartbeatRing: { c: [50, 50], s: [80, 28], copper: 0.28, steel: 0.24 },
  FlywheelScene: { c: [56, 46], s: [26, 70], copper: 0.3, steel: 0.22 },
  SplitWorld: { c: [74, 52], s: [24, 48], copper: 0.32, steel: 0.3 },
  CasinoWheel: { c: [74, 50], s: [86, 30], copper: 0.3, steel: 0.06, gold: 0.34 },
};

function fallbackStyle(scene: SceneName): CSSProperties {
  const l = LOOK[scene];
  return {
    backgroundColor: "var(--bg)",
    backgroundImage: [
      ...(l.gold ? [`radial-gradient(ellipse 32% 26% at ${l.c[0]}% ${l.c[1]}%, rgb(232 182 90 / ${l.gold}), transparent 70%)`] : []),
      `radial-gradient(ellipse 45% 40% at ${l.c[0]}% ${l.c[1]}%, rgb(var(--copper-rgb) / ${l.copper}), transparent 70%)`,
      `radial-gradient(ellipse 55% 50% at ${l.s[0]}% ${l.s[1]}%, rgb(var(--steel-rgb) / ${l.steel}), transparent 72%)`,
      "radial-gradient(ellipse 120% 90% at 50% 50%, transparent 40%, rgb(var(--bg-rgb) / 0.9) 100%)",
    ].join(", "),
  };
}

const gridStyle: CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, rgb(var(--text-rgb) / 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--text-rgb) / 0.06) 1px, transparent 1px)",
  backgroundSize: "80px 80px",
  backgroundPosition: "center center",
  maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, transparent 100%)",
  WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, transparent 100%)",
};

/**
 * Static poster for a scene. Always renders an intentional CSS composition (glow + blueprint grid);
 * the AVIF poster is layered on top and hidden if it fails to load.
 */
export function ScenePoster({ scene, className, priority = false }: ScenePosterProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    // The load/error event may have fired before hydration.
    if (img.complete) setState(img.naturalWidth > 0 ? "loaded" : "failed");
  }, [scene]);

  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden bg-bg", className)}>
      <div className="absolute inset-0" style={fallbackStyle(scene)} />
      <div className="absolute inset-0" style={gridStyle} />
      {state !== "failed" ? (
        <picture>
          <source srcSet={`/posters/${scene}.avif`} type="image/avif" />
          <img
            ref={imgRef}
            src={`/posters/${scene}.avif`}
            alt=""
            decoding="async"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            onLoad={() => setState("loaded")}
            onError={() => setState("failed")}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-out",
              state === "loaded" ? "opacity-100" : "opacity-0",
            )}
          />
        </picture>
      ) : null}
    </div>
  );
}
