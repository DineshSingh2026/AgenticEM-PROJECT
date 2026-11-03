import type { MetadataRoute } from "next";
import { pages } from "@/content/copy/pages";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const ROUTES: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/platform", priority: 0.9, changeFrequency: "monthly" },
  { path: "/products", priority: 0.9, changeFrequency: "monthly" },
  { path: "/platform/architecture", priority: 0.8, changeFrequency: "monthly" },
  { path: "/platform/agents", priority: 0.8, changeFrequency: "monthly" },
  { path: "/platform/risk", priority: 0.8, changeFrequency: "monthly" },
  { path: "/platform/settlement", priority: 0.8, changeFrequency: "monthly" },
  { path: "/platform/arena", priority: 0.7, changeFrequency: "monthly" },
  { path: "/company", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.8, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    ...ROUTES.map((r) => ({ url: `${SITE_URL}${r.path}`, lastModified: now, changeFrequency: r.changeFrequency, priority: r.priority })),
    ...pages.legal.docs.map((d) => ({
      url: `${SITE_URL}/legal/${d.slug}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
  ];
}
