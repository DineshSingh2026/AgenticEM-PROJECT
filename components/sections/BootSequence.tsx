"use client";

import { useEffect, useState } from "react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";

const CONFIG = {
  storageKey: "agem.boot.v1",
  totalMs: 1200,
  fadeMs: 300,
  charMs: 9,
  lineGapMs: 60,
  gridMs: 520,
  nodesAtMs: 420,
} as const;

/** Hexagon node positions (percent of viewport) around the centre. */
const NODES = [
  { x: 38, y: 40 },
  { x: 62, y: 40 },
  { x: 38, y: 60 },
  { x: 62, y: 60 },
];

type Phase = "hidden" | "running" | "fading" | "done";

function shouldPlay(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    if (window.sessionStorage.getItem(CONFIG.storageKey)) return false;
    window.sessionStorage.setItem(CONFIG.storageKey, "1");
  } catch {
    // Storage blocked: play once per page load.
  }
  return true;
}

export function BootSequence() {
  const lines = copy.home.boot.lines;
  const [phase, setPhase] = useState<Phase>("hidden");
  const [typed, setTyped] = useState<number>(0);
  const [nodes, setNodes] = useState(false);

  useEffect(() => {
    if (!shouldPlay()) {
      setPhase("done");
      return;
    }
    setPhase("running");
    const timers: number[] = [];
    const totalChars = lines.reduce((n, l) => n + l.length, 0);
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      const chars = Math.min(totalChars, Math.floor(elapsed / CONFIG.charMs));
      setTyped(chars);
      if (chars < totalChars) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    timers.push(window.setTimeout(() => setNodes(true), CONFIG.nodesAtMs));
    timers.push(window.setTimeout(() => setPhase("fading"), CONFIG.totalMs - CONFIG.fadeMs));
    timers.push(window.setTimeout(() => setPhase("done"), CONFIG.totalMs));
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [lines]);

  if (phase === "hidden" || phase === "done") return null;

  let remaining = typed;
  const visible = lines.map((line) => {
    const n = Math.max(0, Math.min(line.length, remaining));
    remaining -= line.length;
    return line.slice(0, n);
  });

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-bg/90 transition-opacity duration-300 ease-out",
        phase === "fading" ? "opacity-0" : "opacity-100",
      )}
    >
      {/* Blueprint grid drawing out from the centre */}
      <div
        className="absolute inset-0 origin-center"
        style={{
          backgroundImage:
            "linear-gradient(rgb(var(--text-rgb) / 0.06) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--text-rgb) / 0.06) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          backgroundPosition: "center center",
          animation: `agem-boot-grid ${CONFIG.gridMs}ms cubic-bezier(0.22,1,0.36,1) both`,
        }}
      />
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-copper/30" />
      <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-copper/30" />

      {NODES.map((n, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className="absolute h-5 w-5 transition-[opacity,transform] duration-200 ease-out"
          style={{
            left: `${n.x}%`,
            top: `${n.y}%`,
            opacity: nodes ? 1 : 0,
            transform: `translate(-50%, -50%) scale(${nodes ? 1 : 0.4})`,
            transitionDelay: `${i * 60}ms`,
          }}
        >
          <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="none" stroke="#ECEEF1" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="2" fill="#ECEEF1" />
        </svg>
      ))}

      <div className="relative z-10 px-4 font-mono text-[12px] tracking-[0.08em] text-text-dim md:text-[13px]">
        {visible.map((line, i) => (
          <p key={i} className={cn("min-h-[1.6em] whitespace-pre-wrap", i === 0 && "text-copper")}>
            {line}
            {line.length < lines[i].length && line.length > 0 && <span className="text-text">▍</span>}
          </p>
        ))}
      </div>

      <style>{`@keyframes agem-boot-grid { from { transform: scale(0); opacity: 0 } to { transform: scale(1); opacity: 1 } }`}</style>
    </div>
  );
}
