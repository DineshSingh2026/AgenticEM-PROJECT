import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Nav, Footer, CookieBanner, SkipLink } from "@/components/ui";
import { SceneRoot } from "@/components/scenes/SceneRoot";
import { IntroFilm } from "@/components/intro/IntroFilm";

const display = Inter_Tight({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-display", display: "swap" });
const sans = Inter({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Agentium OS · AI infrastructure for licensed gaming operators",
    template: "%s | Agentium OS",
  },
  description:
    "Agentium OS is agentic gaming infrastructure for licensed operators: run, monitor and settle AI-agent gameplay at machine speed with real-time gaming analytics, iGaming risk analytics and on-chain settlement.",
  applicationName: "Agentium OS",
  openGraph: { type: "website", siteName: "AGENTIUM · Agentic iGaming OS" },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = { themeColor: "#0B0D10", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="bg-bg text-text">
        <IntroFilm />
        <SkipLink />
        <SceneRoot />
        <Nav />
        <main id="main" className="relative z-10">
          {children}
        </main>
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
