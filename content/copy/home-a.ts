/**
 * Homepage copy, sections 00-07 (spec §8). Owned by the Home-A agent.
 * Components read this through `copy.home` from "@/content/copy".
 */
export const homeA = {
  boot: {
    lines: [
      "SEQ_01 // INIT_AGENTIUM_OS // LIVE",
      "agents: syncing…  ledger: ok  risk_engine: ok",
    ],
  },

  hero: {
    id: "hero-title",
    eyebrow: "AGENTIUM · AGENTIC iGAMING OS",
    title: "The Agentium operating system for the agentic iGaming economy.",
    sub: "We power the infrastructure that lets AI agents play, operators stay in control, and every game generates actionable intelligence.",
    ctaPrimary: { label: "Request an operator briefing", href: "/contact" },
    ctaSecondary: { label: "Explore the architecture", href: "/platform/architecture" },
    footnote: "For licensed operators.",
    sceneAlt:
      "Background visual: a gold roulette wheel rendered as a live data instrument. Hundreds of glowing agent balls orbit its ball track; each time a game round settles on the simulated network, one ball drops into a pocket, the pocket flashes gold and a settlement pulse runs along the rim. Thin instrument rings around the wheel turn with network load and show the game mix: poker, blackjack, roulette, baccarat and dice.",
  },

  backbone: {
    id: "backbone-title",
    eyebrow: "02 // THE_BACKBONE",
    title: "The AI-agentic backbone of the iGaming ecosystem.",
    body: "Agentium is the B2B solutions provider operators build on: one platform to launch, manage and scale, with player accounts, wallets, bonuses and game operations at the core, a unified game catalogue on one side and on-chain settlement on the other.",
    outcomesLabel: "WHAT OPERATORS GET",
    outcomes: [
      { index: "01", title: "Streamlined operations", body: "One integration replaces a patchwork of vendors." },
      { index: "02", title: "A better player experience", body: "More titles, faster payments, fewer seams." },
      { index: "03", title: "A foundation for growth", body: "Scalable technology that grows with your brand." },
    ],
    diagram: {
      top: { label: "OPERATOR BRANDS", items: ["Launch", "Manage", "Scale"] },
      core: {
        label: "AGENTIUM PLATFORM",
        status: "ONLINE",
        modules: [
          { code: "PAM", name: "Player account management" },
          { code: "WAL", name: "Digital wallets" },
          { code: "BON", name: "Bonus engine" },
          { code: "OPS", name: "Gaming operations" },
        ],
        ai: { code: "AI", name: "Agent execution · LLM reasoning · gaming intelligence" },
      },
      aggregation: {
        index: "A",
        label: "GAME AGGREGATION",
        title: "Many providers. One integration.",
        body: "A broad portfolio of titles from multiple game providers, managed from one place.",
        providers: ["PRV_01", "PRV_02", "PRV_03", "PRV_04", "PRV_05", "PRV_06"],
      },
      settlement: {
        index: "B",
        label: "ON-CHAIN SETTLEMENT",
        title: "Transparent money movement.",
        body: "Deposits, withdrawals and transactions through supported digital wallets and blockchain payment rails.",
        flows: ["DEPOSIT", "WITHDRAW", "SETTLE"],
      },
    },
    revenue: {
      id: "revenue-title",
      eyebrow: "02.1 // REVENUE_MODEL",
      title: "Four revenue engines. One intelligence platform.",
      body: "Agentium earns where AI meets iGaming: subscriptions to intelligent game APIs and agent execution, token-based usage credits, white-label licensing and revenue-sharing partnerships.",
      subscription: {
        index: "R1",
        tag: "SUBSCRIPTION",
        title: "API & agent execution plans",
        body: "Subscriptions to intelligent game APIs, agent execution and LLM-based reasoning across every supported game type.",
        gamesLabel: "SUPPORTED GAME TYPES",
        games: ["Sports betting", "Board games", "Skill-based games", "+ more supported titles"],
        baseLabel: "EVERY PLAN",
        base: ["Agent execution", "Intelligent game APIs", "LLM-based reasoning", "Gaming intelligence data"],
        premiumLabel: "PREMIUM TIERS ADD",
        premium: ["Higher usage limits", "Advanced APIs", "Testing environments", "Analytics & strategy evaluation", "Team collaboration tools"],
      },
      credits: {
        index: "R2",
        tag: "USAGE",
        title: "Token-based credits",
        body: "Clients buy credits and spend them on AI-powered gaming services, APIs and data-driven intelligence, paying for what their agents actually use.",
        steps: ["Buy credits", "Call APIs & agents", "Draw on intelligence"],
        meterLabel: "CREDIT BALANCE",
      },
      whiteLabel: {
        index: "R3",
        tag: "LICENSING",
        title: "White-label infrastructure",
        body: "Platform licensing and integration services that let approved operators run Agentium under their own brand.",
      },
      revenueShare: {
        index: "R4",
        tag: "PARTNERSHIP",
        title: "Revenue sharing",
        body: "Partnerships with clients and data contributors on agreed commercial terms, data rights and privacy requirements.",
      },
      intelligence: {
        label: "AI_INTELLIGENCE_LAYER",
        title: "Built on LLM partnerships and specialised iGaming data.",
        inputs: ["LLM provider partnerships", "Specialised iGaming datasets"],
        outputs: ["Gaming reasoning", "Performance benchmarking", "Model evaluation"],
      },
      footnote:
        "Services are offered to approved operators, subject to applicable licensing and gaming regulations, agreed commercial terms, data rights and privacy requirements.",
    },
  },

  intelligence: {
    id: "intelligence-title",
    eyebrow: "03 // INTELLIGENCE_LAYER",
    title: "The intelligence layer for autonomous gaming economies.",
    body: "Agentium OS captures, synchronises and analyses game-state data in real time, giving licensed operators the AI operating system to power, monitor and scale AI-driven gaming.",
    inputLabel: "RAW GAME-STATE DATA",
    coreLabel: "AGENTIUM OS",
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
      "Visual: chaotic white data strands enter from the left, pass through a central Agentium OS core, and leave on the right as ordered lines split into three bundles, one for each output card.",
  },

  architecture: {
    id: "architecture-title",
    eyebrow: "04 // ARCHITECTURE",
    title: "A unified stack built for machine-speed execution.",
    stackLabel: "AGENTIUM OS // STACK",
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

  roundLifecycle: {
    id: "round-lifecycle-title",
    eyebrow: "05 // ROUND_LIFECYCLE",
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
    eyebrow: "06 // RISK_RADAR",
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
