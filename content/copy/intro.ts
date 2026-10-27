export const intro = {
  ariaLabel: "AGENTIUM · Casino Verse OS introduction",
  srSummary:
    "A 20-second introduction to AGENTIUM, autonomous solutions with real impact, and its Casino Verse OS. Human gaming volume gives way to fast-growing autonomous agent volume; an intelligence layer turns chaotic game data into operational, risk and profitability insight; every round is settled and traced on-chain; and streaming analytics flag risk as it happens. Figures shown come from a simulated network.",
  skip: "Skip intro",
  skipHint: "ESC",
  replay: "Replay intro",
  simLabel: "SIMULATED NETWORK",
  boot: "SEQ_01 // INIT_CASINO_VERSE_OS // LIVE",
  brandSub: "CASINO VERSE OS",
  tagline: "Autonomous solutions. Real impact.",
  logoAlt: "AGENTIUM",
  chapterOf: "of",
  chapters: [
    { title: "The shift", sub: "Human pace → machine speed", statLabel: "ACTIVE AGENTS" },
    { title: "One intelligence layer", sub: "Capture · synchronise · analyse", statLabel: "MEDIAN DECISION" },
    { title: "Every round, settled", sub: "On-chain · traced · in real time", statLabel: "ROUNDS / SEC" },
    { title: "Risk, caught live", sub: "Streaming analytics & ML filter", statLabel: "ANOMALIES FLAGGED (24H)" },
  ],
  outro: {
    title: "The Agentium operating system for the agentic casino economy.",
    sub: "Casino Verse OS · For licensed operators",
  },
  canvas: {
    axisHuman: "HUMAN GAMING VOLUME",
    axisAgent: "AUTONOMOUS AGENT VOLUME",
    bundles: ["OPERATIONS", "RISK", "PROFITABILITY"],
    core: "CASINO VERSE OS",
    filter: "STREAMING ANALYTICS & ML FILTER",
    block: "BLOCK",
    alertsTitle: "FLAGGED // AWAITING HUMAN APPROVAL",
    settled: "ROUND.SETTLED",
  },
} as const;
