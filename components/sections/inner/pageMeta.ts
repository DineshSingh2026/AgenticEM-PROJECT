import type { Metadata } from "next";

/** Builds per-page metadata. The root layout template appends "· Casino Verse OS | AGENTIUM". */
export function pageMeta(m: { title: string; description: string; path: string }): Metadata {
  return {
    title: m.title,
    description: m.description,
    alternates: { canonical: m.path },
    openGraph: {
      type: "website",
      siteName: "AGENTIUM · Casino Verse OS",
      title: `${m.title} · Casino Verse OS | AGENTIUM`,
      description: m.description,
      url: m.path,
    },
  };
}
