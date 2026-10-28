/**
 * Homepage copy, sections 08-14 (spec §8) + homepage SEO.
 * Owner: Home-B agent. Every user-visible string for these sections lives here.
 */

export const homeB = {
  meta: {
    title: "Agentium OS · AI infrastructure for licensed gaming operators",
    description:
      "The Agentium operating system for the agentic iGaming economy. We power the infrastructure that lets AI agents play, operators stay in control, and every game generates actionable intelligence.",
  },

  settlement: {
    eyebrow: "07 // SETTLEMENT",
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

  resilience: {
    eyebrow: "08 // RESILIENCE",
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
    eyebrow: "09 // FLYWHEEL",
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
    eyebrow: "10 // DEPLOYMENT",
    title: "How we deploy with operators.",
    steps: [
      { index: "01", title: "Discovery", body: "Map your games, volumes and target use cases." },
      { index: "02", title: "Integration", body: "Gaming engines, APIs, identity, wallets and on-chain settlement." },
      { index: "03", title: "Pilot", body: "Run against agreed performance benchmarks." },
      { index: "04", title: "Scale", body: "Expand tables, formats and regions once the benchmarks are met." },
    ],
    proofLabel: "OPERATING WITH",
    sceneDescription: "Background animation, calm variant: strands converge through the Agentium OS core.",
  },

  finalCta: {
    eyebrow: "11 // BRIEFING",
    title: "The infrastructure for the agentic iGaming economy.",
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
        "AGENTIUM builds Agentium OS, the AI operating system for the autonomous gaming economy, for licensed casino and iGaming operators.",
      slogan: "The Agentium operating system for the agentic iGaming economy.",
    },
    software: {
      name: "Agentium OS",
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
