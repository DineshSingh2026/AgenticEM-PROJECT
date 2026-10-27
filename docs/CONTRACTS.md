# Shared contracts (all agents code against these — do not change signatures)

Spec: docs/MASTER_PROMPT.md. Import alias `@/` = project root. Tailwind v3 with token colours:
`bg, bg-elev, bg-elev-2, line, line-strong, text, text-dim, text-faint, copper, copper-soft, steel, data-blue, data-red, data-green, data-gold, ivory`
(e.g. `bg-bg-elev`, `border-line`, `text-text-dim`, `text-copper/60`). Fonts: `font-display`, `font-sans`, `font-mono`.
Utility classes in app/globals.css: `container-site`, `t-display`, `t-h2`, `t-h3`, `t-body`, `t-label`, `t-num`, `section-pad`, `glass`. Easing: `ease-out` (=cubic-bezier(.22,1,.36,1)).
`cn()` in lib/cn.ts. Token hex values for shaders: `TOKENS` in lib/tokens.ts.

## Copy (content/copy.ts)
`export const copy = { site, home: {...homeA, ...homeB}, pages }`. Owners:
- content/copy/site.ts → `export const site = {...} as const` (nav, footer, cookie banner, briefing form labels/options/success, liveStrip labels, misc) — UI-kit agent
- content/copy/home-a.ts → `export const homeA = { boot, hero, shift, intelligence, architecture, agentCore, roundLifecycle, risk } as const` — Home-A agent
- content/copy/home-b.ts → `export const homeB = { settlement, arena, features, resilience, flywheel, deploy, finalCta, proof: [] } as const` — Home-B agent
- content/copy/pages.ts → `export const pages = { platform, architecture, agents, risk, settlement, arena, operators, developers, trust, insights, company, contact, notFound } as const` — Inner-pages agent
Components never hard-code user-visible copy.

## Simulator (lib/sim) — Sim agent
- types.ts (already written): GameType, NetworkSnapshot, AnomalyRule, Severity, SimEvent, SimEventKind, SimEventOf<K>, SimFeed.
- engine.ts: `export const sim: SimFeed` (singleton; `start()` idempotent, ref-counted is fine). Browser-only timers; safe to import on server (no side effects at import).
- useSimFeed.ts (client):
  - `useSimSnapshot(): NetworkSnapshot` — re-renders every tick (250ms). Starts the sim on mount.
  - `useSimEvents<K>(kind: K, max = 8): SimEventOf<K>[]` — newest-first rolling list.
  - `useSimFeed<K>(kind: K | undefined, fn: (e) => void)` — subscribe callback (stable ref inside). Use in scenes.
- Data JSON files in content/data/* (Sim agent writes them).

## Scene engine — Scenes-1 agent owns engine
- lib/scene-store.ts (written): `useSceneStore` with activeScene, progress, variant, pointer, scrollVelocity, quality, reducedMotion, interaction + setters. `SceneName`, `SCENE_NAMES`.
- components/scenes/shared/useSceneFade.ts (written): `useSceneFade(name) → { opacity: Ref<number>, isVisible() }`.
- Scene component contract: `export function AgentField()` etc. in components/scenes/<Name>.tsx, client, rendered inside the single Canvas by SceneRegistry; no props. Read `variant`/`progress`/`quality`/`interaction` from the store via `useSceneStore.getState()` inside useFrame. Each file has `const CONFIG = {...}` at the top. Shaders in components/scenes/shaders/*.glsl (imported as strings).
- Sections mark their root: `<section data-scene="Convergence" data-scene-variant="calm">`. lib/scroll.ts reads these.
- HTML → scene interactions go through `useSceneStore.getState().setInteraction({...})`. Keys in use:
  - `hoveredCard: 0|1|2|null` (IntelligenceLayer cards → Convergence)
  - `agentPreset: "poker"|"blackjack"|"roulette"|null`, `agentPresetStartedAt: number` (AgentCore → AgentLoop)
  - `droppedNodes: number[]` (Resilience overlay → HeartbeatRing, nodes 0..7)
  - `hoveredSpectator: number|null` (ArenaGraph)
- components/scenes/SceneRoot.tsx: `export function SceneRoot()` client component mounted once in app/layout.tsx. It: detects reduced motion + GPU tier, inits Lenis + ScrollTrigger (lib/scroll.ts), tracks pointer, and loads SceneCanvas via next/dynamic ssr:false after first paint. Tier 0 / reduced motion → renders a fixed full-screen `<ScenePoster scene={activeScene} />` layer instead.

## UI kit (components/ui) — UI-kit agent. Named exports, props exactly:
- `Button({ href?, variant?: "primary"|"ghost", children, className?, type?, onClick?, disabled? })` — renders next/link when href.
- `Eyebrow({ children, className? })` — mono label, copper index part e.g. "03 // INTELLIGENCE_LAYER".
- `SectionHeader({ eyebrow?, title, body?, as?: "h1"|"h2", align?: "left"|"center", className? })`
- `BracketPanel({ children, className?, as?, label? })` — label renders as a mono top label.
- `BlueprintGrid({ className?, cropMarks?: boolean })` — absolute inset-0 decorative layer, aria-hidden.
- `StatTicker({ value: number, format?: "int"|"compact"|"usd"|"ms"|"pct", label: string, className? })` — counts up on enter view then eases between updates.
- `LiveStrip()` — uses useSimSnapshot + copy.site.liveStrip; aria-live="off"; shows "SIMULATED NETWORK".
- `SimLabel({ className? })` — tiny mono "SIMULATED NETWORK" tag with pulsing dot.
- `CompareTable({ columns: [string, string, string], rows: { label: string; a: string; b: string }[] })`
- `FeatureValueTable({ rows: { feature: string; benefit: string; detail: string; chart: number[] }[] })` — accordion with mini bar chart.
- `StepRing({ steps: { index: string; title: string; body: string }[], active?: number, orientation?: "row"|"column" })`
- `AlertRow({ rule: string, severity: "low"|"med"|"high", agentId: string, time: string, score?: number })`
- `Sparkline({ data: number[], className?, color?: string })`
- `CodeTabs({ label?: string, tabs: { lang: string; code: string }[] })`
- `BriefingForm({ variant?: "briefing"|"sandbox", className? })` — react-hook-form + zod, POSTs to /api/briefing, copy from copy.site.briefing.
- `Faq({ items: { q: string; a: string }[] })`
- `CtaBand({ title?, body? })` — section with BriefingForm, used at the end of inner pages.
- `PageHero({ scene: SceneName, eyebrow, title, sub, children? })` — calm-variant hero section with data-scene + data-scene-variant="calm", H1 server-rendered.
- `Nav()`, `Footer()`, `CookieBanner()`, `SkipLink()`
- `ScenePoster({ scene: SceneName, className?, priority? })` — `<picture>` of /posters/<scene>.avif with a CSS gradient + grid fallback if missing (posters may not exist yet: always render a good-looking CSS fallback underneath).
Export everything also from components/ui/index.ts.
