import type { AnomalyRule, Severity } from "@/lib/sim/types";

/**
 * Inner-page copy. Every user-visible string on /platform/*,
 * /company, /contact, /legal/* and the 404 page lives here.
 * Placeholders that need confirmation from the business are marked "TO CONFIRM".
 */

const anomalyRules = [
  {
    rule: "Unusual betting pattern",
    severity: "med",
    body: "Stake sizing, bet timing or bet-type mix drifts away from the agent's own baseline and its cohort's baseline at the same table type.",
  },
  {
    rule: "Multiple login attempts",
    severity: "low",
    body: "Repeated failed or overlapping authentication attempts against one agent identity or API key, across one or more source networks.",
  },
  {
    rule: "Collusion signal",
    severity: "high",
    body: "Two or more agents show coordinated actions, soft-play or chip dumping across shared tables beyond what independent play explains.",
  },
  {
    rule: "Velocity spike",
    severity: "med",
    body: "Round, deposit or withdrawal rate jumps beyond the agent's policy envelope within a short rolling window.",
  },
  {
    rule: "Wallet mismatch",
    severity: "high",
    body: "The wallet funding or receiving a settlement does not match the wallet bound to the agent's signed identity.",
  },
  {
    rule: "Bot fingerprint drift",
    severity: "low",
    body: "An agent's decision-timing and model fingerprint changes materially, suggesting a different runtime is operating under the same identity.",
  },
] as const satisfies readonly { rule: AnomalyRule; severity: Severity; body: string }[];

export const pages = {
  /* ------------------------------------------------------------------ */
  platform: {
    meta: {
      title: "Platform",
      description:
        "Agentium OS is the B2B iGaming platform for agentic gaming: AI gaming infrastructure, autonomous agent capabilities, real-time gaming analytics and on-chain settlement for licensed operators.",
      path: "/platform",
    },
    hero: {
      eyebrow: "01 // PLATFORM",
      title: "One operating system for agentic gaming.",
      sub: "Agentium OS gives licensed operators the infrastructure to run AI-agent gameplay, see every round as it happens and settle it with a complete audit trail.",
    },
    capabilities: [
      {
        eyebrow: "01.1 // AI_GAMING_INFRASTRUCTURE",
        label: "CAPABILITY 01",
        title: "AI gaming infrastructure",
        body: "Agents do not wait for animations or lobby screens. Agentium OS delivers game state over stateless APIs, accepts decisions in milliseconds and runs tables designed to scale horizontally as agent volume grows.",
        points: [
          "Game-state delivery over stateless REST and streaming APIs",
          "Deterministic round engine for poker, blackjack, roulette, baccarat and dice",
          "Horizontal table scaling with per-table concurrency limits",
          "Adapters for existing remote gaming servers and game engines",
        ],
      },
      {
        eyebrow: "01.2 // AUTONOMOUS_AGENTS",
        label: "CAPABILITY 02",
        title: "Autonomous agent capabilities",
        body: "Every agent carries a signed identity, a policy set by the operator and a decision log. Agents evaluate state, reason about it and act, including against other agents, inside limits you control.",
        points: [
          "Signed agent identities bound to a wallet and a policy",
          "Reasoning trace stored with every decision",
          "Agent-to-agent tables, matches and ladders",
          "Per-agent spend limits and an operator kill switch",
        ],
      },
      {
        eyebrow: "01.3 // REAL_TIME_INTELLIGENCE",
        label: "CAPABILITY 03",
        title: "Real-time analytics and intelligence",
        body: "Each round emits structured events the moment it happens. Streaming analytics turn them into throughput, hold, exposure and anomaly scores your teams can act on during the session, not after it.",
        points: [
          "Event capture for every round, decision and settlement",
          "Hold, GGR and margin by game, region and agent cohort",
          "Streaming risk exposure and anomaly scoring",
          "Exports through CSV, API and webhooks",
        ],
      },
      {
        eyebrow: "01.4 // TRANSACTION_PLATFORM",
        label: "CAPABILITY 04",
        title: "Transaction and platform infrastructure",
        body: "Identity, authentication, wallets and settlement are one workflow rather than four vendors. Every stake and payout is traceable from the agent that placed it to the block that confirmed it.",
        points: [
          "SSO for operator staff, scoped API keys for systems",
          "Wallet integrations for operator treasury and agent wallets",
          "On-chain settlement with block-level confirmation",
          "Reconciliation against your existing ledgers",
        ],
      },
    ],
    lifecycle: {
      eyebrow: "02 // ROUND_LIFECYCLE",
      title: "Five steps, every round, fully recorded.",
      body: "The same lifecycle runs whether a table hosts two agents or two thousand. Each step writes to the event stream, so analytics, risk and settlement all read from one source of truth.",
      steps: [
        { index: "01", title: "Trigger", body: "The gaming service publishes game state to every seated agent." },
        { index: "02", title: "Compute", body: "Agents assess state, calculate odds and evaluate strategy." },
        { index: "03", title: "Action", body: "Each agent submits an independent decision or bet within the table timer." },
        { index: "04", title: "Settlement", body: "Stakes and payouts are settled to wallets and confirmed on the ledger." },
        { index: "05", title: "Insight", body: "The round is captured as structured events for analytics and risk." },
      ],
    },
    features: {
      eyebrow: "03 // PLATFORM_VALUE",
      title: "Platform features, measured in business value.",
      body: "Each capability maps to an operating outcome. Expand a row for detail.",
    },
    faq: {
      eyebrow: "04 // FAQ",
      title: "Questions operators ask first.",
      items: [
        {
          q: "Who is Agentium OS for?",
          a: "Licensed casino and iGaming operators, land-based operators with digital arms, and B2B game studios. We work only with licensed businesses and do not offer services to the public.",
        },
        {
          q: "What counts as an AI agent on the platform?",
          a: "An autonomous software participant that receives game state through our APIs, reasons about it and submits decisions. Each agent has a signed identity, an operator-defined policy, spend limits and a full decision log.",
        },
        {
          q: "Does it replace our existing gaming platform?",
          a: "No. Agentium OS runs alongside your remote gaming server, player account management and wallet stack through adapters. You can route agentic tables through Agentium OS while your existing human-facing products stay where they are.",
        },
        {
          q: "How is risk handled?",
          a: "Streaming analytics score every event against six anomaly rule families as it arrives. Specialised agents investigate and recommend an intervention; a member of your team approves or rejects it unless you have pre-approved that workflow.",
        },
        {
          q: "Does settlement have to be on-chain?",
          a: "No. Operators can settle fully on-chain, settle to their existing ledger and anchor batch hashes on-chain, or run off-chain only. Supported networks are agreed during discovery (TO CONFIRM).",
        },
        {
          q: "How does an engagement start?",
          a: "With an operator briefing. We then run discovery on your games, volumes and jurisdictions, integrate, and pilot against benchmarks agreed in writing before we expand to more tables or regions.",
        },
      ],
    },
    cta: {
      title: "See Agentium OS against your own games.",
      body: "Book an operator briefing. We map your tables, volumes and jurisdictions, then propose a pilot with benchmarks you agree up front.",
    },
  },

  /* ------------------------------------------------------------------ */
  architecture: {
    meta: {
      title: "Architecture",
      description:
        "The Agentium OS architecture: four layers, three foundations and one event stream for agentic gaming infrastructure, with cloud, hybrid and on-prem deployment for licensed operators.",
      path: "/platform/architecture",
    },
    hero: {
      eyebrow: "02 // ARCHITECTURE",
      title: "A unified stack built for machine-speed execution.",
      sub: "Four layers, three foundations and one event stream, from the first game-state packet to the settled ledger entry.",
    },
    layers: {
      eyebrow: "02.1 // LAYERS",
      title: "Four layers, one contract between them.",
      body: "Each layer exposes a typed interface to the one above it, so you can adopt the stack top to bottom or integrate one layer into your existing estate.",
      items: [
        {
          label: "LAYER 04",
          title: "Real-time analytics and intelligence",
          body: "Structured gameplay data, performance tracking and profitability metrics, computed continuously from the event stream.",
          points: ["Live throughput and table utilisation", "Hold, GGR and margin by cohort", "Risk exposure and anomaly scores"],
        },
        {
          label: "LAYER 03",
          title: "Autonomous agent capabilities",
          body: "Agent evaluation, reasoning and agent-to-agent interaction, each decision logged with its trace and bounded by operator policy.",
          points: ["Signed agent identities", "Policy, spend limits and kill switch", "Agent-to-agent formats"],
        },
        {
          label: "LAYER 02",
          title: "AI gaming infrastructure",
          body: "Gaming engines, game-state delivery and high-volume execution, built on stateless services that are designed to scale horizontally.",
          points: ["Deterministic round engine", "Stateless game-state APIs", "Per-table concurrency control"],
        },
        {
          label: "LAYER 01",
          title: "Transaction and platform infrastructure",
          body: "Identity, authentication, wallet integration and on-chain settlement, with reconciliation back to operator ledgers.",
          points: ["SSO and scoped API keys", "Treasury and agent wallets", "Block-level settlement confirmation"],
        },
      ],
    },
    foundations: {
      eyebrow: "02.2 // FOUNDATIONS",
      title: "Three foundations underneath every layer.",
      items: [
        {
          label: "FOUNDATION A",
          title: "High-speed deterministic computing",
          body: "Processes every bet, settlement, wallet movement and financial calculation with sub-second latency, and produces the same result when a round is replayed.",
        },
        {
          label: "FOUNDATION B",
          title: "Streaming analytics and machine learning",
          body: "Calculates risk exposure, detects anomalies and monitors performance continuously over an ordered, replayable event bus.",
        },
        {
          label: "FOUNDATION C",
          title: "Specialised AI agents and LLM reasoning",
          body: "Interprets data, investigates suspicious activity, recommends interventions and automates the workflows an operator has approved.",
        },
      ],
    },
    flow: {
      eyebrow: "02.3 // DATA_FLOW",
      title: "How a round moves through the system.",
      body: "Agents talk only to the gaming service. Everything after that is an ordered event stream, read by analytics, by agent intelligence and, finally, by your teams and the settlement ledger.",
      diagramLabel: "DATA FLOW · ILLUSTRATIVE",
      diagramTitle: "Agentium OS data flow",
      diagramDesc:
        "Agents send decisions to the gaming service, which publishes events to the event bus. Streaming analytics and machine learning consume the bus and feed agent intelligence, which outputs to operator dashboards and the settlement ledger.",
      nodes: [
        { label: "Agents", sub: "SIGNED IDENTITIES", body: "Agents receive game state and submit decisions with their signed identity." },
        { label: "Gaming service", sub: "STATE + RULES", body: "The gaming service validates each action against table rules and policy." },
        { label: "Event bus", sub: "ORDERED · REPLAYABLE", body: "Every action and outcome is published once, in order, and can be replayed." },
        { label: "Streaming analytics / ML", sub: "METRICS + RISK", body: "Metrics, exposure and anomaly scores update as events arrive." },
        { label: "Agent intelligence", sub: "INVESTIGATE · RECOMMEND", body: "Specialised agents explain anomalies and propose interventions." },
        { label: "Operator dashboards", sub: "HUMANS APPROVE", body: "Your teams monitor performance and approve or reject interventions." },
        { label: "Settlement ledger", sub: "ON-CHAIN OR HYBRID", body: "Stakes and payouts are settled and confirmed with a traceable hash." },
      ],
    },
    targets: {
      eyebrow: "02.4 // DESIGN_TARGETS",
      title: "Design targets",
      body: "These are the targets the system is engineered toward, not measured claims. Pilot benchmarks are agreed with each operator in writing before go-live.",
      label: "DESIGN TARGETS · NOT MEASURED CLAIMS",
      columns: ["Metric", "Design target", "Notes"],
      rows: [
        ["Agent decision round-trip (median)", "< 50 ms", "Gaming service to agent and back, same region"],
        ["Game-state delivery (p99)", "< 150 ms", "Streaming API, per table"],
        ["Event capture to dashboard", "Sub-second", "From round outcome to operator view"],
        ["Settlement confirmation", "Per block", "Depends on the settlement network chosen"],
        ["Table capacity", "Designed to scale horizontally", "Add table clusters without re-architecture"],
        ["Agent reconnection", "< 2 s", "Automatic, with state resynchronisation"],
        ["Regional availability", "TO CONFIRM", "Set per deployment and contract"],
      ],
    },
    deployment: {
      eyebrow: "02.5 // DEPLOYMENT_MODELS",
      title: "Cloud, hybrid or on-prem.",
      body: "Choose the model your licence and data-residency obligations require. The APIs and event schema stay the same in all three.",
      items: [
        {
          label: "MODEL 01",
          title: "Cloud",
          body: "AGENTIUM operates the full stack in a regional tenancy dedicated to your operation.",
          points: ["Fastest route to a pilot", "Managed upgrades and monitoring", "Regional data residency"],
        },
        {
          label: "MODEL 02",
          title: "Hybrid",
          body: "The gaming service and settlement ledger run in your environment; analytics and agent intelligence run in ours.",
          points: ["Game state stays on your infrastructure", "Pseudonymised events leave your perimeter", "Shared operations runbook"],
        },
        {
          label: "MODEL 03",
          title: "On-prem",
          body: "The complete stack runs in your data centre or private cloud for jurisdictions that require it.",
          points: ["Full data control", "Air-gapped options for audit", "Your change-management process"],
        },
      ],
    },
    faq: {
      eyebrow: "02.6 // FAQ",
      title: "Architecture questions.",
      items: [
        {
          q: "Can we integrate one layer without the rest?",
          a: "Yes. Most operators start with the analytics and risk layer reading from their own gaming service, or with the gaming layer settling to their existing wallet. The event schema is the integration point.",
        },
        {
          q: "Is the event bus replayable?",
          a: "Yes. Events are ordered per table and retained for a period you set, so any round can be replayed deterministically for audit or dispute review.",
        },
        {
          q: "Where are the design targets measured?",
          a: "During the pilot, in your chosen region and deployment model. We publish the measured results to you alongside the targets above before any expansion.",
        },
      ],
    },
    cta: {
      title: "Walk through the architecture with our engineers.",
      body: "Bring your platform team. We will map your gaming engine, wallet and identity stack onto the four layers and recommend a deployment model.",
    },
  },

  /* ------------------------------------------------------------------ */
  agents: {
    meta: {
      title: "AI agents",
      description:
        "Autonomous AI agents for licensed casino operators: the agent core loop, illustrative reasoning traces, agent-to-agent formats and guardrails including spend limits, kill switch and full decision audit logs.",
      path: "/platform/agents",
    },
    hero: {
      eyebrow: "03 // AI_AGENTS",
      title: "Agents that reason, not scripts that follow.",
      sub: "Every agent on Agentium OS assesses state, calculates, evaluates and executes in milliseconds, and leaves a trace your teams can read.",
    },
    loop: {
      eyebrow: "03.1 // AGENT_CORE",
      title: "The agent core loop.",
      body: "Scripted bots follow a fixed decision tree. Agents on Agentium OS run a four-phase loop on every decision, using live game state and their own strategy.",
      steps: [
        { index: "01", title: "Assess state", body: "Ingests real-time game state and opponent data." },
        { index: "02", title: "Calculate", body: "Computes pot odds, equity and probability matrices." },
        { index: "03", title: "Evaluate", body: "Cross-references calculations with adaptable strategies." },
        { index: "04", title: "Execute", body: "Makes an independent, non-scripted decision at machine speed." },
      ],
    },
    compare: {
      eyebrow: "03.2 // SCRIPTS_VS_AGENTS",
      title: "Why this is a different workload.",
      columns: ["", "Scripted bots", "Agentium agents"],
      rows: [
        { label: "Decision logic", a: "Predefined if/then rules", b: "Reasoned per decision from live state" },
        { label: "Adaptation", a: "Requires a code change", b: "Adjusts strategy within operator policy" },
        { label: "Explainability", a: "None beyond the script", b: "Reasoning trace stored with each action" },
        { label: "Identity", a: "Shared credentials", b: "Signed identity bound to a wallet" },
        { label: "Control", a: "Block the account", b: "Spend limits, kill switch, approval workflows" },
      ],
    },
    traces: {
      eyebrow: "03.3 // REASONING_TRACES",
      title: "Three decisions, shown in full.",
      body: "These traces illustrate the format every agent decision is logged in. They are examples, not live data.",
      panelLabel: "ILLUSTRATIVE TRACE",
      stateLabel: "STATE",
      phaseLabels: { assess: "ASSESS", calculate: "CALCULATE", evaluate: "EVALUATE", execute: "EXECUTE" },
    },
    formats: {
      eyebrow: "03.4 // AGENT_TO_AGENT",
      title: "Agent-to-agent formats.",
      body: "When agents face other agents, operators can run formats that human-paced tables cannot support.",
      items: [
        { label: "FORMAT 01", title: "Heads-up matches", body: "Two agents, one table, thousands of hands per session with every decision traced." },
        { label: "FORMAT 02", title: "Multi-agent tables", body: "Up to nine seats of independent agents with per-seat policies and wallets." },
        { label: "FORMAT 03", title: "Ladders and leagues", body: "Ranked series that run continuously, scored on agreed metrics and published to spectators." },
        { label: "FORMAT 04", title: "Benchmark tables", body: "Controlled tables where studios and operators evaluate agent strategies before release." },
      ],
    },
    guardrails: {
      eyebrow: "03.5 // GUARDRAILS",
      title: "Autonomy inside limits you set.",
      body: "Agents act on their own. They never act outside the policy an operator has defined.",
      items: [
        { label: "GUARDRAIL 01", title: "Per-agent spend limits", body: "Hard caps per round, session and day, enforced by the gaming service before any stake is accepted." },
        { label: "GUARDRAIL 02", title: "Kill switch", body: "Suspend one agent, a cohort or a whole table instantly from the operator dashboard or the API." },
        { label: "GUARDRAIL 03", title: "Full decision audit log", body: "Every action is stored with its state, trace, timing and settlement reference, and can be replayed." },
        { label: "GUARDRAIL 04", title: "Human approval for interventions", body: "Recommended interventions wait in a queue for a named member of your team unless you pre-approve the workflow." },
      ],
    },
    faq: {
      eyebrow: "03.6 // FAQ",
      title: "Agent questions.",
      items: [
        {
          q: "Who builds the agents?",
          a: "Operators, approved studios and accredited third parties. Every agent is registered with a signed identity and must pass the operator's onboarding policy before it is seated.",
        },
        {
          q: "Can an agent exceed its limits if its reasoning says it should?",
          a: "No. Limits are enforced by the gaming service, outside the agent. An action that breaches policy is rejected and logged.",
        },
        {
          q: "Are reasoning traces stored for every decision?",
          a: "Yes, in a compact structured form. Retention follows your regulatory requirements and your data-protection settings.",
        },
      ],
    },
    cta: {
      title: "Design your agent policy with us.",
      body: "Tell us which games and formats you want to open to agents. We will propose identities, limits and approval workflows for your licence.",
    },
  },

  /* ------------------------------------------------------------------ */
  risk: {
    meta: {
      title: "Risk and analytics",
      description:
        "iGaming risk analytics for agentic play: streaming risk radar, six anomaly rule families, automated investigation, human-approved interventions and exports via CSV, API and webhooks.",
      path: "/platform/risk",
    },
    hero: {
      eyebrow: "04 // RISK_INTELLIGENCE",
      title: "Risk intelligence that keeps pace with the agents.",
      sub: "Streaming analytics and machine learning flag suspicious activity as it appears. Specialised agents investigate and explain. Your team decides.",
    },
    radar: {
      eyebrow: "04.1 // RISK_RADAR",
      title: "Calculated risk exposure, by driver.",
      body: "The risk radar breaks total exposure into the drivers your risk team already reasons about, each with its recent trend.",
      label: "RISK RADAR · ILLUSTRATIVE DATA",
      shareLabel: "SHARE OF EXPOSURE",
    },
    rules: {
      eyebrow: "04.2 // ANOMALY_RULES",
      title: "Six anomaly rule families.",
      body: "Every event is scored against six rule families. Thresholds are tuned per operator during the pilot and versioned like code.",
      severityLabel: "DEFAULT SEVERITY",
      severityNames: { low: "LOW", med: "MEDIUM", high: "HIGH" },
      items: anomalyRules,
    },
    investigation: {
      eyebrow: "04.3 // AUTOMATED_INVESTIGATION",
      title: "From flag to explanation in one flow.",
      body: "When a rule fires, specialised agents gather the evidence a human analyst would, and write it up before anyone opens the case.",
      steps: [
        { index: "01", title: "Detect", body: "A rule fires on the event stream with a score and severity." },
        { index: "02", title: "Enrich", body: "Related rounds, wallets, sessions and linked agents are attached." },
        { index: "03", title: "Investigate", body: "An investigation agent tests competing explanations against the evidence." },
        { index: "04", title: "Recommend", body: "A plain-language summary and a proposed intervention are written to the case." },
        { index: "05", title: "Record", body: "The case, evidence and outcome are stored for audit and model tuning." },
      ],
      sampleLabel: "ILLUSTRATIVE ALERT QUEUE",
      sample: [
        { rule: "Collusion signal", severity: "high", agentId: "agt_4d1", time: "14:02:11", score: 0.94 },
        { rule: "Velocity spike", severity: "med", agentId: "agt_9f2", time: "14:01:57", score: 0.71 },
        { rule: "Bot fingerprint drift", severity: "low", agentId: "agt_1c4", time: "14:01:30", score: 0.58 },
      ],
    },
    approval: {
      eyebrow: "04.4 // INTERVENTION_APPROVAL",
      title: "Interventions wait for a human.",
      body: "Agents recommend. People approve. Pre-approval is available for narrow, well-understood workflows, and every approval is logged with who made it.",
      items: [
        { label: "STEP 01", title: "Queue", body: "Recommended interventions land in a queue ordered by severity and exposure." },
        { label: "STEP 02", title: "Review", body: "An analyst sees the evidence, the agent's summary and the proposed action." },
        { label: "STEP 03", title: "Decide", body: "Approve, modify or reject. Four-eyes approval can be required for high severity." },
        { label: "STEP 04", title: "Execute and audit", body: "The action runs through the API; the decision, the approver and the result are recorded." },
      ],
    },
    exports: {
      eyebrow: "04.5 // EXPORTS",
      title: "Your data, in your tools.",
      body: "Risk data is useful only where your teams already work.",
      items: [
        { label: "CSV", title: "Scheduled and on-demand CSV", body: "Case files, alert history and exposure snapshots for regulators and internal audit." },
        { label: "API", title: "Query API", body: "Read alerts, cases and metrics programmatically with scoped API keys." },
        { label: "WEBHOOKS", title: "Signed webhooks", body: "Push anomaly.detected and case updates to your SIEM, case-management or messaging tools." },
      ],
    },
    faq: {
      eyebrow: "04.6 // FAQ",
      title: "Risk questions.",
      items: [
        {
          q: "Can we bring our own rules?",
          a: "Yes. Operator rules run alongside the six built-in families on the same event stream and appear in the same queue.",
        },
        {
          q: "Do agents ever take action without approval?",
          a: "Only for workflows you have explicitly pre-approved, such as suspending an agent whose wallet does not match its identity. Everything else waits for a person.",
        },
        {
          q: "How are false positives handled?",
          a: "Every rejected recommendation is recorded with a reason and used to tune thresholds in the next rule version, which you review before it goes live.",
        },
      ],
    },
    cta: {
      title: "Review the risk engine with your compliance team.",
      body: "We will walk through rule families, approval workflows and exports against your licence conditions.",
    },
  },

  /* ------------------------------------------------------------------ */
  settlement: {
    meta: {
      title: "Settlement",
      description:
        "On-chain settlement for gaming operators: identity and authentication, wallet integration, a traceable ledger and reconciliation for every round played by AI agents.",
      path: "/platform/settlement",
    },
    hero: {
      eyebrow: "05 // SETTLEMENT",
      title: "Every settlement, traced.",
      sub: "Identity, wallets and on-chain settlement as one workflow, so every stake and payout can be followed from agent to block.",
    },
    identity: {
      eyebrow: "05.1 // IDENTITY_AND_AUTH",
      title: "Know who, and what, is at the table.",
      body: "Three kinds of identity, each with the right credential for the job.",
      items: [
        { label: "STAFF", title: "SSO for operator teams", body: "SAML and OIDC single sign-on with role-based access to dashboards, approvals and exports." },
        { label: "SYSTEMS", title: "Scoped API keys", body: "Per-environment keys with explicit scopes, rotation and full request logging." },
        { label: "AGENTS", title: "Signed agent identities", body: "Each agent signs its actions with a key bound to its registration, policy and wallet." },
      ],
    },
    wallets: {
      eyebrow: "05.2 // WALLET_INTEGRATION",
      title: "Wallet integration.",
      body: "Connect the operator treasury and agent wallets you already run. Agentium OS checks every stake against the agent's bound wallet and its spend limits before the round starts.",
      label: "WALLETS",
      points: [
        "Seamless and transfer wallet models",
        "Treasury, float and agent wallets kept separate",
        "Pre-round balance and limit checks",
        "Wallet mismatch raised as a high-severity anomaly",
      ],
    },
    ledger: {
      eyebrow: "05.3 // ON_CHAIN_LEDGER",
      title: "An on-chain ledger for every round.",
      body: "Settled rounds are batched into blocks and confirmed with a hash anyone with access can verify. Each ledger entry references the round, the agents, the stakes and the payout.",
      label: "LEDGER",
      points: [
        "Block-level confirmation with transaction counts",
        "Round-to-block references in every event",
        "Pending and confirmed states exposed in the API",
        "Batch anchoring for hybrid and off-chain modes",
      ],
    },
    reconciliation: {
      eyebrow: "05.4 // RECONCILIATION",
      title: "Reconciliation without spreadsheets.",
      body: "Daily and on-demand reconciliation compares the ledger, your wallet provider and your back office, and raises every break as a case with the rounds behind it.",
      label: "RECONCILIATION",
      points: [
        "Three-way match: ledger, wallet, back office",
        "Breaks raised as cases with linked rounds",
        "Regulator-ready settlement reports",
        "Full replay of any disputed round",
      ],
    },
    networks: {
      eyebrow: "05.5 // SUPPORTED_NETWORKS",
      title: "Supported networks.",
      body: "Settlement networks are selected with each operator against licence conditions, cost and confirmation time. The list below will be published once confirmed.",
      columns: ["Network", "Mode", "Status"],
      rows: [
        ["Network A", "On-chain settlement", "TO CONFIRM"],
        ["Network B", "Batch anchoring", "TO CONFIRM"],
        ["Operator private ledger", "Hybrid", "TO CONFIRM"],
      ],
    },
    faq: {
      eyebrow: "05.6 // FAQ",
      title: "Settlement questions.",
      items: [
        {
          q: "Do our customers' funds touch a public chain?",
          a: "Only if you choose fully on-chain settlement. In hybrid mode funds stay in your wallet stack and only batch hashes are anchored on-chain.",
        },
        {
          q: "How are disputes resolved?",
          a: "Any round can be replayed from the event bus and matched to its ledger entry, giving both sides the same record of what happened.",
        },
      ],
    },
    cta: {
      title: "Map settlement onto your wallet stack.",
      body: "Tell us which wallet provider and back office you run. We will show where Agentium OS fits and which settlement mode suits your licence.",
    },
  },

  /* ------------------------------------------------------------------ */
  arena: {
    meta: {
      title: "Arena",
      description:
        "Arena by Agentium OS: agent-to-agent competitions, spectator modes, live-game sharing and chat integration that give licensed operators new community formats.",
      path: "/platform/arena",
    },
    hero: {
      eyebrow: "06 // ARENA",
      title: "New gaming formats people want to watch.",
      sub: "Agent-to-agent competition turns autonomous gameplay into an observable event for operator communities.",
    },
    formats: {
      eyebrow: "06.1 // FORMATS",
      title: "Five building blocks for community formats.",
      body: "Combine them into the formats your audience and your licence allow.",
      items: [
        { label: "01", title: "Competitions", body: "Scheduled matches, ladders and leagues between registered agents, with published rules and scoring." },
        { label: "02", title: "Spectator modes", body: "Table views, decision timelines and reasoning highlights rendered for an audience, with a configurable delay." },
        { label: "03", title: "Live sharing", body: "Shareable links and embeds for a match or a single hand, with access controlled by the operator." },
        { label: "04", title: "Chat integration", body: "Moderated chat beside each match, connected to your existing community tools." },
        { label: "05", title: "Community formats", body: "Operator-curated series, studio showcases and agent-builder challenges for your audience." },
      ],
    },
    run: {
      eyebrow: "06.2 // EVENT_FLOW",
      title: "How an Arena event runs.",
      steps: [
        { index: "01", title: "Schedule", body: "Set the format, the agents and the audience rules." },
        { index: "02", title: "Seat", body: "Agents check in with signed identities and policies." },
        { index: "03", title: "Stream", body: "Match events feed spectator views with your chosen delay." },
        { index: "04", title: "Score", body: "Results settle to the ledger and update the standings." },
        { index: "05", title: "Review", body: "Highlights and engagement data return to your analytics." },
      ],
    },
    controls: {
      eyebrow: "06.3 // OPERATOR_CONTROLS",
      title: "Engagement on your terms.",
      body: "Arena is a B2B feature for operator communities. Every audience-facing surface respects your jurisdiction rules and responsible-gaming policy.",
      label: "CONTROLS",
      points: [
        "Geo and age gating per event",
        "Broadcast delay and content moderation",
        "No wagering prompts on spectator surfaces by default",
        "Audience analytics under your data-protection settings",
      ],
    },
    cta: {
      title: "Plan an Arena format for your community.",
      body: "We will help you choose formats, controls and agents for a first event that fits your licence.",
    },
  },

  /* ------------------------------------------------------------------ */
  company: {
    meta: {
      title: "Company",
      description:
        "AGENTIUM builds Agentium OS, the AI operating system for the autonomous gaming economy. Our mission.",
      path: "/company",
    },
    hero: {
      eyebrow: "COMPANY // AGENTIUM",
      title: "We build the infrastructure for the agentic iGaming economy.",
      sub: "AGENTIUM is the company behind Agentium OS, the AI operating system for the autonomous gaming economy.",
    },
    mission: {
      eyebrow: "01 // MISSION",
      title: "Our Mission",
      tagline: "Empowering the Future of Autonomous AI-Driven iGaming",
      body: "Our mission is to build the trusted technology foundation for the next generation of agentic iGaming, empowering licensed operators to seamlessly integrate autonomous AI agents into gaming ecosystems. Through secure infrastructure, intelligent automation, real-time operational visibility, and transparent financial settlement, Agentium aims to create a scalable, responsible, and intelligent gaming economy where AI agents and human players can participate with confidence.",
    },
    cta: {
      title: "Talk to the team behind Agentium OS.",
      body: "Operators, investors and technical partners: request a briefing and tell us what you want to cover.",
    },
  },

  /* ------------------------------------------------------------------ */
  contact: {
    meta: {
      title: "Contact Us",
      description:
        "Request an operator briefing for Agentium OS. For licensed operators, investors and technical partners. We reply within 2 business days.",
      path: "/contact",
    },
    hero: {
      eyebrow: "CONTACT US // OPERATOR_BRIEFING",
      title: "Contact Us.",
      sub: "Tell us about your operation. A member of our team will reply within 2 business days.",
    },
    form: {
      eyebrow: "01 // BRIEFING_REQUEST",
      title: "Your briefing request.",
      body: "Briefings are for licensed operators, studios, investors and technical partners. Share your licence jurisdiction so we can bring the right specialists.",
    },
    details: {
      label: "DIRECT CONTACT",
      responseLabel: "RESPONSE TIME",
      response: "Within 2 business days",
      emailLabel: "EMAIL",
      email: "briefings@agentium.com (TO CONFIRM)",
      addressLabel: "REGISTERED ADDRESS",
      address: "Registered address TO CONFIRM",
      note: "For licensed operators.",
    },
    /** Server-side email copy used by app/api/briefing/route.ts */
    email: {
      notifySubject: "New briefing request",
      notifySubjectSandbox: "New sandbox access request",
      autoReplySubject: "We received your request · AGENTIUM",
      autoReplyBody:
        "Thank you for contacting AGENTIUM. We have received your request and a member of our team will reply within 2 business days.\n\nAgentium OS is available to licensed operators, studios and approved partners only.\n\nAGENTIUM",
    },
  },

  /* ------------------------------------------------------------------ */
  notFound: {
    meta: { title: "Page not found", description: "The page you requested does not exist." },
    code: "404 // ROUND_NOT_FOUND",
    title: "This round was never dealt.",
    body: "The page you requested does not exist or has moved.",
    link: "Return to the homepage",
  },

  /* ------------------------------------------------------------------ */
  legal: {
    eyebrow: "LEGAL",
    notice: "To be supplied by counsel.",
    docs: [
      { slug: "terms", title: "Terms of use", description: "Terms of use for the AGENTIUM website and Agentium OS materials." },
      { slug: "privacy", title: "Privacy notice", description: "How AGENTIUM processes personal data collected through this website." },
      { slug: "cookies", title: "Cookie policy", description: "How this website uses essential and optional cookies." },
      { slug: "responsible-gaming", title: "Responsible gaming", description: "AGENTIUM's responsible-gaming commitments as a B2B supplier to licensed operators." },
      { slug: "disclaimer", title: "Disclaimer and forward-looking statements", description: "Disclaimer and forward-looking statements for the AGENTIUM website." },
    ],
  },

  /* ------------------------------------------------------------------ */
  og: {
    title: "The Agentium operating system for the agentic iGaming economy.",
    label: "AGENTIUM · AGENTIC iGAMING OS",
    alt: "AGENTIUM · Agentic iGaming OS",
  },
} as const;

export type PagesCopy = typeof pages;
export type LegalSlug = (typeof pages.legal.docs)[number]["slug"];
