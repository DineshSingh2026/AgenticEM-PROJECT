"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { copy } from "@/content/copy";
import { TIMELINE } from "./film/timeline";
import { FilmEngine, loadFilmAssets, phaseAt, samePhase, statAt, type Phase } from "./film/FilmEngine";

const CONFIG = {
  /** Must match the exit wipe duration in app/globals.css (.intro-root[data-exiting]). */
  exitMs: TIMELINE.exitMs,
};

const t = copy.intro;
const CHAPTER_STARTS = TIMELINE.scenes.filter((s) => "chapter" in s).map((s) => s.start / TIMELINE.durationMs);

/**
 * Runs before hydration: decides whether the film plays. It plays on every homepage load and refresh,
 * except with reduced motion. `?intro=1` forces it, `?intro=0` skips it.
 */
const PREFLIGHT = `(function(){var d=document.documentElement;try{var q=new URLSearchParams(location.search).get('intro');var rm=matchMedia('(prefers-reduced-motion: reduce)').matches;d.setAttribute('data-intro',q!=='1'&&(rm||q==='0')?'skip':'play')}catch(e){d.setAttribute('data-intro','skip')}})();`;

/** Masked line: content slides up from behind a clip. `i` staggers the line. */
function Line({ i, className, children }: { i: number; className?: string; children: ReactNode }) {
  return (
    <span className={`intro-line ${className ?? ""}`}>
      <span className="intro-line-in" style={{ "--i": i } as CSSProperties}>
        {children}
      </span>
    </span>
  );
}

export function IntroFilm() {
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "logo" });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const exitingRef = useRef(false);
  const pathname = usePathname();

  const finish = useCallback(() => {
    document.documentElement.setAttribute("data-intro", "done");
    window.scrollTo(0, 0);
    setDone(true);
  }, []);

  const exit = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setExiting(true);
    window.setTimeout(finish, CONFIG.exitMs);
  }, [finish]);

  useEffect(() => {
    if (document.documentElement.getAttribute("data-intro") !== "play") {
      setDone(true);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Debug seek (only with ?intro=1): `introAt=<ms>` starts there, `introFreeze=1` holds that frame.
    const q = new URLSearchParams(window.location.search);
    const debug = q.get("intro") === "1";
    const startAt = debug ? Math.min(TIMELINE.durationMs, Math.max(0, Number(q.get("introAt")) || 0)) : 0;
    const freeze = debug && q.get("introFreeze") === "1";

    let engine: FilmEngine | null = null;
    let cancelled = false;
    let raf = 0;
    let last = 0;
    let time = startAt;
    let current: Phase = { kind: "logo" };
    let lastStat = "";

    const fit = () => engine?.resize(window.innerWidth, window.innerHeight);

    const loop = (now: number) => {
      // Advance by frame delta (capped) so a background tab pauses the film instead of skipping it.
      if (!freeze) time += last ? Math.min(100, now - last) : 0;
      last = now;
      engine?.render(Math.min(time, TIMELINE.durationMs));

      const ph = phaseAt(time);
      if (!samePhase(ph, current)) {
        current = ph;
        setPhase(ph);
      }
      const stat = statAt(time);
      if (stat && statRef.current && (stat !== lastStat || statRef.current.textContent !== stat)) {
        lastStat = stat;
        statRef.current.textContent = stat;
      }
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${Math.min(1, time / TIMELINE.durationMs)})`;

      if (!freeze && time >= TIMELINE.durationMs - TIMELINE.exitMs) {
        exit();
        if (time >= TIMELINE.durationMs) return;
      }
      raf = requestAnimationFrame(loop);
    };

    // Keep the SSR black overlay until images are decoded and fonts are ready.
    loadFilmAssets().then(
      (assets) => {
        if (cancelled) return;
        try {
          engine = new FilmEngine(canvas, assets);
        } catch {
          finish();
          return;
        }
        fit();
        current = phaseAt(time);
        setPhase(current);
        setReady(true);
        raf = requestAnimationFrame(loop);
      },
      () => {
        if (!cancelled) finish();
      },
    );

    window.addEventListener("resize", fit);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exit();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      engine?.destroy();
      window.removeEventListener("resize", fit);
      window.removeEventListener("keydown", onKey);
    };
  }, [finish, exit]);

  // Plays only when a visit lands on the homepage.
  if (done || pathname !== "/") return null;

  const chapter = phase.kind === "chapter" ? phase.index : -1;
  const leaving = phase.kind === "chapter" && phase.leaving;
  const ch = chapter >= 0 ? t.chapters[chapter] : null;
  const total = String(t.chapters.length).padStart(2, "0");

  return (
    <div
      id="aem-intro"
      role="dialog"
      aria-modal="true"
      aria-label={t.ariaLabel}
      className="intro-root fixed inset-0 z-[1000] text-text"
      data-ready={ready || undefined}
      data-exiting={exiting || undefined}
    >
      <script dangerouslySetInnerHTML={{ __html: PREFLIGHT }} />
      <p className="sr-only">{t.srSummary}</p>

      <div className="intro-stage absolute inset-0 overflow-hidden bg-[#07080A]">
        <canvas ref={canvasRef} aria-hidden="true" className="intro-canvas absolute inset-0 h-full w-full" />

        {/* Letterbox bars */}
        <div aria-hidden="true" className="intro-bar intro-bar-top absolute inset-x-0 top-0 bg-black" />
        <div aria-hidden="true" className="intro-bar intro-bar-bottom absolute inset-x-0 bottom-0 bg-black" />

        {/* Top row inside the upper bar */}
        <div className="intro-top absolute inset-x-0 top-0 flex items-center justify-between px-4 md:px-[6vw]">
          <span aria-hidden="true" className={`intro-brand flex items-center gap-3 ${phase.kind === "logo" ? "" : "is-on"}`}>
            <Image src="/brand/agentium-emblem.png" alt="" width={294} height={188} unoptimized className="h-6 w-auto md:h-7" />
            <Image src="/brand/agentium-wordmark.png" alt="" width={426} height={60} unoptimized className="h-[10px] w-auto md:h-3" />
          </span>
          <button
            type="button"
            onClick={exit}
            autoFocus
            className="intro-skip t-label flex items-center gap-3 border border-white/15 px-3 py-2 text-text-dim transition-colors duration-300 ease-out hover:border-[#E8B65A]/70 hover:text-text"
          >
            {t.skip}
            <span className="hidden text-text-faint md:inline">{t.skipHint}</span>
          </button>
        </div>

        {/* Chapter titles */}
        {ch && (
          <div
            key={chapter}
            aria-hidden="true"
            className="intro-chapter absolute left-4 right-4 md:left-[6vw] md:right-auto md:max-w-[60vw]"
            data-leaving={leaving || undefined}
          >
            <Line i={0} className="t-label text-text-faint">
              <span className="intro-gold">{String(chapter + 1).padStart(2, "0")}</span>
              <span className="intro-rule" />
              {total}
            </Line>
            <h2 className="intro-title mt-4 font-display text-[clamp(40px,6vw,96px)] font-semibold leading-[0.98]">
              <Line i={1}>{ch.title}</Line>
            </h2>
            <Line i={2} className="intro-sub mt-4 font-mono text-[11px] uppercase text-text-dim md:text-xs">
              {ch.sub}
            </Line>
          </div>
        )}

        {/* Live stat */}
        {ch && (
          <div key={`s${chapter}`} aria-hidden="true" className="intro-stat absolute right-4 text-right md:right-[6vw]" data-leaving={leaving || undefined}>
            <Line i={1} className="t-label text-text-faint">
              {ch.statLabel}
            </Line>
            <Line i={2} className="mt-1">
              <span ref={statRef} className="t-num block text-[clamp(26px,3.4vw,52px)] leading-none text-text">
                0
              </span>
            </Line>
            <Line i={3} className="t-label mt-2 text-[10px] text-text-faint">
              <span className="flex items-center justify-end gap-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-data-green" />
                {t.simLabel}
              </span>
            </Line>
          </div>
        )}

        {/* Outro headline under the canvas lockup */}
        {phase.kind === "outro" && (
          <div aria-hidden="true" className="intro-outro absolute inset-x-4 flex flex-col items-center text-center">
            <div className="max-w-[24ch] font-display text-[clamp(22px,2.5vw,38px)] font-semibold leading-[1.1] tracking-[-0.02em]">
              <Line i={0}>{t.outro.title}</Line>
            </div>
            <Line i={1} className="t-label mt-4 text-[11px] text-[#E8B65A]/80">
              {t.outro.sub}
            </Line>
          </div>
        )}

        {/* Progress inside the lower bar */}
        <div aria-hidden="true" className="intro-progress absolute inset-x-4 h-px bg-white/10 md:inset-x-[6vw]">
          <div ref={progressRef} className="intro-progress-fill h-full origin-left scale-x-0" />
          {CHAPTER_STARTS.map((x) => (
            <span key={x} className="absolute top-[-2px] h-[5px] w-px bg-white/25" style={{ left: `${x * 100}%` }} />
          ))}
        </div>
      </div>

      {/* Exit wipe: a horizontal slit with gold edges closes onto a line of light. */}
      <div aria-hidden="true" className="intro-edge intro-edge-top" />
      <div aria-hidden="true" className="intro-edge intro-edge-bottom" />
      <div aria-hidden="true" className="intro-flare" />
    </div>
  );
}
