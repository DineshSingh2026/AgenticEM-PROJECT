import type { Metadata } from "next";
import { copy } from "@/content/copy";
import { Hero } from "@/components/sections/Hero";
import { Backbone } from "@/components/sections/Backbone";
import { IntelligenceLayer } from "@/components/sections/IntelligenceLayer";
import { Architecture } from "@/components/sections/Architecture";
import { RoundLifecycle } from "@/components/sections/RoundLifecycle";
import { RiskIntel } from "@/components/sections/RiskIntel";
import { Settlement } from "@/components/sections/Settlement";
import { Resilience } from "@/components/sections/Resilience";
import { Flywheel } from "@/components/sections/Flywheel";
import { Deploy } from "@/components/sections/Deploy";
import { FinalCta } from "@/components/sections/FinalCta";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const meta = copy.home.meta;

export const metadata: Metadata = {
  title: { absolute: meta.title },
  description: meta.description,
  alternates: { canonical: "/" },
  openGraph: { title: meta.title, description: meta.description, url: "/", type: "website" },
  twitter: { title: meta.title, description: meta.description },
};

function buildJsonLd() {
  const { organization: org, software } = copy.home.jsonLd;
  const orgId = `${SITE_URL}/#organization`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": orgId,
      name: org.name,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/brand/agentium-logo.png`,
      description: org.description,
      slogan: org.slogan,
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: software.name,
      applicationCategory: software.applicationCategory,
      applicationSubCategory: software.applicationSubCategory,
      operatingSystem: software.operatingSystem,
      description: software.description,
      url: `${SITE_URL}/platform`,
      keywords: software.keywords.join(", "),
      audience: { "@type": "BusinessAudience", audienceType: software.audience },
      publisher: { "@id": orgId },
      provider: { "@id": orgId },
    },
  ];
}

export default function Home() {
  const jsonLd = buildJsonLd();
  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD from static copy; escape "<" so no string can close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Hero />
      <Backbone />
      <IntelligenceLayer />
      <Architecture />
      <RoundLifecycle />
      <RiskIntel />
      <Settlement />
      <Resilience />
      <Flywheel />
      <Deploy />
      <FinalCta />
    </>
  );
}
