import type { SceneName } from "@/lib/scene-store";
import { homeA } from "./home-a";
import { homeB } from "./home-b";

/**
 * "Global Platform" dropdown: one entry per homepage section, linking to its anchor on "/".
 * Labels mirror each section's eyebrow; descriptions reuse the section title from the home copy.
 * Keep the hrefs in sync with the section ids in components/sections/*.
 */
const platformMenu: { index: string; label: string; href: string; description: string; scene: SceneName }[] = [
  { index: "02", label: "The Backbone", href: "/#backbone", description: homeA.backbone.title, scene: "CasinoWheel" },
  {
    index: "02.1",
    label: "Platform Capabilities",
    href: `/#${homeA.backbone.revenue.id}`,
    description: homeA.backbone.revenue.title,
    scene: "CasinoWheel",
  },
  { index: "03", label: "Intelligence Layer", href: "/#intelligence", description: homeA.intelligence.title, scene: "Convergence" },
  { index: "06", label: "Risk Radar", href: "/#risk-radar", description: homeA.risk.title, scene: "AnomalyStream" },
  { index: "07", label: "Settlement", href: "/#settlement", description: homeB.settlement.title, scene: "Ledger" },
  { index: "09", label: "Flywheel", href: "/#flywheel", description: homeB.flywheel.title, scene: "FlywheelScene" },
];

export const site = {
  brand: {
    name: "AGENTIUM",
    product: "Agentium OS",
    homeLabel: "AGENTIUM home",
    tagline: "Autonomous solutions. Real impact.",
    logoAlt: "AGENTIUM",
    logoAltFull: "AGENTIUM. Autonomous solutions. Real impact.",
    mission:
      "AGENTIUM builds Agentium OS, the AI operating system for the autonomous gaming economy, for licensed operators.",
  },
  skipLink: "Skip to content",
  simulatedNetwork: "SIMULATED NETWORK",
  forLicensedOperators: "For licensed operators.",
  nav: {
    ariaLabel: "Main navigation",
    platform: { label: "Global Platform", menuLabel: "Platform sections", items: platformMenu },
    links: [
      { label: "Products", href: "/products" },
      { label: "Company", href: "/company" },
    ],
    /** Last nav item, rendered as a hairline copper pill on desktop. */
    contact: { label: "Contact Us", href: "/contact" },
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
          { label: "Products", href: "/products" },
          { label: "Architecture", href: "/platform/architecture" },
          { label: "AI agents", href: "/platform/agents" },
          { label: "Risk and analytics", href: "/platform/risk" },
          { label: "Settlement", href: "/platform/settlement" },
          { label: "Arena", href: "/platform/arena" },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "About", href: "/company" },
          { label: "Contact Us", href: "/contact" },
        ],
      },
      {
        title: "Legal",
        links: [
          { label: "Terms", href: "/legal/terms" },
          { label: "Privacy", href: "/legal/privacy" },
          { label: "Cookies", href: "/legal/cookies" },
          { label: "Disclaimer", href: "/legal/disclaimer" },
          { label: "Responsible gaming", href: "/legal/responsible-gaming" },
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
    submit: "Send request",
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
    title: "Talk to the Agentium OS team.",
    body: "Tell us about your games, volumes and licence. We will map a pilot against agreed performance benchmarks.",
    contactLink: { label: "View all contact details", href: "/contact" },
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
