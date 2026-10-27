"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSceneStore } from "@/lib/scene-store";
import { cn } from "@/lib/cn";

const CONFIG = {
  nodes: 8,
  /** Ring radius — must match the HeartbeatRing scene layout (viewport-centred). */
  radius: "min(30vmin, 38vw)",
  /** First node angle in degrees (−90 = 12 o'clock), nodes run clockwise. */
  startAngle: -90,
  reconnectMs: 2000,
  /** How long the RECONNECTED status stays before returning to idle */
  settleMs: 2400,
} as const;

export interface ResilienceRingLabels {
  hubLabel: string;
  nodeAria: string;
  nodePrefix: string;
  states: { idle: string; rerouting: string; reconnected: string };
  instructions: string;
}

type Status = { node: number; phase: "rerouting" | "reconnected" } | null;

const pad = (n: number) => String(n).padStart(2, "0");

/** Focusable HTML overlay for the HeartbeatRing scene: 8 node buttons on a ring around the viewport centre. */
export function ResilienceRing({ labels }: { labels: ResilienceRingLabels }) {
  const [dropped, setDropped] = useState<number[]>([]);
  const [status, setStatus] = useState<Status>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    useSceneStore.getState().setInteraction({ droppedNodes: dropped });
  }, [dropped]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
      useSceneStore.getState().setInteraction({ droppedNodes: [] });
    };
  }, []);

  const drop = useCallback((i: number) => {
    setDropped((d) => (d.includes(i) ? d : [...d, i]));
    setStatus({ node: i, phase: "rerouting" });
    timers.current.push(
      window.setTimeout(() => {
        setDropped((d) => d.filter((n) => n !== i));
        setStatus((s) => (s && s.node === i ? { node: i, phase: "reconnected" } : s));
      }, CONFIG.reconnectMs),
      window.setTimeout(() => {
        setStatus((s) => (s && s.node === i && s.phase === "reconnected" ? null : s));
      }, CONFIG.reconnectMs + CONFIG.settleMs),
    );
  }, []);

  const statusText = status
    ? `${labels.nodePrefix} ${pad(status.node + 1)} // ${
        status.phase === "rerouting"
          ? `${labels.states.rerouting} → ${labels.states.reconnected}`
          : labels.states.reconnected
      }`
    : labels.states.idle;

  return (
    <>
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: `calc(${CONFIG.radius} * 2)`, height: `calc(${CONFIG.radius} * 2)` }}
      >
        {/* hairline ring + hub label, legible without the scene */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full border border-line/70" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border border-line-strong/60 bg-bg/40 px-3 py-2 backdrop-blur-sm [clip-path:polygon(12%_0,88%_0,100%_50%,88%_100%,12%_100%,0_50%)]"
        >
          <span className="t-label block whitespace-nowrap px-2 text-[10px] text-text-dim">{labels.hubLabel}</span>
        </div>

        <ul className="absolute inset-0">
          {Array.from({ length: CONFIG.nodes }).map((_, i) => {
            const a = ((CONFIG.startAngle + (360 / CONFIG.nodes) * i) * Math.PI) / 180;
            const x = 50 + 50 * Math.cos(a);
            const y = 50 + 50 * Math.sin(a);
            const isDown = dropped.includes(i);
            return (
              <li
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <button
                  type="button"
                  aria-label={`${labels.nodeAria} ${i + 1}`}
                  aria-pressed={isDown}
                  onClick={() => drop(i)}
                  className={cn(
                    "t-num group relative flex h-11 w-11 items-center justify-center rounded-full border font-mono text-[11px] transition-[border-color,background-color,color,transform] duration-300 ease-out",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper",
                    isDown
                      ? "scale-90 border-dashed border-text-faint bg-bg/70 text-text-faint"
                      : "border-steel/50 bg-bg/60 text-text hover:scale-110 hover:border-copper hover:text-copper",
                  )}
                >
                  {pad(i + 1)}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-bg",
                      isDown ? "bg-data-red" : "bg-data-green",
                    )}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="absolute inset-x-0 bottom-6 flex justify-center px-4 md:bottom-10">
        <div className="glass flex flex-col items-center gap-1 border border-line px-4 py-3 text-center">
          <p
            role="status"
            aria-live="polite"
            className={cn(
              "t-label text-[11px] transition-colors duration-300",
              status?.phase === "rerouting" ? "text-copper" : status ? "text-data-green" : "text-text-dim",
            )}
          >
            {statusText}
          </p>
          <p className="t-label text-[10px] normal-case tracking-normal text-text-faint">{labels.instructions}</p>
        </div>
      </div>
    </>
  );
}
