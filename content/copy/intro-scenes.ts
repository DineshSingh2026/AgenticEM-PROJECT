/** Canvas labels for the intro film's five platform chapters. */
export const introScenes = {
  backbone: {
    core: "AGENTIUM PLATFORM",
    operators: "OPERATOR BRANDS",
    operatorVerbs: ["LAUNCH", "MANAGE", "SCALE"],
    modules: [
      { code: "PAM", name: "Player accounts" },
      { code: "WAL", name: "Digital wallets" },
      { code: "BON", name: "Bonus engine" },
      { code: "OPS", name: "Gaming operations" },
    ],
  },
  aggregation: {
    providers: "GAME PROVIDERS",
    gate: "1 API",
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
  revenue: {
    engines: [
      { code: "R1", name: "API SUBSCRIPTIONS" },
      { code: "R2", name: "TOKEN CREDITS" },
      { code: "R3", name: "WHITE-LABEL" },
      { code: "R4", name: "REVENUE SHARE" },
    ],
    credit: "CR",
  },
} as const;
