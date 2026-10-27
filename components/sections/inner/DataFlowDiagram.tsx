import { BracketPanel } from "@/components/ui";

const CONFIG = {
  viewBox: { w: 1280, h: 380 },
  node: { w: 170, h: 76, gap: 40, startX: 20 },
  mainY: 190,
  outputY: [96, 284] as const,
  forkX: 1060,
  dash: "6 10",
  dashLoop: 32,
  speedS: 1.4,
} as const;

export interface DataFlowNode {
  readonly label: string;
  readonly sub: string;
  readonly body: string;
}

export interface DataFlowDiagramProps {
  /** Exactly seven nodes: five in sequence, then two outputs (dashboards, ledger). */
  nodes: readonly DataFlowNode[];
  label: string;
  title: string;
  desc: string;
}

interface Box {
  x: number;
  y: number;
}

/** Animated SVG data-flow diagram (CSS stroke-dashoffset; static under reduced motion). */
export function DataFlowDiagram({ nodes, label, title, desc }: DataFlowDiagramProps) {
  const { w, h, gap, startX } = CONFIG.node;
  const step = w + gap;
  const main: Box[] = [0, 1, 2, 3, 4].map((i) => ({ x: startX + i * step, y: CONFIG.mainY - h / 2 }));
  const outX = startX + 5 * step;
  const outs: Box[] = CONFIG.outputY.map((cy) => ({ x: outX, y: cy - h / 2 }));
  const boxes = [...main, ...outs];

  const edges: string[] = [];
  for (let i = 0; i < 4; i++) {
    edges.push(`M${main[i].x + w} ${CONFIG.mainY} H${main[i + 1].x - 6}`);
  }
  const last = main[4];
  for (const cy of CONFIG.outputY) {
    edges.push(`M${last.x + w} ${CONFIG.mainY} H${CONFIG.forkX} V${cy} H${outX - 6}`);
  }

  return (
    <BracketPanel label={label} className="p-5 md:p-8">
      <style>{`
        .cv-flow-dash { stroke-dasharray: ${CONFIG.dash}; animation: cv-flow ${CONFIG.speedS}s linear infinite; }
        @keyframes cv-flow { to { stroke-dashoffset: -${CONFIG.dashLoop}; } }
        @media (prefers-reduced-motion: reduce) { .cv-flow-dash { animation: none; } }
      `}</style>
      <svg
        viewBox={`0 0 ${CONFIG.viewBox.w} ${CONFIG.viewBox.h}`}
        role="img"
        aria-labelledby="cv-flow-title cv-flow-desc"
        className="hidden h-auto w-full md:block"
      >
        <title id="cv-flow-title">{title}</title>
        <desc id="cv-flow-desc">{desc}</desc>
        <defs>
          <marker id="cv-flow-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M0 0 L8 4 L0 8 z" className="fill-copper" />
          </marker>
        </defs>

        {edges.map((d) => (
          <g key={d}>
            <path d={d} fill="none" className="stroke-line-strong" strokeWidth={1} markerEnd="url(#cv-flow-arrow)" />
            <path d={d} fill="none" className="cv-flow-dash stroke-copper" strokeWidth={1.5} />
          </g>
        ))}

        {boxes.map((b, i) => {
          const n = nodes[i];
          if (!n) return null;
          const output = i >= 5;
          return (
            <g key={n.label}>
              <rect
                x={b.x}
                y={b.y}
                width={w}
                height={h}
                rx={2}
                className={output ? "fill-bg-elev-2 stroke-copper/70" : "fill-bg-elev stroke-line-strong"}
                strokeWidth={1}
              />
              <path d={`M${b.x} ${b.y + 8} V${b.y} H${b.x + 8}`} fill="none" className="stroke-copper" strokeWidth={1} />
              <path
                d={`M${b.x + w - 8} ${b.y + h} H${b.x + w} V${b.y + h - 8}`}
                fill="none"
                className="stroke-copper"
                strokeWidth={1}
              />
              <text
                x={b.x + 14}
                y={b.y + 22}
                className="fill-text-faint font-mono"
                fontSize={10}
                letterSpacing="0.08em"
              >
                {String(i + 1).padStart(2, "0")}
              </text>
              <text x={b.x + 14} y={b.y + 44} className="fill-text font-sans" fontSize={14} fontWeight={500}>
                {n.label}
              </text>
              <text
                x={b.x + 14}
                y={b.y + 62}
                className="fill-text-dim font-mono"
                fontSize={9.5}
                letterSpacing="0.06em"
              >
                {n.sub}
              </text>
            </g>
          );
        })}
      </svg>

      <ol className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 md:mt-8 md:border-t md:border-line md:pt-8 lg:grid-cols-4">
        {nodes.map((n, i) => (
          <li key={n.label} className="flex gap-4">
            <span className="t-label t-num pt-[3px] text-copper">{String(i + 1).padStart(2, "0")}</span>
            <span className="flex flex-col gap-1">
              <span className="text-[15px] font-medium text-text">{n.label}</span>
              <span className="text-[14px] leading-relaxed text-text-dim">{n.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </BracketPanel>
  );
}
