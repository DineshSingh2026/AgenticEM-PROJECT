import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { pages } from "@/content/copy/pages";
import { TOKENS } from "@/lib/tokens";

export const alt = pages.og.alt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CONFIG = {
  cell: 80,
  gridAlpha: 0.06,
  bracket: 28,
  inset: 48,
  /** Full AGENTIUM lockup (transparent PNG, 508x288) rendered at this height. */
  logoHeight: 200,
} as const;

const LOGO = {
  path: ["public", "brand", "agentium-logo.png"],
  width: 508,
  height: 288,
} as const;

function Bracket({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const b = `2px solid ${TOKENS.copper}`;
  const s: Record<string, string | number> = {
    position: "absolute",
    width: CONFIG.bracket,
    height: CONFIG.bracket,
    display: "flex",
  };
  if (pos[0] === "t") s.top = CONFIG.inset;
  else s.bottom = CONFIG.inset;
  if (pos[1] === "l") s.left = CONFIG.inset;
  else s.right = CONFIG.inset;
  if (pos[0] === "t") s.borderTop = b;
  else s.borderBottom = b;
  if (pos[1] === "l") s.borderLeft = b;
  else s.borderRight = b;
  return <div style={s} />;
}

export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), ...LOGO.path));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  const logoW = Math.round((LOGO.width / LOGO.height) * CONFIG.logoHeight);
  const grid = `rgba(236,238,241,${CONFIG.gridAlpha})`;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: TOKENS.bg,
        backgroundImage: `linear-gradient(${grid} 1px, transparent 1px), linear-gradient(90deg, ${grid} 1px, transparent 1px)`,
        backgroundSize: `${CONFIG.cell}px ${CONFIG.cell}px`,
        color: TOKENS.text,
        fontFamily: "sans-serif",
      }}
    >
      <Bracket pos="tl" />
      <Bracket pos="tr" />
      <Bracket pos="bl" />
      <Bracket pos="br" />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "88px 112px 112px",
          width: "100%",
          height: "100%",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (Satori) requires <img> */}
        <img
          src={logoSrc}
          width={logoW}
          height={CONFIG.logoHeight}
          alt=""
          style={{ marginLeft: -12 }}
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontFamily: "monospace",
              fontSize: 22,
              letterSpacing: "0.12em",
              color: TOKENS.copper,
              marginBottom: 28,
            }}
          >
            {pages.og.label}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 72,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              maxWidth: 940,
            }}
          >
            {pages.og.title}
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
