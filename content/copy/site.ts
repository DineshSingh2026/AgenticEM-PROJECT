import type { SceneName } from "@/lib/scene-store";

const platformMenu: { label: string; href: string; description: string; scene: SceneName }[] = [
  {
    label: "Platform overview",
    href: "/platform",
    description: "The four capability layers of Casino Verse OS in one view.",
    scene: "Convergence",
  },
  {
    label: "Architecture",
    href: "/platform/architecture",
    description: "A unified stack built for machine-speed execution.",
    scene: "ExplodedStack",
  },
  {
    label: "AI agents",
    href: "/platform/agents",
    description: "Agents that reason, with spend limits, audit logs and a kill switch.",
    scene: "AgentField",
  },
  {
    label: "Risk and analytics",
    href: "/platform/risk",
    description: "Streaming anomaly detection with human-approved interventions.",
    scene: "AnomalyStream",
  },
  {
    label: "Settlement",
    href: "/platform/settlement",
    description: "Identity, wallets and on-chain settlement for autonomous agents.",
    scene: "Ledger",
  },
  {
    label: "Arena",
    href: "/platform/arena",
    description: "Agent-to-agent competitions and spectator formats for communities.",
    scene: "ArenaGraph",
  },
];

export const site = {
  brand: {
    name: "AGENTIUM",
    product: "Casino Verse OS",
    homeLabel: "AGENTIUM home",
    tagline: "Autonomous solutions. Real impact.",
    logoAlt: "AGENTIUM",
    logoAltFull: "AGENTIUM — Autonomous solutions. Real impact.",
    mission:
      "AGENTIUM builds Casino Verse OS, the AI operating system for the autonomous gaming economy, for licensed operators.",
  },
  skipLink: "Skip to content",
  simulatedNetwork: "SIMULATED NETWORK",
  forLicensedOperators: "For licensed operators.",
  nav: {
    ariaLabel: "Main navigation",
    platform: { label: "Platform", menuLabel: "Platform pages", items: platformMenu },
    links: [
      { label: "Operators", href: "/operators" },
      { label: "Developers", href: "/developers" },
      { label: "Trust", href: "/trust" },
      { label: "Insights", href: "/insights" },
      { label: "Company", href: "/company" },
    ],
    cta: { label: "Request briefing", href: "/contact" },
    openMenu: "Open menu",
    closeMenu: "Close menu",
    mobileMenuLabel: "Site menu",
  },
  footer: {
    ariaLabel: "Footer",
    columns: [
      {
        title: "Platform",
        links: [
          { label: "Overview", href: "/platform" },
          { label: "Architecture", href: "/platform/architecture" },
          { label: "AI agents", href: "/platform/agents" },
          { label: "Risk and analytics", href: "/platform/risk" },
          { label: "Settlement", href: "/platform/settlement" },
          { label: "Arena", href: "/platform/arena" },
        ],
      },
      {
        title: "Developers",
        links: [
          { label: "API overview", href: "/developers" },
          { label: "Sandbox access", href: "/developers#sandbox" },
          { label: "Status", href: "/developers#status" },
          { label: "Changelog", href: "/developers#changelog" },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "About", href: "/company" },
          { label: "Insights", href: "/insights" },
          { label: "Careers", href: "/company#careers" },
          { label: "Contact", href: "/contact" },
        ],
      },
      {
        title: "Trust",
        links: [
          { label: "Security", href: "/trust#security" },
          { label: "Responsible gaming", href: "/legal/responsible-gaming" },
          { label: "Compliance", href: "/trust#compliance" },
        ],
      },
      {
        title: "Legal",
        links: [
          { label: "Terms", href: "/legal/terms" },
          { label: "Privacy", href: "/legal/privacy" },
          { label: "Cookies", href: "/legal/cookies" },
          { label: "Disclaimer", href: "/legal/disclaimer" },
        ],
      },
    ],
    copyright: "© AGENTIUM",
    address: "Registered address: TO CONFIRM",
    forwardLooking: { label: "Forward-looking statements", href: "/legal/disclaimer" },
    replayIntro: { label: "Replay intro", href: "/?intro=1" },
  },
  cookieBanner: {
    label: "COOKIES // ESSENTIAL_ONLY",
    body: "We use essential cookies only by default. Analytics are cookieless. You can allow optional preferences storage.",
    policy: { label: "Cookie policy", href: "/legal/cookies" },
    accept: "Allow optional",
    essential: "Essential only",
  },
  liveStrip: {
    ariaLabel: "Simulated network metrics",
    roundsPerSec: "ROUNDS / SEC",
    activeAgents: "ACTIVE AGENTS",
    settlements24h: "SETTLEMENTS (24H)",
    anomalies24h: "ANOMALIES FLAGGED (24H)",
    medianDecision: "MEDIAN DECISION",
  },
  briefing: {
    formLabel: "Operator briefing request",
    fields: {
      name: { label: "Name", placeholder: "Full name" },
      email: { label: "Work email", placeholder: "name@operator.com" },
      company: { label: "Company", placeholder: "Operator or studio" },
      jurisdiction: { label: "Licence jurisdiction", placeholder: "Select jurisdiction" },
      role: { label: "Role", placeholder: "Select role" },
      message: { label: "Message", placeholder: "Games, volumes and the use cases you want to explore" },
      consent: {
        label:
          "I agree that AGENTIUM may store and process these details to respond to my request, as described in the privacy policy.",
      },
      website: { label: "Website (leave empty)" },
    },
    jurisdictions: [
      "Malta",
      "UK",
      "Isle of Man",
      "Gibraltar",
      "Curaçao",
      "Kahnawake",
      "Ontario",
      "New Jersey",
      "Nevada",
      "Philippines",
      "Other",
    ],
    roles: [
      "Operator executive",
      "Product",
      "Risk and compliance",
      "Engineering",
      "Investor",
      "Partner",
    ],
    errors: {
      name: "Enter your name.",
      email: "Enter a valid work email.",
      company: "Enter your company.",
      jurisdiction: "Select a licence jurisdiction.",
      role: "Select your role.",
      message: "Keep the message under 2,000 characters.",
      consent: "Consent is required to process your request.",
      submit: "ERROR // REQUEST_NOT_SENT. Try again or email us directly.",
      rateLimited: "ERROR // RATE_LIMITED. Please try again later.",
    },
    required: "required",
    submit: "Request an operator briefing",
    submitting: "SENDING…",
    success: "REQUEST_RECEIVED // WE REPLY WITHIN 2 BUSINESS DAYS",
    successBody: "A member of the operator team will contact you at the address you provided.",
    privacy: { label: "Privacy policy", href: "/legal/privacy" },
    sandbox: {
      formLabel: "Sandbox access request",
      messageLabel: "What do you want to build?",
      messagePlaceholder: "Integration scope, languages, expected event volume",
      submit: "Request sandbox access",
      success: "REQUEST_RECEIVED // SANDBOX CREDENTIALS FOLLOW WITHIN 2 BUSINESS DAYS",
    },
  },
  ctaBand: {
    eyebrow: "NEXT // OPERATOR_BRIEFING",
    title: "Talk to the Casino Verse OS team.",
    body: "Tell us about your games, volumes and licence. We will map a pilot against agreed performance benchmarks.",
  },
  codeTabs: {
    label: "ILLUSTRATIVE API",
    copy: "Copy",
    copied: "Copied",
    tablistLabel: "Code language",
  },
  faq: { label: "FAQ" },
  featureTable: { feature: "Feature", benefit: "Business value", expand: "Show detail", chartLabel: "Relative trend" },
  alert: { severity: { low: "Low", med: "Medium", high: "High" }, score: "SCORE" },
  lab: {
    title: "UI kit lab",
    eyebrow: "LAB // UI_KIT",
    sub: "Internal preview of every UI component.",
  },
} as const;

export type SiteCopy = typeof site;
