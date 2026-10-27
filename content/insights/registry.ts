import * as humanPace from "./from-human-pace-to-machine-speed.mdx";
import * as riskEngine from "./why-agentic-gaming-needs-its-own-risk-engine.mdx";
import * as onChain from "./settling-millions-of-rounds-on-chain.mdx";

export interface InsightMeta {
  title: string;
  description: string;
  date: string;
  status: "DRAFT" | "PUBLISHED";
}

const metaOf = (mod: unknown) => (mod as { meta: InsightMeta }).meta;

/** Static list of insight articles, newest first. Slugs match the MDX filenames. */
export const insights = [
  { slug: "from-human-pace-to-machine-speed", meta: metaOf(humanPace) },
  { slug: "why-agentic-gaming-needs-its-own-risk-engine", meta: metaOf(riskEngine) },
  { slug: "settling-millions-of-rounds-on-chain", meta: metaOf(onChain) },
] as const;

export type InsightSlug = (typeof insights)[number]["slug"];

export function getInsight(slug: string) {
  return insights.find((i) => i.slug === slug);
}
