import type { CSSProperties, ReactNode } from "react";

/*
 * Small line illustrations for the 02 // THE_BACKBONE pillar cards (A · aggregation, B · settlement,
 * C · AI intelligence). Same system as CapabilityArt: hairline strokes, structure = line-strong,
 * primary = copper, highlight = data-gold. Motion reuses the .cap-* classes and is switched off under
 * prefers-reduced-motion via .pillar-icon in globals.css. Decorative only (aria-hidden).
 */

const cd = (s: number) => ({ "--cd": `${s}s` }) as CSSProperties;

function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 64 64"
      fill="none"
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`pillar-icon shrink-0 overflow-visible ${className ?? ""}`}
    >
      {children}
    </svg>
  );
}

/** A · many provider cards converging into one hub. */
export function IconAggregation({ className }: { className?: string }) {
  const rows = [12, 32, 52];
  return (
    <Frame className={className}>
      {/* provider cards, slightly stacked */}
      {rows.map((y, i) => (
        <g key={y}>
          <rect x={5.5} y={y - 6.5} width={17} height={13} className="fill-bg-elev stroke-line-strong" />
          <line x1={8.5} y1={y - 2.5} x2={14} y2={y - 2.5} className="stroke-copper" />
          <line x1={8.5} y1={y + 1.5} x2={19} y2={y + 1.5} className="stroke-line-strong" />
          <path d={`M22.5 ${y} C 32 ${y}, 32 32, 39.5 32`} className="stroke-line-strong" />
          <path
            d={`M22.5 ${y} C 32 ${y}, 32 32, 39.5 32`}
            className="cap-flow stroke-copper"
            style={cd(i * 0.35)}
          />
        </g>
      ))}
      {/* hub */}
      <circle cx={47} cy={32} r={7.5} className="stroke-data-gold/70" />
      <circle cx={47} cy={32} r={11.5} className="cap-orbit stroke-line-strong" />
      <circle cx={47} cy={32} r={2.75} className="fill-data-gold stroke-none" />
      <circle cx={47} cy={32} r={7} className="cap-ping stroke-data-gold/60" />
      <line x1={58.5} y1={32} x2={62} y2={32} className="stroke-copper" />
    </Frame>
  );
}

/** B · a coin with a check, anchored to a chain of linked ledger blocks. */
export function IconSettlement({ className }: { className?: string }) {
  const blocks = [4.5, 25, 45.5];
  return (
    <Frame className={className}>
      {/* coin */}
      <circle cx={32} cy={17} r={12} className="cap-orbit stroke-line-strong" />
      <circle cx={32} cy={17} r={8.5} className="fill-bg-elev stroke-data-gold/80" />
      <path d="M28.2 17.2 L31 20 L36 14.4" className="stroke-data-gold" strokeWidth={1.4} />
      {/* drop into the middle block */}
      <line x1={32} y1={29} x2={32} y2={40.5} className="stroke-line" />
      <line x1={32} y1={29} x2={32} y2={40.5} className="cap-flow stroke-copper" />
      {/* chain */}
      {blocks.map((x, i) => (
        <g key={x}>
          <rect
            x={x}
            y={40.5}
            width={14}
            height={13}
            className={i === 1 ? "fill-copper/10 stroke-copper" : "fill-bg-elev stroke-line-strong"}
          />
          <line x1={x + 3.5} y1={45} x2={x + 10.5} y2={45} className={i === 1 ? "stroke-copper-soft" : "stroke-line-strong"} />
          <line x1={x + 3.5} y1={49} x2={x + 8} y2={49} className="stroke-line-strong" />
        </g>
      ))}
      {/* links between blocks */}
      {[18.5, 39].map((x, i) => (
        <g key={x}>
          <rect x={x - 0.5} y={44.5} width={7.5} height={5} rx={2.5} className="stroke-copper/80" />
          <rect x={x - 0.5} y={44.5} width={7.5} height={5} rx={2.5} className="cap-blink stroke-data-gold" style={cd(0.4 + i * 0.8)} />
        </g>
      ))}
    </Frame>
  );
}

/** C · an AI chip with an internal agent/neural node graph. */
export function IconIntelligence({ className }: { className?: string }) {
  const pins = [22, 32, 42];
  const nodes: [number, number][] = [
    [24.5, 24.5],
    [39.5, 24.5],
    [24.5, 39.5],
    [39.5, 39.5],
  ];
  return (
    <Frame className={className}>
      {/* pins */}
      {pins.map((p) => (
        <g key={p} className="stroke-line-strong">
          <line x1={p} y1={6} x2={p} y2={14} />
          <line x1={p} y1={50} x2={p} y2={58} />
          <line x1={6} y1={p} x2={14} y2={p} />
          <line x1={50} y1={p} x2={58} y2={p} />
        </g>
      ))}
      <line x1={32} y1={2} x2={32} y2={14} className="cap-flow stroke-copper" />
      <line x1={50} y1={32} x2={62} y2={32} className="cap-flow stroke-copper" style={cd(0.7)} />
      {/* chip body */}
      <rect x={14} y={14} width={36} height={36} className="fill-bg-elev stroke-line-strong" />
      <rect x={17.5} y={17.5} width={29} height={29} className="stroke-copper/50" />
      {/* node graph */}
      <path d="M24.5 24.5 H39.5 V39.5 H24.5 Z" className="stroke-line-strong" />
      {nodes.map(([x, y], i) => (
        <line key={i} x1={x} y1={y} x2={32} y2={32} className="cap-flow stroke-copper/80" style={cd(i * 0.3)} />
      ))}
      {nodes.map(([x, y], i) => (
        <circle key={`n${i}`} cx={x} cy={y} r={2} className="cap-blink fill-bg-elev stroke-copper-soft" style={cd(i * 0.65)} />
      ))}
      <circle cx={32} cy={32} r={6.5} className="cap-ping stroke-data-gold/60" />
      <circle cx={32} cy={32} r={3} className="fill-data-gold stroke-none" />
    </Frame>
  );
}
