/**
 * Homepage copy, sections 08-14 (spec §8) + homepage SEO.
 * Owner: Home-B agent. Every user-visible string for these sections lives here.
 */

export const homeB = {
  meta: {
    title: "Casino Verse OS · AI infrastructure for licensed gaming operators | AGENTIUM",
    description:
      "The Agentium operating system for the agentic casino economy. We power the infrastructure that lets AI agents play, operators stay in control, and every game generates actionable intelligence.",
  },

  settlement: {
    eyebrow: "08 // SETTLEMENT",
    title: "Every settlement, traced.",
    body: "End-to-end identity management, wallet integration and blockchain-based settlement workflows built for autonomous agents.",
    stackLabel: "SETTLEMENT_STACK",
    stack: [
      { index: "01", title: "Identity and authentication", body: "Signed agent identities, SSO and scoped API keys." },
      { index: "02", title: "Wallet integrations", body: "Operator and agent wallets connected to every round." },
      { index: "03", title: "On-chain transaction capabilities", body: "Every settlement written to a verifiable ledger." },
    ],
    live: {
      panelLabel: "LEDGER // LIVE",
      latestBlock: "LATEST BLOCK HEIGHT",
      txCount: "TX IN LATEST BLOCK",
      listLabel: "PENDING → CONFIRMED",
      colHeight: "HEIGHT",
      colHash: "HASH",
      colTx: "TX",
      colStatus: "STATUS",
      pending: "PENDING",
      confirmed: "CONFIRMED",
      awaiting: "AWAITING_BLOCK",
    },
    sceneDescription:
      "Background animation: graphite blocks link left to right along a chain with copper connectors. Each new simulated block types out its hash, glows copper on confirmation, and the chain shifts left.",
  },

  arena: {
    eyebrow: "09 // ARENA",
    title: "New gaming formats people want to watch.",
    body: "Agent-to-agent competitions, live-game sharing, spectator modes and chat integration turn autonomous gameplay into an observable event for operator communities.",
    chips: ["Agent-to-agent competition", "Spectator modes", "Live-game sharing", "Chat integration"],
    feed: {
      label: "MATCH_FEED // LIVE",
      awaiting: "AWAITING_MATCH_EVENT",
      match: "MATCH",
      actions: { raise: "RAISE", call: "CALL", fold: "FOLD", hit: "HIT", stand: "STAND" },
    },
    sceneDescription:
      "Background animation: five blue agent nodes in a fully connected pentagon exchange pulses on every simulated match event, while 32 green spectator nodes orbit on two rings and brighten as pulses land.",
  },

  features: {
    eyebrow: "10 // PLATFORM_VALUE",
    title: "Platform features, measured in business value.",
    /** Fallback only — FeaturesValue reads content/data/features.json (detail + chart) first. */
    rows: [
      { feature: "High-volume game execution", benefit: "Run and analyse substantially more game activity." },
      { feature: "Real-time gameplay event capture", benefit: "Instant visibility into game activity and financial performance." },
      { feature: "Analytics for risk and profitability", benefit: "Better-informed, data-backed operational decisions." },
      { feature: "Identity, authentication and wallets", benefit: "Secure transaction workflows and controlled ecosystem access." },
      { feature: "Spectator, chat and live sharing", benefit: "New community interaction and engagement." },
    ],
    sceneDescription:
      "Background animation, calm variant: chaotic strands converge through the Casino Verse OS core and leave as ordered parallel lines.",
  },

  resilience: {
    eyebrow: "11 // RESILIENCE",
    title: "Built to stay connected.",
    body: "Stateless APIs, active reconnection routines and continuous synchronisation keep millions of agents and gaming services in step. Try it: drop a node.",
    status: [
      { key: "PROTOCOL", value: "STATELESS APIs" },
      { key: "STATUS", value: "ACTIVE RECONNECTION" },
      { key: "TELEMETRY", value: "CONTINUOUS SYNC" },
    ],
    hubLabel: "GAMING SERVICE",
    nodeAria: "Drop agent node",
    nodePrefix: "NODE",
    states: {
      idle: "ALL NODES // CONNECTED",
      rerouting: "REROUTING",
      reconnected: "RECONNECTED",
    },
    instructions: "Select a node to drop it. It reconnects automatically after two seconds.",
    sceneDescription:
      "Background animation: eight agent nodes sit on a ring around a central octagonal gaming service, each linked by a spoke carrying a heartbeat pulse. A dropped node greys out, its spoke flatlines, its neighbours reroute, and it reconnects after two seconds with a copper flash.",
  },

  flywheel: {
    eyebrow: "12 // FLYWHEEL",
    title: "The agentic intelligence flywheel.",
    steps: [
      { index: "01", title: "Machine-speed execution", body: "Agents play continuously." },
      { index: "02", title: "Real-time capture", body: "Gameplay becomes structured data." },
      { index: "03", title: "Operational intelligence", body: "Analytics surface actionable risk and revenue insight." },
      { index: "04", title: "Format evolution", body: "Operators launch optimised new formats, which drive more execution." },
    ],
    loopLabel: "LOOP // 04 → 01",
    sceneDescription:
      "Background animation: a brushed-steel wheel split into four segments with copper seams — machine-speed execution, real-time capture, operational intelligence and format evolution — rotating with scroll speed.",
  },

  deploy: {
    eyebrow: "13 // DEPLOYMENT",
    title: "How we deploy with operators.",
    steps: [
      { index: "01", title: "Discovery", body: "Map your games, volumes and target use cases." },
      { index: "02", title: "Integration", body: "Gaming engines, APIs, identity, wallets and on-chain settlement." },
      { index: "03", title: "Pilot", body: "Run against agreed performance benchmarks." },
      { index: "04", title: "Scale", body: "Expand tables, formats and regions once the benchmarks are met." },
    ],
    proofLabel: "OPERATING WITH",
    sceneDescription: "Background animation, calm variant: strands converge through the Casino Verse OS core.",
  },

  finalCta: {
    eyebrow: "14 // BRIEFING",
    title: "The infrastructure for the agentic casino economy.",
    body: "Turn every game round into structured intelligence, and give your operation the tools to scale safely and profitably.",
    panelLabel: "REQUEST // OPERATOR_BRIEFING",
    sceneDescription:
      "Background animation: a split world — a cool data-centre aisle on the left and a warm, softly blurred casino floor on the right — joined by a moving seam of data noise and copper sparks.",
  },

  /** Hidden until real operator logos exist. Render nothing when empty. */
  proof: [] as { name: string; logo: string }[],

  jsonLd: {
    organization: {
      name: "AGENTIUM",
      description:
        "AGENTIUM builds Casino Verse OS, the AI operating system for the autonomous gaming economy, for licensed casino and iGaming operators.",
      slogan: "The Agentium operating system for the agentic casino economy.",
    },
    software: {
      name: "Casino Verse OS",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "B2B iGaming platform",
      operatingSystem: "Cloud, hybrid, on-premises",
      description:
        "Agentic gaming infrastructure for licensed operators: run, monitor and settle AI-agent gameplay at machine speed, with real-time gaming analytics, iGaming risk analytics and on-chain settlement for gaming operators.",
      audience: "Licensed casino and iGaming operators",
      keywords: [
        "agentic gaming infrastructure",
        "AI agents casino platform",
        "iGaming risk analytics",
        "real-time gaming analytics",
        "on-chain settlement for gaming operators",
        "B2B iGaming platform",
      ],
    },
  },
} as const;
