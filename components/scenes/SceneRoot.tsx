"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useSceneStore, type SceneName } from "@/lib/scene-store";
import { getGpuTier } from "@/lib/gpu-tier";
import { initSmoothScroll, refreshSceneTriggers, getLenis } from "@/lib/scroll";
import { ScenePoster } from "@/components/ui";

const SceneCanvas = dynamic(() => import("./SceneCanvas").then((m) => m.SceneCanvas), {
  ssr: false,
  loading: () => null,
});

const POSTER_FADE_MS = 500;

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/** Mounted once in app/layout.tsx. Owns device detection, smooth scroll, pointer and the WebGL layer. */
export function SceneRoot() {
  const pathname = usePathname();
  const reducedMotion = useSceneStore((s) => s.reducedMotion);
  const quality = useSceneStore((s) => s.quality);
  const activeScene = useSceneStore((s) => s.activeScene);
  const [tierReady, setTierReady] = useState(false);
  const [painted, setPainted] = useState(false);

  // Reduced motion: matchMedia + live listener → store.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => useSceneStore.getState().setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // GPU tier → store.quality.
  useEffect(() => {
    let alive = true;
    getGpuTier().then((q) => {
      if (!alive) return;
      useSceneStore.getState().setQuality(q);
      setTierReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Wait for first paint + idle before loading the WebGL bundle (keeps the H1 the LCP element).
  useEffect(() => {
    const w = window as IdleWindow;
    let idleId: number | undefined;
    let timeoutId: number | undefined;
    const raf = requestAnimationFrame(() => {
      if (w.requestIdleCallback) idleId = w.requestIdleCallback(() => setPainted(true), { timeout: 1500 });
      else timeoutId = window.setTimeout(() => setPainted(true), 200);
    });
    return () => {
      cancelAnimationFrame(raf);
      if (idleId !== undefined) w.cancelIdleCallback?.(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  // Pointer tracking, normalised -1..1 (y up), rAF-throttled.
  useEffect(() => {
    let raf = 0;
    let px = 0;
    let py = 0;
    const onMove = (e: PointerEvent) => {
      px = (e.clientX / window.innerWidth) * 2 - 1;
      py = -((e.clientY / window.innerHeight) * 2 - 1);
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          useSceneStore.getState().setPointer(px, py);
        });
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Smooth scroll + scene triggers (re-init when reduced-motion preference flips).
  useEffect(() => {
    const cleanup = initSmoothScroll();
    return cleanup;
  }, [reducedMotion]);

  // Re-scan [data-scene] bands on route change.
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    const lenis = getLenis();
    lenis?.scrollTo(0, { immediate: true });
    const raf = requestAnimationFrame(() => {
      lenis?.resize();
      refreshSceneTriggers();
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  const posterMode = reducedMotion || (tierReady && quality === 0);
  if (posterMode) return <PosterLayer scene={activeScene} />;
  if (!tierReady || !painted) return null;
  return <SceneCanvas />;
}

interface Layer {
  scene: SceneName;
  id: number;
}

/** Fixed full-screen poster stack with a CSS crossfade between scenes. */
function PosterLayer({ scene }: { scene: SceneName }) {
  const [layers, setLayers] = useState<Layer[]>([{ scene, id: 0 }]);
  const nextId = useRef(1);

  useEffect(() => {
    setLayers((prev) => {
      if (prev[prev.length - 1]?.scene === scene) return prev;
      return [...prev.slice(-1), { scene, id: nextId.current++ }];
    });
    const t = window.setTimeout(() => setLayers((prev) => prev.slice(-1)), POSTER_FADE_MS + 50);
    return () => window.clearTimeout(t);
  }, [scene]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-bg">
      <style>{`@keyframes aem-poster-in{from{opacity:0}to{opacity:1}}`}</style>
      {layers.map((l, i) => (
        <div
          key={l.id}
          className="absolute inset-0"
          style={i > 0 ? { animation: `aem-poster-in ${POSTER_FADE_MS}ms cubic-bezier(.22,1,.36,1) both` } : undefined}
        >
          <ScenePoster scene={l.scene} priority={l.id === 0} className="h-full w-full" />
        </div>
      ))}
    </div>
  );
}
