export const intro = {
  ariaLabel: "AGENTIUM · Agentic iGaming OS introduction",
  srSummary:
    "A 26-second introduction to AGENTIUM. Game aggregation brings titles from many providers through one integration; on-chain settlement moves deposits, withdrawals and transactions through supported wallets and blockchain payment rails; intelligent game APIs, agent execution and LLM-based reasoning power the platform. Global B2B Gaming Network: Agentium provides a multi-tenant infrastructure ecosystem through which licensed iGaming operators and technology providers can serve human players and authorized autonomous gaming agents. Figures shown come from a simulated network.",
  skip: "Skip intro",
  skipHint: "ESC",
  replay: "Replay intro",
  simLabel: "SIMULATED NETWORK",
  boot: "SEQ_01 // INIT_AGENTIUM_OS // LIVE",
  brandSub: "AGENTIC iGAMING OS",
  tagline: "Autonomous solutions. Real impact.",
  logoAlt: "AGENTIUM",
  chapterOf: "of",
  chapters: [
    { title: "One integration", sub: "Game aggregation · many providers", statLabel: "PROVIDERS CONNECTED" },
    { title: "Settled on-chain", sub: "Deposits · withdrawals · transactions", statLabel: "ROUNDS / SEC" },
    { title: "Agentic intelligence", sub: "Game APIs · agent execution · LLM reasoning", statLabel: "MEDIAN DECISION" },
    {
      title: "Global B2B Gaming Network",
      body: "Agentium provides a multi-tenant infrastructure ecosystem through which licensed iGaming operators and technology providers can serve human players and authorized autonomous gaming agents.",
    },
  ],
  outro: {
    title: "The Agentium operating system for the agentic iGaming economy.",
    sub: "B2B iGaming infrastructure · For licensed operators",
  },
} as const;
