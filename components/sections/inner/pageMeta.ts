import type { Metadata } from "next";

/** Builds per-page metadata. The root layout template appends "| Agentium · Agentic iGaming Intelligence Platform". */
export function pageMeta(m: { title: string; description: string; path: string }): Metadata {
  return {
    title: m.title,
    description: m.description,
    alternates: { canonical: m.path },
    openGraph: {
      type: "website",
      siteName: "AGENTIUM · Agentic iGaming Intelligence Platform",
      title: `${m.title} | Agentium · Agentic iGaming Intelligence Platform`,
      description: m.description,
      url: m.path,
    },
  };
}
