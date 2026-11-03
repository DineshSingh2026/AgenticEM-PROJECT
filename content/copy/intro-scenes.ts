/** Canvas labels for the intro film's four platform chapters. */
export const introScenes = {
  aggregation: {
    providers: "GAME PROVIDERS",
    gate: "Global API Gateway",
    /** Two-line split used when the gate label must wrap. */
    gateLines: ["Global API", "Gateway"],
    gateSub: "UNIFIED INTEGRATION",
    catalogue: "OPERATOR CATALOGUE",
    types: ["SPORTS", "CARDS", "DICE", "BOARD", "SKILL"],
  },
  settlement: {
    wallets: ["DEPOSIT", "WITHDRAW", "TRANSACTION"],
    walletSub: "SUPPORTED WALLETS",
    chain: "ON-CHAIN SETTLEMENT",
    block: "BLOCK",
    confirmed: "CONFIRMED",
  },
  intelligence: {
    inputs: ["SPORTS BETTING", "BOARD GAMES", "SKILL-BASED GAMES"],
    inputsLabel: "INTELLIGENT GAME APIs",
    model: "LLM REASONING",
    modelSub: "AGENT EXECUTION",
    outputs: ["GAMING REASONING", "PERFORMANCE BENCHMARKING", "MODEL EVALUATION"],
    outputsLabel: "GAMING INTELLIGENCE",
  },
  network: {
    header: "MULTI-TENANT INFRASTRUCTURE",
    /** Tenant nodes round the hub, clockwise from top-right. */
    tenants: ["OPERATOR", "PROVIDER", "OPERATOR", "PROVIDER", "OPERATOR", "PROVIDER"],
    humans: "HUMAN PLAYERS",
    agents: "AUTONOMOUS AGENTS",
  },
} as const;
