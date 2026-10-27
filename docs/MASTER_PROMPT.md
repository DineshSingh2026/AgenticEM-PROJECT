You are a senior creative developer, WebGL/shader engineer and product designer. Build the complete marketing website for AGENTIC EM, the company behind Casino Verse OS, "the AI operating system for the autonomous gaming economy". The audience is licensed casino and iGaming operators (B2B), plus investors and technical partners. The quality bar is an Awwwards Site of the Day: cinematic, data-driven background animation, flawless typography, fast, accessible.

==================================================
1. NON-NEGOTIABLE RULES
==================================================
- All marketing copy lives in content/copy.ts as one typed object. Components never hard-code copy.
- One fixed full-screen React Three Fiber <Canvas> behind the whole site. Never mount a second Canvas. Sections declare data-scene="<SceneName>" and scenes cross-fade.
- Every live number comes from the seeded simulator in lib/sim and carries a small mono label "SIMULATED NETWORK".
- Hero H1 is server-rendered HTML and is the LCP element. WebGL loads after first paint (next/dynamic, ssr:false).
- prefers-reduced-motion: every scene is replaced by its AVIF poster; scroll pinning is disabled.
- WCAG 2.2 AA. Canvas is aria-hidden; every scene's meaning also exists as text.
- B2B only. Never use consumer gambling language ("play now", "win big", "bonus", "jackpot", player sign-up).
- No unprovable claims. Banned words: "zero latency", "infinite/infinitely", "guaranteed/guarantees", "inevitable", "billions of agents". Use "sub-second", "designed to scale horizontally", "enforces", "we expect".
- TypeScript strict, small components, named exports (except Next.js pages/layouts), shaders in .glsl files, every scene's tunables in a CONFIG object at the top of its file.

==================================================
2. STACK
==================================================
Next.js (App Router), TypeScript strict, Tailwind CSS with CSS-variable tokens, three, @react-three/fiber, @react-three/drei, @react-three/postprocessing, gsap (+ ScrollTrigger), lenis, zustand, motion (Framer Motion, small UI transitions only), detect-gpu, react-hook-form, zod, @hookform/resolvers, resend, @next/mdx, troika-three-text (via drei Text). .glsl/.vert/.frag import as strings. Fonts via next/font: Inter Tight, Inter, JetBrains Mono. Deploy target: Vercel.

==================================================
3. FOLDER STRUCTURE
==================================================
app/
  page.tsx (homepage), platform/page.tsx, platform/architecture/page.tsx, platform/agents/page.tsx, platform/risk/page.tsx, platform/settlement/page.tsx, platform/arena/page.tsx, operators/page.tsx, developers/page.tsx, trust/page.tsx, insights/page.tsx + insights/[slug]/page.tsx (MDX), company/page.tsx, contact/page.tsx, legal/[slug]/page.tsx (MDX: terms, privacy, cookies, responsible-gaming, disclaimer), api/briefing/route.ts, layout.tsx, not-found.tsx, opengraph-image.tsx, sitemap.ts, robots.ts, globals.css
components/ui/        Nav, Button, Eyebrow, SectionHeader, BracketPanel, BlueprintGrid, StatTicker, LiveStrip, CompareTable, FeatureValueTable, StepRing, AlertRow, CodeTabs, BriefingForm, Footer, CookieBanner, ScenePoster
components/sections/  BootSequence, Hero, Shift, IntelligenceLayer, Architecture, AgentCore, RoundLifecycle, RiskIntel, Settlement, Arena, FeaturesValue, Resilience, Flywheel, Deploy, FinalCta
components/scenes/    SceneCanvas, SceneRegistry, AgentField, VolumeBreak, Convergence, ExplodedStack, AgentLoop, Turbine, AnomalyStream, Ledger, ArenaGraph, SplitWorld, HeartbeatRing, FlywheelScene, shared/GridPass, shared/Post
components/scenes/shaders/*.glsl
lib/sim/              types.ts, seed.json, prng.ts, engine.ts, useSimFeed.ts
lib/                  scene-store.ts, scroll.ts, gpu-tier.ts, cn.ts
content/              copy.ts, data/volume-series.json, data/reasoning-traces.json, data/risk-radar.json, data/features.json, data/regions.json, insights/*.mdx, legal/*.mdx
public/posters/*.avif, public/models/*.glb, public/textures/*.ktx2
middleware.ts         (security headers)

==================================================
4. DESIGN SYSTEM
==================================================
Aesthetic: "engineering blueprint after dark". Graphite surfaces, hairline grids, monospace system labels, copper as the only warm accent. Casino data colours (blue, red, green, gold) are used ONLY to carry data meaning.

Colour tokens (CSS variables in globals.css, mapped in Tailwind):
--bg #0B0D10 | --bg-elev #13161B | --bg-elev-2 #1B1F26 | --line #262B33 | --line-strong #3A414C
--text #ECEEF1 | --text-dim #9AA3AF | --text-faint #5D6672
--copper #C9825B | --copper-soft #E2A985 | --steel #7FA3C6
--data-blue #2F6FEB (agents, operations) | --data-red #E5484D (risk, alerts) | --data-green #30A46C (healthy, confirmed, revenue) | --data-gold #F5B544 (wallets, highlights)
--ivory #F4F1EA (optional light sections)

Typography:
Display H1: Inter Tight 600, tracking -0.03em, 88px desktop / 44px mobile, line-height 1.0
H2: Inter Tight 600, tracking -0.02em, 56 / 32px
H3: Inter Tight 500, 28 / 22px
Body: Inter 400, 18 / 16px, line-height 1.6, max 64ch
System labels and all numbers: JetBrains Mono 400-500, 12-14px, uppercase labels, tracking 0.08em, font-variant-numeric: tabular-nums

Grid and spacing: 12 columns, 1280px max content, 24px gutters, 16px mobile side gutter. Spacing scale 4 8 12 16 24 32 48 64 96 128 160. Section padding 160px desktop / 96px mobile.

Signature details:
- BlueprintGrid: 1px lines at 6% opacity on 80px cells, with crop marks (12px L-shapes) at section corners.
- BracketPanel: 1px --line border plus 8px copper L-brackets on top-left and bottom-right corners.
- Eyebrows in mono: "03 // INTELLIGENCE_LAYER".
- Numbers count up on enter-view, then ease between live updates.
- Brushed metal and copper appear only in 3D objects, never as flat UI gradients.

Motion: UI easing cubic-bezier(0.22,1,0.36,1), 200-600ms. Scroll scenes are scrubbed, not timed. One hero motion per viewport. Only mono boot strings animate letter by letter.

Buttons: primary = copper fill, #0B0D10 text, 48px tall, 20px x-padding, 2px radius, hover --copper-soft plus a 1px outer glow. Ghost = 1px --line-strong border, --text. Focus ring: 2px copper, 2px offset.

==================================================
5. SCENE ENGINE
==================================================
- SceneCanvas: fixed, inset 0, z-index 0, dpr [1, 1.75], gl { antialias:false, powerPreference:'high-performance' }, aria-hidden. frameloop pauses when document.hidden.
- scene-store (zustand): activeScene, nextScene, progress (0-1 within the active band), pointer {x,y} normalised, quality (0|1|2), reducedMotion.
- scroll.ts: Lenis smooth scroll driving ScrollTrigger. For each [data-scene] section create a ScrollTrigger (start "top 60%", end "bottom 40%") that sets activeScene and progress.
- SceneRegistry mounts all scenes once. Each scene receives uOpacity animated toward 1 when active and 0 otherwise (400ms). Invisible scenes return early in useFrame.
- gpu-tier.ts: detect-gpu. tier 0 → no Canvas, posters only. tier 1 → half particle counts, no bloom. tier 2+ → full.
- Shared GridPass: screen-space blueprint grid with crop marks drawn over every scene at 5% opacity.
- Shared Post: selective Bloom (luminanceThreshold 0.85, intensity 0.6, only copper/emissive), Noise 0.03, Vignette (offset 0.3, darkness 0.7).
- Shared noise: simplex 3D and curl noise GLSL modules.
- Pass all colours to shaders as uniforms built from the token hex values.

==================================================
6. THE SCENES
==================================================
AgentField (hero, also /platform/agents calm variant)
GPGPU particles, 256x256 FBO ping-pong (65,536 agents; 16,384 on tier 1). Positions advect through a slow curl-noise field (frequency 0.35, speed 0.04) in a flattened volume over the grid. Point size 1.2-2.4px, colour --steel at 55% with additive blending. On every sim "round.settled" event pick a random particle: flash it --copper for 600ms and spawn a short trail toward screen centre. Pointer acts as a soft gravity well (radius 0.25, strength 0.6). Mobile: deviceorientation tilts the field ±6°. Camera drifts on a 40s sine loop.

VolumeBreak (Shift band, pinned 200vh)
Instanced line strips. One smooth white line (human volume, from volume-series.json "human") runs left to right. A uSplit uniform driven by scroll progress: at the midpoint the line fractures into 1,500 sub-lines in --copper and --steel that fan upward exponentially (from "agent"). Scrolling back reassembles it. Axis labels in mono: "HUMAN GAMING VOLUME" and "AUTONOMOUS AGENT VOLUME".

Convergence (Intelligence layer band, /platform hero)
About 600 CatmullRom tube curves. Left third: chaotic white strands. Centre: a rotating cube (graphite body, MeshTransmissionMaterial glass top plate, copper edge lines, engraved "CASINO VERSE OS" via drei Text). Right third: ordered parallel lines that split into 3 bundles aligned to the 3 output cards. A dash-flow shader moves light along every tube. Hovering a card raises its bundle's brightness 2x and dims the others to 40%.

ExplodedStack (Architecture band, pinned 300vh)
Four slabs from top: frosted glass (Real-time analytics and intelligence), copper lattice (Autonomous agent capabilities), steel blue plate (AI gaming infrastructure), graphite base with heat-sink fins (Transaction and platform infrastructure). Start stacked; as progress goes 0→1 the slabs separate vertically one at a time and an SVG leader line draws to each HTML label. Small emissive packet sprites rise continuously through the layers. At the end the camera orbits 25°.

AgentLoop (Agent core band)
A ring split into 4 quadrants: Assess state (red), Calculate (blue), Evaluate (green), Execute (gold). Background particles slow and orbit the ring. When a preset is chosen, quadrants light in sequence (900ms each) and the reasoning trace types out in a mono panel.

Turbine (Round lifecycle band, pinned 250vh)
A metal ring with an inner rotating blade assembly (instanced blades). One glowing copper token travels the ring and stops at each of 5 steps as progress passes 0.2, 0.4, 0.6, 0.8, 1.0; the matching HTML step card expands.

AnomalyStream (Risk band, /platform/risk hero)
A full-width waveform shader of 3 layered noise lines scrolling right to left. Copper spikes rise where sim "anomaly.detected" events arrive (height by score; red tint for high severity). A frosted horizontal band labelled "STREAMING ANALYTICS & ML FILTER" (HTML with backdrop-filter, positioned over the canvas) "catches" each spike: a triangle marker appears above it and an AlertRow slides into the alert list.

Ledger (Settlement band, /platform/settlement and /trust heroes)
Instanced graphite blocks link left to right along X with copper connectors. Each sim "block.confirmed" event adds a block: its 64-hex hash types out in mono (drei Text), then the block gets a copper edge glow and the chain shifts left. A side panel lists Pending → Confirmed.

ArenaGraph (Arena band)
5 blue agent nodes in a pentagon, fully connected, exchanging pulses along edges on sim "match.event". 32 green spectator nodes orbit on two rings; when a pulse lands, nearby spectators brighten. Hovering a spectator draws its line to the agents.

HeartbeatRing (Resilience band, /developers hero)
8 agent nodes on a ring around a central octagonal "Gaming Service". Each spoke carries an ECG-style pulse line. Clicking a node drops it (greys out, spoke flatlines, neighbours reroute); it reconnects after 2s with a copper flash. Keyboard: nodes are focusable via an HTML overlay.

FlywheelScene (Flywheel band, /company hero)
Brushed-steel wheel split into 4 segments with copper seams: Machine-speed execution → Real-time capture → Operational intelligence → Format evolution. Rotation speed follows scroll velocity (clamped).

SplitWorld (Final CTA, /operators and /contact heroes)
A fullscreen plane mixing two textures: left a cool data-centre aisle, right a warm blurred casino floor. The seam is an animated vertical band of data noise and copper sparks; pointer X moves the seam ±8%. Until real textures exist, use procedural placeholders (rack grid with blinking LEDs; warm bokeh field).

Inner-page heroes reuse these scenes with variant="calm": 40% density, 50% speed, no pointer interaction.

==================================================
7. SIMULATOR (lib/sim)
==================================================
types.ts:
type GameType = "poker" | "blackjack" | "roulette" | "baccarat" | "dice"
interface NetworkSnapshot { ts:number; activeAgents:number; roundsPerSec:number; settlements24h:number; anomaliesFlagged24h:number; medianDecisionMs:number; ggr24hUsd:number; holdPct:number }
type AnomalyRule = "Unusual betting pattern" | "Multiple login attempts" | "Collusion signal" | "Velocity spike" | "Wallet mismatch" | "Bot fingerprint drift"
type SimEvent =
 | { kind:"round.settled"; id:string; game:GameType; stakeUsd:number; payoutUsd:number; agentIds:string[]; ms:number }
 | { kind:"anomaly.detected"; id:string; severity:"low"|"med"|"high"; rule:AnomalyRule; agentId:string; score:number }
 | { kind:"block.confirmed"; height:number; hash:string; txCount:number }
 | { kind:"match.event"; matchId:string; from:string; to:string; action:"raise"|"call"|"fold"|"hit"|"stand" }

seed.json:
{ "seed":20261027, "tickMs":250,
  "baseline":{ "activeAgents":1284000, "roundsPerSec":18400, "settlements24h":13350000, "anomaliesFlagged24h":278, "medianDecisionMs":42, "ggr24hUsd":153700, "holdPct":2.3 },
  "drift":{ "activeAgents":0.004, "roundsPerSec":0.03, "medianDecisionMs":0.05 },
  "gameMix":{ "poker":0.34, "blackjack":0.26, "roulette":0.2, "baccarat":0.12, "dice":0.08 },
  "anomalyRatePerMin":3.2, "severityMix":{ "low":0.62, "med":0.3, "high":0.08 },
  "blockIntervalMs":2400, "regions":["EU","UK","MT","CW","LATAM","APAC","NA"] }

engine.ts rules:
1. mulberry32 seeded PRNG (prng.ts) so every visitor sees the same believable pattern.
2. Each tick, random-walk every metric with Ornstein-Uhlenbeck mean reversion to baseline (theta 0.05, sigma = drift value).
3. Daily seasonality on roundsPerSec: ±18%, peak 21:00 UTC.
4. Emit round.settled at a visible rate of 6-12/s sampled from gameMix; stake 5-500 USD log-uniform; payout per game house edge (poker rake 5%, blackjack 0.5%, roulette 2.7%, baccarat 1.06%, dice 1%).
5. Emit anomaly.detected as a Poisson process at anomalyRatePerMin with severityMix; score 0.55-0.99.
6. Emit block.confirmed every blockIntervalMs with a random 64-hex hash and 40-400 txs; height starts at 4,812,300.
7. Emit match.event 2-4/s between agt_01..agt_05.
8. API: start(), stop(), getSnapshot(), subscribe(kind, fn) → unsubscribe. useSimFeed(kind?) hook wraps it. Structure it so a WebSocket client at NEXT_PUBLIC_FEED_URL with the same interface can replace it later.

content/data files:
- volume-series.json: { "human": 120 points of a smooth gently rising wave (values 10-30), "agent": 120 points exponential 30→2000 with noise }
- risk-radar.json: 7 rows { label, pct, spark[12] }: Exposure by table 35.8, Agent concentration 13.8, Wallet velocity 7.6, Collusion score 2.8, Promo abuse 1.5, Latency SLA breach 1.0, Settlement backlog 0.6
- regions.json: weights per region for a small heat-map tile
- features.json: the 5 feature rows in section 8, each with { feature, benefit, detail, chart:number[8] }
- reasoning-traces.json:
[
 { "preset":"poker", "label":"Poker · Turn decision",
   "state":"Turn. Hero A♠ K♠. Board Q♠ 7♦ 2♠ 9♣. Pot 240. To call 80.",
   "steps":[
    {"phase":"assess","text":"Flush draw plus two overcards. Villain c-bet 3 of last 4 hands."},
    {"phase":"calculate","text":"15 outs → equity ≈ 33%. Pot odds 80 / 320 = 25%."},
    {"phase":"evaluate","text":"Equity exceeds the 25% required. Moderate fold equity on the river."},
    {"phase":"execute","text":"CALL 80 · 38 ms · logged to ledger"} ] },
 { "preset":"blackjack", "label":"Blackjack · Index play",
   "state":"Hard 16 vs dealer 10. True count +3. Bet 50. No surrender.",
   "steps":[
    {"phase":"assess","text":"Hard 16 against a 10. Surrender unavailable at this table."},
    {"phase":"calculate","text":"Hit and stand EV both ≈ −0.54 at neutral count. Stand index = 0."},
    {"phase":"evaluate","text":"True count +3 is above the stand index."},
    {"phase":"execute","text":"STAND · 31 ms · logged to ledger"} ] },
 { "preset":"roulette", "label":"Roulette · Risk-limited play",
   "state":"European single-zero wheel. Bankroll 1,000. Session loss limit 200.",
   "steps":[
    {"phase":"assess","text":"1,240 spins logged. No wheel bias detected (chi-square p = 0.41)."},
    {"phase":"calculate","text":"House edge 2.70% on every bet type (1/37)."},
    {"phase":"evaluate","text":"No positive-EV bet exists. Policy: minimum flat stake inside the loss limit."},
    {"phase":"execute","text":"BET 10 ON RED · 12 ms · loss limit 0 / 200"} ] }
]

==================================================
8. HOMEPAGE (content/copy.ts → components/sections)
==================================================
Section min-heights: Shift 200vh, Architecture 300vh, RoundLifecycle 250vh, others auto. Each section root has data-scene.

00 BootSequence (max 1.2s, once per session, skipped for reduced motion)
Mono lines typed: "SEQ_01 // INIT_CASINO_VERSE_OS // LIVE" → "agents: syncing…  ledger: ok  risk_engine: ok". Grid draws from centre, 4 white hexagon nodes snap in. Scene: AgentField fades in.

01 Hero (data-scene="AgentField")
Eyebrow: AGENTIC EM · CASINO VERSE OS
H1: The operating system for the agentic casino economy.
Sub: Infrastructure for licensed operators to run, monitor and settle AI-agent gameplay at machine speed, and turn every round into operational intelligence.
CTAs: [Request an operator briefing] (primary → /contact) · [Explore the architecture] (ghost → /platform/architecture)
Footnote (mono, faint): For licensed operators.
LiveStrip: ROUNDS / SEC · ACTIVE AGENTS · SETTLEMENTS (24H) · ANOMALIES FLAGGED (24H) · MEDIAN DECISION — label "SIMULATED NETWORK".

02 Shift (data-scene="VolumeBreak")
Eyebrow: 02 // THE_SHIFT
H2: Millions of autonomous agents are entering the casino.
Body: When non-human players act at machine speed, every move becomes structured, actionable data. Gaming volume stops being linear.
CompareTable (Human games | Agentic games):
Speed: Human-paced | Machine-speed execution
Decision making: Emotional, intuitive | Calculated, reasoned
Volume: Linear scale | Exponential scale
Data: Fragmented, siloed | Every move structured
Infrastructure: Traditional server architecture | Casino Verse OS

03 IntelligenceLayer (data-scene="Convergence")
Eyebrow: 03 // INTELLIGENCE_LAYER
H2: The intelligence layer for autonomous gaming economies.
Body: Casino Verse captures, synchronises and analyses game-state data in real time, giving licensed operators the AI operating system to power, monitor and scale AI-driven gaming.
Cards: 1 Operational performance — Live throughput, table utilisation and agent activity across every game. · 2 Real-time risk monitoring — Exposure, anomalies and suspicious behaviour flagged as it happens. · 3 Profitability analytics — Hold, revenue and margin by game, region and agent cohort.

04 Architecture (data-scene="ExplodedStack")
Eyebrow: 04 // ARCHITECTURE
H2: A unified stack built for machine-speed execution.
Layer labels:
Real-time analytics and intelligence — Structured gameplay data, performance tracking, profitability metrics.
Autonomous agent capabilities — Agent evaluation, reasoning, agent-to-agent interaction.
AI gaming infrastructure — Gaming engines, game-state delivery, high-volume execution.
Transaction and platform infrastructure — Identity, authentication, wallet integration, on-chain settlement.
Foundations row (3 BracketPanels):
High-speed deterministic computing — Processes every bet, settlement, wallet movement and financial calculation with sub-second latency.
Streaming analytics and machine learning — Calculates risk exposure, detects anomalies and monitors performance continuously.
Specialised AI agents and LLM reasoning — Interprets data, investigates suspicious activity, recommends interventions and automates approved workflows.

05 AgentCore (data-scene="AgentLoop")
Eyebrow: 05 // AGENT_CORE
H2: Agents that reason, not scripts that follow.
Left panel (dimmed orange flowchart): START → IF CONDITION A → ACTION B / IF CONDITION C → ACTION D → STOP, caption "Predefined scripts. Rigid execution."
Right: Agent Core loop — Assess state: ingests real-time game state and opponent data. Calculate: computes pot odds and probability matrices. Evaluate: cross-references calculations with adaptable strategies. Execute: makes an independent, non-scripted decision at machine speed.
Interactive: 3 preset chips (Poker, Blackjack, Roulette) from reasoning-traces.json; trace panel labelled "ILLUSTRATIVE TRACE".

06 RoundLifecycle (data-scene="Turbine")
Eyebrow: 06 // ROUND_LIFECYCLE
H2: Every game round becomes structured operational data.
Steps: 01 Trigger — Game-state delivery. 02 Compute — Agent reasoning and evaluation. 03 Action — Independent decision or bet. 04 Settlement — On-chain transaction processing. 05 Insight — Real-time event capture and analytics.

07 RiskIntel (data-scene="AnomalyStream")
Eyebrow: 07 // RISK_RADAR
H2: Real-time operational intelligence and risk mitigation.
Body: Streaming analytics and machine learning flag suspicious activity the moment it appears. Specialised agents investigate, explain and recommend interventions for human approval.
Dashboard (BracketPanels, live from sim + risk-radar.json): Calculated risk exposure (bars + sparklines) · Suspicious activity flagged (count + list of AlertRows: rule, severity dot, agent id, time) · Automated interventions approved · Anomaly stream (the scene itself).

08 Settlement (data-scene="Ledger")
Eyebrow: 08 // SETTLEMENT
H2: Every settlement, traced.
Body: End-to-end identity management, wallet integration and blockchain-based settlement workflows built for autonomous agents.
Stack: Identity and authentication → Wallet integrations → On-chain transaction capabilities. Live panel: latest block height, tx count, Pending / Confirmed list.

09 Arena (data-scene="ArenaGraph")
Eyebrow: 09 // ARENA
H2: New gaming formats people want to watch.
Body: Agent-to-agent competitions, live-game sharing, spectator modes and chat integration turn autonomous gameplay into an observable event for operator communities.
Chips: Agent-to-agent competition · Spectator modes · Live-game sharing · Chat integration

10 FeaturesValue (data-scene="Convergence", calm)
Eyebrow: 10 // PLATFORM_VALUE
H2: Platform features, measured in business value.
FeatureValueTable rows (click to expand detail + mini chart):
High-volume game execution → Run and analyse substantially more game activity.
Real-time gameplay event capture → Instant visibility into game activity and financial performance.
Analytics for risk and profitability → Better-informed, data-backed operational decisions.
Identity, authentication and wallets → Secure transaction workflows and controlled ecosystem access.
Spectator, chat and live sharing → New community interaction and engagement.

11 Resilience (data-scene="HeartbeatRing")
Eyebrow: 11 // RESILIENCE
H2: Built to stay connected.
Body: Stateless APIs, active reconnection routines and continuous synchronisation keep millions of agents and gaming services in step. Try it: drop a node.
Mono status box: PROTOCOL: STATELESS APIs · STATUS: ACTIVE RECONNECTION · TELEMETRY: CONTINUOUS SYNC

12 Flywheel (data-scene="FlywheelScene")
Eyebrow: 12 // FLYWHEEL
H2: The agentic intelligence flywheel.
1 Machine-speed execution — agents play continuously. 2 Real-time capture — gameplay becomes structured data. 3 Operational intelligence — analytics surface actionable risk and revenue insight. 4 Format evolution — operators launch optimised new formats, which drive more execution.

13 Deploy (data-scene="Convergence", calm)
Eyebrow: 13 // DEPLOYMENT
H2: How we deploy with operators.
Steps: 1 Discovery — map your games, volumes and target use cases. 2 Integration — gaming engines, APIs, identity, wallets and on-chain settlement. 3 Pilot — run against agreed performance benchmarks. 4 Scale — expand tables, formats and regions once the benchmarks are met.
Proof strip placeholder (hidden until real logos exist): content/copy.ts → proof: [] ; render nothing when empty.

14 FinalCta (data-scene="SplitWorld")
H2: The infrastructure for the agentic casino economy.
Body: Turn every game round into structured intelligence, and give your operation the tools to scale safely and profitably.
BriefingForm: Name · Work email · Company · Licence jurisdiction (select: Malta, UK, Isle of Man, Gibraltar, Curaçao, Kahnawake, Ontario, New Jersey, Nevada, Philippines, Other) · Role (Operator executive, Product, Risk and compliance, Engineering, Investor, Partner) · Message · consent checkbox. Submit: "Request an operator briefing". Success state in mono: "REQUEST_RECEIVED // WE REPLY WITHIN 2 BUSINESS DAYS".
api/briefing/route.ts: zod validation, honeypot field, simple rate limit (5/hour per IP), sends via Resend to BRIEFING_TO_EMAIL plus an auto-reply.

Footer: logo, one-line mission, columns Platform (Overview, Architecture, AI agents, Risk and analytics, Settlement, Arena) · Developers (API overview, Sandbox access, Status, Changelog) · Company (About, Insights, Careers, Contact) · Trust (Security, Responsible gaming, Compliance) · Legal (Terms, Privacy, Cookies, Disclaimer). Bottom row: © AGENTIC EM, registered address placeholder, "For licensed operators.", "Forward-looking statements" link.

Nav: logo left; Platform (mega menu with the 5 deep pages, each a one-line description and a small poster thumbnail), Operators, Developers, Trust, Insights, Company; copper "Request briefing" button right. Transparent at top, blurred --bg at 80% after 24px scroll. Mobile: full-screen sheet.

==================================================
9. INNER PAGES
==================================================
Each: calm-variant scene hero (H1 + one-line sub + mono eyebrow), 3-6 content sections built from the UI kit, FAQ where useful, and the BriefingForm CTA band at the end. Write real, specific copy consistent with the homepage.
/platform (Convergence): the 4 capabilities as deep sections (AI gaming infrastructure, Autonomous agent capabilities, Real-time analytics and intelligence, Transaction and platform infrastructure), round lifecycle recap, features table, 6-question FAQ.
/platform/architecture (ExplodedStack): 4 layers in depth, 3 foundations, a data-flow diagram (SVG, animated dashes) Agents → Gaming service → Event bus → Streaming analytics/ML → Agent intelligence → Operator dashboards and Settlement ledger, design targets table (label "Design targets"), deployment models: cloud, hybrid, on-prem.
/platform/agents (AgentField calm): agent core loop, all 3 reasoning traces, agent-to-agent formats, guardrails: per-agent spend limits, kill switch, full decision audit log, human approval for interventions.
/platform/risk (AnomalyStream): risk radar, anomaly rules list (the 6 AnomalyRule values with one-line explanations), automated investigation flow, intervention approval workflow, exports (CSV, API, webhooks).
/platform/settlement (Ledger): identity and auth (SSO, API keys, signed agent identities), wallet integration, on-chain ledger, reconciliation, supported networks placeholder.
/platform/arena (ArenaGraph): competitions, spectator modes, live sharing, chat, community formats.
/operators (SplitWorld): problems solved for online casinos, land-based operators with digital arms, and B2B game studios; deployment journey; pilot terms; ROI framing (no numbers until real).
/developers (HeartbeatRing): API overview, auth, webhooks, events list (round.settled, anomaly.detected, block.confirmed, match.event), CodeTabs (TS / Python / Rust) labelled "ILLUSTRATIVE API", sandbox access form, status and changelog links.
 TS example:
 const round = await casinoverse.rounds.create({ table: "bj-07", agents: ["agt_9f2", "agt_1c4"], settlement: { mode: "onchain", wallet: "wal_ops_main" } });
 casinoverse.events.subscribe("round.settled", (e) => metrics.push(e));
/trust (Ledger monochrome): licensed-operators policy, responsible gaming, AML/KYC approach, data protection, security practices, audit and RNG certification status (placeholders marked "TO CONFIRM").
/insights (VolumeBreak static): MDX index + 3 DRAFT articles: "From human pace to machine speed", "Why agentic gaming needs its own risk engine", "Settling millions of rounds on-chain".
/company (FlywheelScene): mission, leadership grid (placeholders), group links, careers.
/contact (SplitWorld): BriefingForm, response-time promise, email, address placeholder.
/legal/[slug]: MDX with "To be supplied by counsel" placeholders.
not-found: mono "404 // ROUND_NOT_FOUND" over a calm AgentField, link home.

==================================================
10. SEO, PERFORMANCE, ACCESSIBILITY
==================================================
SEO: title pattern "<Page> · Casino Verse OS | AGENTIC EM"; homepage title "Casino Verse OS · AI infrastructure for licensed gaming operators | AGENTIC EM". Meta descriptions per page. Organization + SoftwareApplication JSON-LD. sitemap.ts, robots.ts, canonicals. OG images per page. Target terms: agentic gaming infrastructure, AI agents casino platform, iGaming risk analytics, real-time gaming analytics, on-chain settlement for gaming operators, B2B iGaming platform.
Performance: LCP < 2.0s on mid-range mobile 4G; first-load JS < 220KB gzipped (three and scenes lazy); 60fps desktop, 30fps floor mobile.
Accessibility: WCAG 2.2 AA; skip link; full keyboard path; copper focus rings; LiveStrip aria-live="off"; interactive scenes (AgentLoop presets, HeartbeatRing nodes) have HTML button overlays.
Security: middleware.ts sets CSP, HSTS, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy.
Analytics: Plausible or PostHog cookieless; CookieBanner defaults to essential only.

Definition of done: no console errors, no layout shift, every route builds statically except /api, reduced motion and tier 0 look intentional, and every word on the site comes from content/copy.ts or MDX.
