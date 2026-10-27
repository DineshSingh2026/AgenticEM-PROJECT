/**
 * Homepage copy, sections 00-07 (spec §8). Owned by the Home-A agent.
 * Components read this through `copy.home` from "@/content/copy".
 */
export const homeA = {
  boot: {
    lines: [
      "SEQ_01 // INIT_CASINO_VERSE_OS // LIVE",
      "agents: syncing…  ledger: ok  risk_engine: ok",
    ],
  },

  hero: {
    id: "hero-title",
    eyebrow: "AGENTIUM · CASINO VERSE OS",
    title: "The Agentium operating system for the agentic casino economy.",
    sub: "We power the infrastructure that lets AI agents play, operators stay in control, and every game generates actionable intelligence.",
    ctaPrimary: { label: "Request an operator briefing", href: "/contact" },
    ctaSecondary: { label: "Explore the architecture", href: "/platform/architecture" },
    footnote: "For licensed operators.",
    sceneAlt:
      "Background visual: a gold roulette wheel rendered as a live data instrument. Hundreds of glowing agent balls orbit its ball track; each time a game round settles on the simulated network, one ball drops into a pocket, the pocket flashes gold and a settlement pulse runs along the rim. Thin instrument rings around the wheel turn with network load and show the game mix: poker, blackjack, roulette, baccarat and dice.",
  },

  shift: {
    id: "shift-title",
    eyebrow: "02 // THE_SHIFT",
    title: "Millions of autonomous agents are entering the casino.",
    body: "When non-human players act at machine speed, every move becomes structured, actionable data. Orchestrate gameplay, monitor every move, and settle every round at machine speed. Turn AI-agent gameplay into a continuously operating ecosystem of real-time execution, transparent settlement, and actionable insights.",
    axisHuman: "HUMAN GAMING VOLUME",
    axisAgent: "AUTONOMOUS AGENT VOLUME",
    columns: ["Attribute", "Human games", "Agentic games"] as [string, string, string],
    rows: [
      { label: "Speed", a: "Human-paced", b: "Machine-speed execution" },
      { label: "Decision making", a: "Emotional, intuitive", b: "Calculated, reasoned" },
      { label: "Volume", a: "Linear scale", b: "Exponential scale" },
      { label: "Data", a: "Fragmented, siloed", b: "Every move structured" },
      { label: "Infrastructure", a: "Traditional server architecture", b: "Casino Verse OS" },
    ],
    sceneAlt:
      "Chart visual: a single smooth line represents human gaming volume rising gently. Midway it fractures into hundreds of copper and steel lines that fan upward exponentially, representing autonomous agent volume.",
  },

  intelligence: {
    id: "intelligence-title",
    eyebrow: "03 // INTELLIGENCE_LAYER",
    title: "The intelligence layer for autonomous gaming economies.",
    body: "Casino Verse captures, synchronises and analyses game-state data in real time, giving licensed operators the AI operating system to power, monitor and scale AI-driven gaming.",
    inputLabel: "RAW GAME-STATE DATA",
    coreLabel: "CASINO VERSE OS",
    outputLabel: "OPERATOR OUTPUTS",
    cards: [
      {
        index: "01",
        title: "Operational performance",
        body: "Live throughput, table utilisation and agent activity across every game.",
      },
      {
        index: "02",
        title: "Real-time risk monitoring",
        body: "Exposure, anomalies and suspicious behaviour flagged as it happens.",
      },
      {
        index: "03",
        title: "Profitability analytics",
        body: "Hold, revenue and margin by game, region and agent cohort.",
      },
    ],
    sceneAlt:
      "Visual: chaotic white data strands enter from the left, pass through a central Casino Verse OS core, and leave on the right as ordered lines split into three bundles, one for each output card.",
  },

  architecture: {
    id: "architecture-title",
    eyebrow: "04 // ARCHITECTURE",
    title: "A unified stack built for machine-speed execution.",
    stackLabel: "CASINO VERSE OS // STACK",
    layers: [
      {
        index: "L1",
        title: "Real-time analytics and intelligence",
        body: "Structured gameplay data, performance tracking, profitability metrics.",
      },
      {
        index: "L2",
        title: "Autonomous agent capabilities",
        body: "Agent evaluation, reasoning, agent-to-agent interaction.",
      },
      {
        index: "L3",
        title: "AI gaming infrastructure",
        body: "Gaming engines, game-state delivery, high-volume execution.",
      },
      {
        index: "L4",
        title: "Transaction and platform infrastructure",
        body: "Identity, authentication, wallet integration, on-chain settlement.",
      },
    ],
    foundationsLabel: "FOUNDATIONS",
    foundations: [
      {
        title: "High-speed deterministic computing",
        body: "Processes every bet, settlement, wallet movement and financial calculation with sub-second latency.",
      },
      {
        title: "Streaming analytics and machine learning",
        body: "Calculates risk exposure, detects anomalies and monitors performance continuously.",
      },
      {
        title: "Specialised AI agents and LLM reasoning",
        body: "Interprets data, investigates suspicious activity, recommends interventions and automates approved workflows.",
      },
    ],
    sceneAlt:
      "Visual: four platform layers separate vertically one at a time as you scroll: frosted glass for real-time analytics, a copper lattice for agent capabilities, a steel plate for gaming infrastructure and a graphite base for transaction infrastructure. Small packets of light rise through every layer.",
  },

  agentCore: {
    id: "agent-core-title",
    eyebrow: "05 // AGENT_CORE",
    title: "Agents that reason, not scripts that follow.",
    scriptLabel: "LEGACY // SCRIPTED BOT",
    flow: {
      start: "START",
      condA: "IF CONDITION A",
      actionB: "ACTION B",
      condC: "IF CONDITION C",
      actionD: "ACTION D",
      stop: "STOP",
    },
    flowCaption: "Predefined scripts. Rigid execution.",
    loopLabel: "AGENT CORE // REASONING LOOP",
    loop: [
      { phase: "assess", index: "01", title: "Assess state", body: "Ingests real-time game state and opponent data." },
      { phase: "calculate", index: "02", title: "Calculate", body: "Computes pot odds and probability matrices." },
      { phase: "evaluate", index: "03", title: "Evaluate", body: "Cross-references calculations with adaptable strategies." },
      { phase: "execute", index: "04", title: "Execute", body: "Makes an independent, non-scripted decision at machine speed." },
    ],
    presetsLabel: "RUN A PRESET",
    presets: [
      { preset: "poker", label: "Poker" },
      { preset: "blackjack", label: "Blackjack" },
      { preset: "roulette", label: "Roulette" },
    ],
    traceLabel: "ILLUSTRATIVE TRACE",
    traceStateLabel: "STATE",
    traceIdle: "Select a preset to run the agent core loop.",
    traceResultLabel: "Decision",
    phaseLabels: {
      assess: "ASSESS",
      calculate: "CALCULATE",
      evaluate: "EVALUATE",
      execute: "EXECUTE",
    },
    sceneAlt:
      "Visual: a ring split into four quadrants, assess state in red, calculate in blue, evaluate in green and execute in gold. When a preset runs, the quadrants light in sequence while the reasoning trace types out.",
  },

  roundLifecycle: {
    id: "round-lifecycle-title",
    eyebrow: "06 // ROUND_LIFECYCLE",
    title: "Every game round becomes structured operational data.",
    stepsLabel: "ROUND // 5 STAGES",
    steps: [
      { index: "01", title: "Trigger", body: "Game-state delivery." },
      { index: "02", title: "Compute", body: "Agent reasoning and evaluation." },
      { index: "03", title: "Action", body: "Independent decision or bet." },
      { index: "04", title: "Settlement", body: "On-chain transaction processing." },
      { index: "05", title: "Insight", body: "Real-time event capture and analytics." },
    ],
    sceneAlt:
      "Visual: a metal turbine ring with a rotating blade assembly. A glowing copper token travels the ring and stops at each of the five round stages as you scroll.",
  },

  risk: {
    id: "risk-title",
    eyebrow: "07 // RISK_RADAR",
    title: "Real-time operational intelligence and risk mitigation.",
    body: "Streaming analytics and machine learning flag suspicious activity the moment it appears. Specialised agents investigate, explain and recommend interventions for human approval.",
    panels: {
      exposure: "Calculated risk exposure",
      suspicious: "Suspicious activity flagged",
      interventions: "Automated interventions approved",
      stream: "Anomaly stream",
    },
    flaggedLabel: "FLAGGED (24H)",
    interventionsLabel: "APPROVED (24H)",
    interventionsNote: "Recommended by specialised agents. Approved by a human operator.",
    pendingLabel: "AWAITING APPROVAL",
    exposureUnit: "% OF MONITORED EXPOSURE",
    alertsEmpty: "LISTENING // NO FLAGS IN WINDOW",
    filterLabel: "STREAMING ANALYTICS & ML FILTER",
    filterTag: "ML_FILTER // v2",
    severity: { low: "Low", med: "Medium", high: "High" },
    sceneAlt:
      "Visual: a waveform of three layered noise lines scrolls right to left. Copper spikes rise where the simulated network detects an anomaly, taller for higher scores and tinted red for high severity. A frosted filter band catches each spike and marks it with a triangle.",
  },
} as const;
