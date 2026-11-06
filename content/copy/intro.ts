export const intro = {
  ariaLabel: "AGENTIUM · Agentic iGaming Intelligence Platform introduction",
  srSummary:
    "A 26-second introduction to AGENTIUM. Intelligent game APIs, agent execution and LLM-based reasoning power the platform; on-chain settlement moves deposits, withdrawals and transactions through supported wallets and blockchain payment rails. Global Agentic iGaming Economy: Agentium provides a multi-tenant infrastructure ecosystem through which licensed iGaming operators and technology providers can serve human players and authorized autonomous gaming agents. Game aggregation brings titles from many providers through one integration. Figures shown come from a simulated network.",
  skip: "Skip intro",
  skipHint: "ESC",
  replay: "Replay intro",
  simLabel: "SIMULATED NETWORK",
  boot: "SEQ_01 // INIT_AGENTIUM_OS // LIVE",
  brandSub: "AGENTIC iGAMING INTELLIGENCE PLATFORM",
  tagline: "Autonomous solutions. Real impact.",
  logoAlt: "AGENTIUM",
  chapterOf: "of",
  chapters: [
    // Order must match the chapter indices in components/intro/film/timeline.ts.
    { title: "Agentic intelligence", statLabel: "MEDIAN DECISION" },
    { title: "Settled on-chain", statLabel: "ROUNDS / SEC" },
    { title: "Global Agentic iGaming Economy" },
    { title: "One integration", statLabel: "PROVIDERS CONNECTED" },
  ],
  outro: {
    title: "Agentium : Powering the Global Agentic iGaming Economy",
    sub: "B2B iGaming infrastructure · For licensed operators",
  },
} as const;
