"use client";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSceneStore, SCENE_NAMES, type SceneName, type SceneVariant } from "@/lib/scene-store";

let lenis: Lenis | null = null;
let sceneTriggers: ScrollTrigger[] = [];
let tickerFn: ((time: number) => void) | null = null;
let nativeScrollFn: (() => void) | null = null;
let velocityRaf = 0;
let lastY = 0;
let lastT = 0;
let smoothedVelocity = 0;

const isSceneName = (v: string | null | undefined): v is SceneName =>
  !!v && (SCENE_NAMES as string[]).includes(v);

/** Hold smooth scroll while the intro film plays (html[data-intro="play"]), resume when it ends. */
function pauseDuringIntro(instance: Lenis) {
  const html = document.documentElement;
  if (html.getAttribute("data-intro") !== "play") return;
  instance.stop();
  const mo = new MutationObserver(() => {
    if (html.getAttribute("data-intro") === "play") return;
    mo.disconnect();
    instance.start();
  });
  mo.observe(html, { attributes: true, attributeFilter: ["data-intro"] });
}

function readVariant(el: Element): SceneVariant {
  return el.getAttribute("data-scene-variant") === "calm" ? "calm" : "full";
}

function activate(el: Element, progress: number) {
  const name = el.getAttribute("data-scene");
  if (!isSceneName(name)) return;
  const store = useSceneStore.getState();
  const variant = readVariant(el);
  if (store.activeScene !== name || store.variant !== variant) store.setActive(name, variant);
  store.setProgress(progress);
}

/** (Re)build one ScrollTrigger per [data-scene] element. Safe to call repeatedly (route changes). */
export function refreshSceneTriggers(): void {
  if (typeof window === "undefined") return;
  sceneTriggers.forEach((t) => t.kill());
  sceneTriggers = [];
  const els = Array.from(document.querySelectorAll<HTMLElement>("[data-scene]"));
  els.forEach((el) => {
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 60%",
      end: "bottom 40%",
      onToggle: (self) => {
        if (self.isActive) activate(el, self.progress);
      },
      onUpdate: (self) => {
        if (self.isActive) activate(el, self.progress);
      },
    });
    sceneTriggers.push(st);
  });
  // Initial state: pick whichever band is active right now (or the first one on the page).
  const active = sceneTriggers.find((t) => t.isActive);
  if (active && active.trigger) activate(active.trigger, active.progress);
  else if (els[0]) activate(els[0], 0);
  ScrollTrigger.refresh();
}

function trackVelocity(y: number) {
  const now = performance.now();
  const dt = Math.max(1, now - lastT);
  const v = ((y - lastY) / dt) * 16.67; // px per ~frame
  lastY = y;
  lastT = now;
  smoothedVelocity += (v - smoothedVelocity) * 0.2;
  useSceneStore.getState().setScrollVelocity(smoothedVelocity);
}

/** Initialise Lenis (unless reduced motion) + ScrollTrigger. Returns a cleanup fn. */
export function initSmoothScroll(): () => void {
  if (typeof window === "undefined") return () => {};
  gsap.registerPlugin(ScrollTrigger);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  lastY = window.scrollY;
  lastT = performance.now();

  if (!reduced) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", (l: Lenis) => {
      ScrollTrigger.update();
      trackVelocity(l.scroll);
    });
    tickerFn = (time: number) => lenis?.raf(time * 1000);
    gsap.ticker.add(tickerFn);
    pauseDuringIntro(lenis);
    gsap.ticker.lagSmoothing(0);
  } else {
    nativeScrollFn = () => trackVelocity(window.scrollY);
    window.addEventListener("scroll", nativeScrollFn, { passive: true });
  }

  // Decay velocity to 0 when scrolling stops.
  const decay = () => {
    const s = useSceneStore.getState();
    if (performance.now() - lastT > 120 && Math.abs(s.scrollVelocity) > 0.001) {
      smoothedVelocity *= 0.9;
      s.setScrollVelocity(Math.abs(smoothedVelocity) < 0.01 ? 0 : smoothedVelocity);
    }
    velocityRaf = requestAnimationFrame(decay);
  };
  velocityRaf = requestAnimationFrame(decay);

  refreshSceneTriggers();

  return () => {
    cancelAnimationFrame(velocityRaf);
    sceneTriggers.forEach((t) => t.kill());
    sceneTriggers = [];
    if (tickerFn) gsap.ticker.remove(tickerFn);
    tickerFn = null;
    if (nativeScrollFn) window.removeEventListener("scroll", nativeScrollFn);
    nativeScrollFn = null;
    lenis?.destroy();
    lenis = null;
  };
}

/** Access the Lenis instance (null under reduced motion), e.g. for scrollTo from nav. */
export function getLenis(): Lenis | null {
  return lenis;
}
