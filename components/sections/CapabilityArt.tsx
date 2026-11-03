import { useId, type CSSProperties, type ReactNode } from "react";

/*
 * Bespoke line illustrations for the 02.1 capability tiles.
 *
 * Every piece shares one system: a 640×240 viewBox rendered with `slice`, so narrow tiles show the
 * central "safe zone" (x 160–480, y 36–204) and wide tiles reveal the decorative wings either side.
 * Strokes are hairlines (non-scaling, see .cap-art in globals.css); structure = line-strong, primary =
 * copper, highlight = data-gold, secondary = steel. All motion is CSS (.cap-*), deterministic and
 * disabled under prefers-reduced-motion — no randomness in render, so SSR output is stable.
 */

const cd = (s: number) => ({ "--cd": `${s}s` }) as CSSProperties;

function useUid(prefix: string) {
  return `${prefix}${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
}

function Frame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 640 240"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      fill="none"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-art={label}
    >
      {children}
    </svg>
  );
}

function Mono({ x, y, children, className = "fill-text-faint", anchor = "start" }: { x: number; y: number; children: ReactNode; className?: string; anchor?: "start" | "middle" | "end" }) {
  return (
    <text x={x} y={y} fontSize={8.5} letterSpacing={1.2} textAnchor={anchor} className={`font-mono ${className}`} stroke="none">
      {children}
    </text>
  );
}

/** Glowing gold node with a pinging halo. */
function Node({ x, y, d = 0, r = 3.5 }: { x: number; y: number; d?: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r * 2.6} className="cap-ping stroke-data-gold/50" style={cd(d)} />
      <circle cx={x} cy={y} r={r} className="fill-data-gold stroke-none" />
    </g>
  );
}

/* ------------------------------------------------------------------ 01 */
export function ArtNetwork() {
  const glow = useUid("g1");
  const cx = 320;
  const cy = 122;
  const nodes: [number, number, number][] = [
    [284, 94, 0], [352, 86, 0.6], [300, 142, 1.2], [368, 140, 1.8], [330, 176, 2.4], [262, 128, 3],
  ];
  const chips = [
    { y: 62, l: "PRV_01" }, { y: 122, l: "PRV_02" }, { y: 182, l: "PRV_03" },
  ];
  const chipsR = [
    { y: 62, l: "PRV_04" }, { y: 122, l: "PRV_05" }, { y: 182, l: "PRV_06" },
  ];
  return (
    <Frame label="network">
      <defs>
        <radialGradient id={glow}>
          <stop offset="0" stopColor="rgb(245 181 68)" stopOpacity="0.22" />
          <stop offset="1" stopColor="rgb(245 181 68)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={120} fill={`url(#${glow})`} stroke="none" />

      {/* provider chips (wings) */}
      {chips.map((c, i) => (
        <g key={c.l}>
          <path d={`M132 ${c.y} C 190 ${c.y}, 200 ${cy + (c.y - cy) * 0.45}, ${cx - 80} ${cy + (c.y - cy) * 0.45}`} className="cap-flow stroke-copper/60" style={cd(i * 0.4)} />
          <rect x={28} y={c.y - 13} width={104} height={26} rx={2} className="fill-bg-elev stroke-line-strong" />
          <circle cx={42} cy={c.y} r={2.5} className="cap-blink fill-data-green stroke-none" style={cd(i * 0.5)} />
          <Mono x={52} y={c.y + 3} className="fill-text-dim">{c.l}</Mono>
          <path d={`M120 ${c.y - 4} L124 ${c.y} L120 ${c.y + 4} L116 ${c.y} Z`} className="fill-copper stroke-none" />
        </g>
      ))}
      {chipsR.map((c, i) => (
        <g key={c.l}>
          <path d={`M508 ${c.y} C 450 ${c.y}, 440 ${cy + (c.y - cy) * 0.45}, ${cx + 80} ${cy + (c.y - cy) * 0.45}`} className="cap-flow stroke-copper/60" style={cd(0.2 + i * 0.4)} />
          <rect x={508} y={c.y - 13} width={104} height={26} rx={2} className="fill-bg-elev stroke-line-strong" />
          <circle cx={522} cy={c.y} r={2.5} className="cap-blink fill-data-green stroke-none" style={cd(0.3 + i * 0.5)} />
          <Mono x={532} y={c.y + 3} className="fill-text-dim">{c.l}</Mono>
          <path d={`M600 ${c.y - 4} L604 ${c.y} L600 ${c.y + 4} L596 ${c.y} Z`} className="fill-copper stroke-none" />
        </g>
      ))}

      {/* globe */}
      <circle cx={cx} cy={cy} r={80} className="fill-bg/70 stroke-steel/60" />
      <ellipse cx={cx} cy={cy} rx={80} ry={26} className="stroke-steel/30" />
      <ellipse cx={cx} cy={cy - 42} rx={68} ry={12} className="stroke-steel/20" />
      <ellipse cx={cx} cy={cy + 42} rx={68} ry={12} className="stroke-steel/20" />
      <ellipse cx={cx} cy={cy} rx={28} ry={80} className="stroke-steel/30" />
      <ellipse cx={cx} cy={cy} rx={56} ry={80} className="stroke-steel/20" />
      <line x1={cx} y1={cy - 80} x2={cx} y2={cy + 80} className="stroke-steel/30" />

      {/* orbit */}
      <g transform={`translate(${cx} ${cy}) rotate(-14) scale(1 0.3)`}>
        <circle r={128} className="cap-orbit stroke-copper/70" />
      </g>

      {/* links between licensed nodes */}
      {[
        "M284 94 Q318 62 352 86",
        "M284 94 Q262 104 262 128",
        "M262 128 Q276 148 300 142",
        "M300 142 Q334 126 368 140",
        "M352 86 Q374 108 368 140",
        "M300 142 Q306 168 330 176",
        "M368 140 Q358 166 330 176",
      ].map((d, i) => (
        <path key={d} d={d} className="cap-flow stroke-data-gold/70" style={cd(i * 0.25)} />
      ))}
      {nodes.map(([x, y, d]) => (
        <Node key={`${x}-${y}`} x={x} y={y} d={d} />
      ))}
    </Frame>
  );
}

/* ------------------------------------------------------------------ 02 */
const glyph = (k: number, x: number, y: number) => {
  const c = "stroke-copper-soft/80";
  switch (k % 4) {
    case 0:
      return <circle cx={x} cy={y} r={4} className={c} />;
    case 1:
      return <path d={`M${x} ${y - 5} L${x + 5} ${y} L${x} ${y + 5} L${x - 5} ${y} Z`} className={c} />;
    case 2:
      return <path d={`M${x} ${y - 5} L${x + 5} ${y + 4} L${x - 5} ${y + 4} Z`} className={c} />;
    default:
      return <rect x={x - 4} y={y - 4} width={8} height={8} className={c} />;
  }
};

export function ArtAggregator() {
  const tiles = Array.from({ length: 12 }, (_, i) => ({ c: i % 3, r: Math.floor(i / 3), i }));
  const out = Array.from({ length: 9 }, (_, i) => ({ c: i % 3, r: Math.floor(i / 3), i }));
  const wing = Array.from({ length: 15 }, (_, i) => ({ c: i % 5, r: Math.floor(i / 5), i }));
  return (
    <Frame label="aggregator">
      {/* wing: loose catalogue on the left */}
      {wing.map(({ c, r, i }) => (
        <g key={i} opacity={0.25 + c * 0.12}>
          <rect x={22 + c * 26} y={78 + r * 30 + (c % 2) * 8} width={18} height={18} rx={2} className="stroke-line-strong" />
          {glyph(i + 1, 31 + c * 26, 87 + r * 30 + (c % 2) * 8)}
        </g>
      ))}

      {/* source tiles */}
      {tiles.map(({ c, r, i }) => (
        <g key={i} className="cap-blink" style={cd((i * 0.37) % 3)}>
          <rect x={166 + c * 24} y={76 + r * 24} width={18} height={18} rx={2} className={i % 5 === 0 ? "fill-copper/15 stroke-copper/70" : "fill-bg-elev stroke-line-strong"} />
          {glyph(i, 175 + c * 24, 85 + r * 24)}
        </g>
      ))}

      {/* funnel */}
      <path d="M244 68 L298 110 M244 176 L298 134" className="stroke-line-strong" />
      {["M246 88 L300 118", "M246 122 L300 122", "M246 156 L300 126"].map((d, i) => (
        <path key={d} d={d} className="cap-flow stroke-data-gold/80" style={cd(i * 0.3)} />
      ))}

      {/* hub */}
      <rect x={300} y={104} width={44} height={36} rx={3} className="cap-glow fill-data-gold/10 stroke-data-gold" />
      <Mono x={322} y={125} anchor="middle" className="fill-data-gold">AGG</Mono>
      <path d="M344 122 L380 122" className="cap-flow stroke-data-gold/80" />

      {/* aggregated grid */}
      <rect x={378} y={80} width={86} height={86} rx={3} className="stroke-copper/70" />
      {out.map(({ c, r, i }) => (
        <rect key={i} x={384 + c * 26} y={86 + r * 26} width={22} height={22} rx={2} className={i === 4 ? "fill-data-gold/25 stroke-data-gold" : "fill-copper/10 stroke-copper/50"} />
      ))}
      <Mono x={421} y={182} anchor="middle" className="fill-text-faint">1 CATALOGUE</Mono>

      {/* wing: unified list on the right */}
      <path d="M464 122 L498 122" className="stroke-line-strong" />
      <rect x={498} y={62} width={118} height={120} rx={2} className="fill-bg-elev/80 stroke-line-strong" />
      {Array.from({ length: 6 }, (_, i) => (
        <g key={i}>
          <rect x={508} y={74 + i * 17} width={6} height={6} className={i === 1 ? "fill-data-gold stroke-none" : "fill-copper/40 stroke-none"} />
          <rect x={520} y={75 + i * 17} width={[70, 54, 80, 46, 64, 58][i]} height={4} rx={1} className="fill-text-faint/40 stroke-none" />
        </g>
      ))}
    </Frame>
  );
}

/* ------------------------------------------------------------------ 03 */
function Agent({ x, y, dim = false, d = 0 }: { x: number; y: number; dim?: boolean; d?: number }) {
  return (
    <g opacity={dim ? 0.4 : 1}>
      <line x1={x} y1={y - 12} x2={x} y2={y - 18} className="stroke-copper/70" />
      <circle cx={x} cy={y - 19} r={1.8} className="cap-blink fill-data-gold stroke-none" style={cd(d)} />
      <rect x={x - 15} y={y - 12} width={30} height={24} rx={5} className="fill-bg-elev stroke-copper/80" />
      <circle cx={x - 6} cy={y} r={2.2} className="fill-data-gold stroke-none" />
      <circle cx={x + 6} cy={y} r={2.2} className="fill-data-gold stroke-none" />
    </g>
  );
}

export function ArtGateway() {
  const hex = (r: number) =>
    [-90, -30, 30, 90, 150, 210]
      .map((a) => {
        const t = (a * Math.PI) / 180;
        return `${(320 + r * Math.cos(t)).toFixed(1)},${(122 + r * Math.sin(t)).toFixed(1)}`;
      })
      .join(" ");
  const eps = [
    { y: 72, l: "REST" }, { y: 122, l: "WSS" }, { y: 172, l: "SDK" },
  ];
  return (
    <Frame label="gateway">
      {/* wing: more agents */}
      {[64, 112, 160].map((y, i) => (
        <g key={y}>
          <path d={`M88 ${y + 8} C 130 ${y + 8}, 140 ${72 + i * 50}, 180 ${72 + i * 50}`} className="stroke-line-strong" />
          <Agent x={72} y={y + 8} dim d={i * 0.6} />
        </g>
      ))}

      {/* agents → hub */}
      {[72, 122, 172].map((y, i) => (
        <path key={y} d={`M212 ${y} C 256 ${y}, 262 122, 286 122`} className="cap-flow stroke-data-gold/70" style={cd(i * 0.35)} />
      ))}
      {[72, 122, 172].map((y, i) => (
        <Agent key={y} x={196} y={y} d={0.4 + i * 0.5} />
      ))}

      {/* gateway hub */}
      <g>
        <circle cx={320} cy={122} r={48} className="cap-spin stroke-copper/60" strokeDasharray="2 6" />
      </g>
      <polygon points={hex(34)} className="cap-glow fill-bg-elev stroke-data-gold" />
      <polygon points={hex(22)} className="fill-data-gold/10 stroke-copper/70" />
      <Mono x={320} y={125} anchor="middle" className="fill-data-gold">API</Mono>

      {/* hub → endpoints */}
      {eps.map((e, i) => (
        <g key={e.l}>
          <path d={`M354 122 C 380 122, 384 ${e.y}, 404 ${e.y}`} className="cap-flow stroke-data-gold/70" style={cd(0.6 + i * 0.35)} />
          <rect x={404} y={e.y - 11} width={70} height={22} rx={2} className="fill-bg-elev stroke-line-strong" />
          <circle cx={414} cy={e.y} r={2.4} className="cap-blink fill-data-green stroke-none" style={cd(i * 0.7)} />
          <Mono x={422} y={e.y + 3} className="fill-text-dim">{e.l}</Mono>
        </g>
      ))}

      {/* wing: global reach */}
      <g opacity={0.8}>
        <circle cx={600} cy={122} r={82} className="stroke-steel/40" />
        <ellipse cx={600} cy={122} rx={36} ry={82} className="stroke-steel/25" />
        <ellipse cx={600} cy={122} rx={82} ry={28} className="stroke-steel/25" />
        {[[540, 96], [556, 150], [578, 74]].map(([x, y], i) => (
          <g key={x}>
            <path d={`M474 ${[72, 122, 172][i]} L${x} ${y}`} className="stroke-line-strong" strokeDasharray="2 4" />
            <Node x={x} y={y} r={2.6} d={i * 0.8} />
          </g>
        ))}
      </g>
    </Frame>
  );
}

/* ------------------------------------------------------------------ 04 */
const TICKS = [6, 10, 7, 14, 9, 18, 11, 8, 15, 22, 12, 9, 16, 26, 14, 10, 19, 13, 8, 17, 24, 15, 11, 20, 9, 13, 18, 10, 23, 14, 9, 16, 12, 20, 11, 15, 8, 13, 19, 10];

export function ArtSettlement() {
  return (
    <Frame label="settlement">
      {/* wing: incoming wagers */}
      {[[60, 82], [104, 140], [70, 176]].map(([x, y], i) => (
        <g key={x + y} opacity={0.45}>
          <circle cx={x} cy={y} r={13} className="stroke-copper/80" />
          <circle cx={x} cy={y} r={8} className="stroke-data-gold/70" strokeDasharray="3 2.4" />
          <path d={`M${x + 14} ${y} C 130 ${y}, 140 112, 170 112`} className="cap-flow stroke-copper/50" style={cd(i * 0.5)} />
        </g>
      ))}

      {/* wager chip */}
      <circle cx={196} cy={112} r={24} className="cap-glow fill-bg-elev stroke-copper" />
      <circle cx={196} cy={112} r={16} className="cap-spin stroke-data-gold" strokeDasharray="4 3" />
      <Mono x={196} y={115} anchor="middle" className="fill-data-gold">BET</Mono>
      <path d="M220 112 L246 112" className="cap-flow stroke-data-gold/80" />

      {/* ledger blocks */}
      {[246, 300, 354].map((x, i) => (
        <g key={x} className="cap-pulse" style={cd(i * 0.6)}>
          <rect x={x} y={94} width={44} height={36} rx={2} className={i === 1 ? "fill-data-gold/15 stroke-data-gold" : "fill-bg-elev stroke-copper/70"} />
          {[0, 1, 2].map((k) => (
            <rect key={k} x={x + 7} y={102 + k * 8} width={[30, 22, 26][(k + i) % 3]} height={2.5} rx={1} className="fill-text-faint/60 stroke-none" />
          ))}
          {i < 2 ? <path d={`M${x + 44} 112 L${x + 54} 112`} className="stroke-copper/80" /> : null}
        </g>
      ))}
      <path d="M398 112 L418 112" className="cap-flow stroke-data-gold/80" style={cd(0.8)} />

      {/* settlement */}
      <circle cx={440} cy={112} r={22} className="fill-data-green/10 stroke-data-green" />
      <path d="M430 112 L437 119 L451 105" className="stroke-data-green" strokeWidth={2} />

      {/* real-time ticks */}
      <line x1={166} y1={196} x2={474} y2={196} className="stroke-line-strong" />
      {TICKS.map((h, i) => (
        <line key={i} x1={170 + i * 7.6} y1={196} x2={170 + i * 7.6} y2={196 - h} className={`cap-blink ${i % 9 === 4 ? "stroke-data-gold" : "stroke-steel/60"}`} style={cd((i * 0.13) % 2.4)} />
      ))}
      <Mono x={166} y={160} className="fill-text-faint">T+0</Mono>
      <Mono x={474} y={160} anchor="end" className="fill-data-green">SETTLED</Mono>

      {/* wing: chain continues */}
      {[0, 1, 2, 3].map((k) => (
        <g key={k} opacity={0.6 - k * 0.12}>
          <path d={`M${462 + (k === 0 ? 0 : 36 + (k - 1) * 36)} 112 L${498 + k * 36} 112`} className="stroke-line-strong" />
          <rect x={498 + k * 36} y={100} width={26} height={24} rx={2} className="fill-bg-elev stroke-copper/50" />
        </g>
      ))}
    </Frame>
  );
}

/* ------------------------------------------------------------------ 05 */
export function ArtEconomics() {
  const area = useUid("g5");
  const L1 = [84, 122, 160].map((y) => [190, y] as const);
  const L2 = [70, 104, 140, 174].map((y) => [238, y] as const);
  const L3 = [104, 140].map((y) => [286, y] as const);
  const hot = new Set(["0-1", "1-2", "2-2", "1-0"]);
  const bars = [30, 44, 38, 58, 50, 70];
  return (
    <Frame label="economics">
      <defs>
        <linearGradient id={area} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgb(245 181 68)" stopOpacity="0.32" />
          <stop offset="1" stopColor="rgb(245 181 68)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* wing: raw data inputs */}
      {[60, 90, 122, 154, 184].map((y, i) => (
        <g key={y}>
          <path d={`M40 ${y} C 110 ${y}, 120 ${L1[Math.min(2, Math.floor(i / 2))]![1]}, 186 ${L1[Math.min(2, Math.floor(i / 2))]![1]}`} className="cap-flow stroke-steel/40" style={cd(i * 0.3)} />
          <rect x={26} y={y - 4} width={8} height={8} className="fill-steel/30 stroke-none" />
        </g>
      ))}

      {/* network */}
      {L1.map(([x1, y1], a) =>
        L2.map(([x2, y2], b) => (
          <line key={`a${a}${b}`} x1={x1} y1={y1} x2={x2} y2={y2} className={hot.has(`${a}-${b}`) ? "cap-flow stroke-data-gold/70" : "stroke-line-strong"} style={cd((a + b) * 0.2)} />
        )),
      )}
      {L2.map(([x1, y1], a) =>
        L3.map(([x2, y2], b) => (
          <line key={`b${a}${b}`} x1={x1} y1={y1} x2={x2} y2={y2} className={(a + b) % 3 === 0 ? "cap-flow stroke-data-gold/70" : "stroke-line-strong"} style={cd((a + b) * 0.2)} />
        )),
      )}
      {[...L1, ...L2].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={4.5} className="fill-bg stroke-steel/80" />
      ))}
      {L3.map(([x, y], i) => (
        <Node key={y} x={x} y={y} r={4} d={i * 1.1} />
      ))}
      <Mono x={238} y={198} anchor="middle" className="fill-copper">AI</Mono>

      {/* outputs → chart */}
      {L3.map(([x, y]) => (
        <path key={y} d={`M${x + 6} ${y} L326 ${y}`} className="stroke-copper/50" strokeDasharray="2 4" />
      ))}

      {/* economy chart */}
      <path d="M330 56 L330 180 L484 180" className="stroke-line-strong" />
      {[86, 118, 150].map((y) => (
        <line key={y} x1={330} y1={y} x2={484} y2={y} className="stroke-line/80" />
      ))}
      {bars.map((h, i) => (
        <rect key={i} x={340 + i * 24} y={180 - h} width={12} height={h} className="cap-grow fill-steel/15 stroke-steel/50" style={cd(i * 0.15)} />
      ))}
      <line x1={330} y1={112} x2={484} y2={112} className="stroke-copper/60" strokeDasharray="4 4" />
      <path d="M330 168 C 364 162, 380 134, 404 122 S 452 92, 482 70 L482 180 L330 180 Z" fill={`url(#${area})`} stroke="none" />
      <path d="M330 168 C 364 162, 380 134, 404 122 S 452 92, 482 70" className="cap-draw stroke-data-gold" strokeWidth={1.75} />
      <Node x={482} y={70} r={3.5} d={0.5} />

      {/* wing: distribution */}
      <path d="M500 180 L620 180" className="stroke-line-strong" />
      {[8, 18, 34, 54, 70, 76, 66, 48, 30, 16, 8].map((h, i) => (
        <rect key={i} x={506 + i * 10} y={180 - h} width={6} height={h} className={i === 5 ? "fill-data-gold/50 stroke-none" : "fill-copper/25 stroke-none"} />
      ))}
      <path d="M506 172 C 540 170, 548 100, 562 100 S 588 170, 616 172" className="stroke-copper/60" />
    </Frame>
  );
}

/* ------------------------------------------------------------------ 06 */
function Slab({ cx, y, w = 64, hot = false }: { cx: number; y: number; w?: number; hot?: boolean }) {
  const h = w * 0.36;
  const t = 10;
  const top = `${cx},${y - h} ${cx + w},${y} ${cx},${y + h} ${cx - w},${y}`;
  const left = `${cx - w},${y} ${cx},${y + h} ${cx},${y + h + t} ${cx - w},${y + t}`;
  const right = `${cx},${y + h} ${cx + w},${y} ${cx + w},${y + t} ${cx},${y + h + t}`;
  return (
    <g>
      <polygon points={left} className="fill-bg-elev-2 stroke-line-strong" />
      <polygon points={right} className="fill-bg-elev stroke-line-strong" />
      <polygon points={top} className={hot ? "fill-data-gold/10 stroke-data-gold" : "fill-bg-elev stroke-copper/70"} />
      {/* top-face circuitry */}
      <path d={`M${cx - w / 2} ${y} L${cx} ${y - h / 2} L${cx + w / 2} ${y} L${cx} ${y + h / 2} Z`} className={hot ? "stroke-data-gold/50" : "stroke-copper/30"} />
      {[0.25, 0.5, 0.75].map((f) => (
        <circle key={f} cx={cx + w * (f - 0.5) * 1.2} cy={y + t / 2 + h * 0.52} r={1.4} className="cap-blink fill-data-gold stroke-none" style={cd(f * 2 + y / 100)} />
      ))}
    </g>
  );
}

function Coin({ x, y, d = 0, size = 12 }: { x: number; y: number; d?: number; size?: number }) {
  return (
    <g className="cap-float" style={cd(d)}>
      <circle cx={x} cy={y} r={size} className="fill-data-gold/15 stroke-data-gold" />
      <circle cx={x} cy={y} r={size * 0.66} className="stroke-data-gold/60" />
      <path d={`M${x} ${y - size * 0.36} L${x + size * 0.36} ${y} L${x} ${y + size * 0.36} L${x - size * 0.36} ${y} Z`} className="fill-data-gold stroke-none" />
    </g>
  );
}

export function ArtTokens() {
  return (
    <Frame label="tokens">
      {/* wing: rack */}
      <g opacity={0.55}>
        <rect x={40} y={56} width={84} height={130} rx={2} className="fill-bg-elev stroke-line-strong" />
        {Array.from({ length: 7 }, (_, i) => (
          <g key={i}>
            <rect x={48} y={64 + i * 17} width={68} height={11} rx={1} className="stroke-line-strong" />
            <circle cx={56} cy={69.5 + i * 17} r={1.6} className="cap-blink fill-data-green stroke-none" style={cd(i * 0.35)} />
            <rect x={64} y={68.5 + i * 17} width={[34, 22, 40, 28, 18, 36, 26][i]} height={2} className="fill-text-faint/40 stroke-none" />
          </g>
        ))}
        <path d="M124 122 L200 140" className="cap-flow stroke-copper/50" />
      </g>

      {/* stack */}
      <Slab cx={268} y={170} />
      <Slab cx={268} y={136} />
      <Slab cx={268} y={102} hot />
      <path d="M268 64 L268 52" className="stroke-data-gold/60" strokeDasharray="2 3" />

      {/* emission arc */}
      <path d="M284 84 C 330 40, 400 40, 444 76" className="cap-flow stroke-data-gold/70" />
      <Coin x={322} y={58} d={0} size={10} />
      <Coin x={370} y={46} d={0.6} size={12} />
      <Coin x={418} y={58} d={1.2} size={10} />

      {/* treasury stack */}
      {[0, 1, 2, 3, 4].map((k) => (
        <g key={k}>
          <path d={`M424 ${172 - k * 9} L424 ${178 - k * 9} A 22 7 0 0 0 468 ${178 - k * 9} L468 ${172 - k * 9}`} className="fill-bg-elev stroke-data-gold/70" />
          <ellipse cx={446} cy={172 - k * 9} rx={22} ry={7} className={k === 4 ? "fill-data-gold/25 stroke-data-gold" : "fill-bg-elev stroke-data-gold/70"} />
        </g>
      ))}
      <path d="M446 88 L446 122" className="cap-flow stroke-data-gold/60" style={cd(0.4)} />
      <Mono x={446} y={204} anchor="middle" className="fill-text-faint">TOKEN</Mono>

      {/* wing: ledger */}
      <rect x={500} y={62} width={116} height={120} rx={2} className="fill-bg-elev/80 stroke-line-strong" />
      {Array.from({ length: 5 }, (_, i) => (
        <g key={i}>
          <circle cx={514} cy={80 + i * 22} r={5} className="stroke-data-gold/70" />
          <rect x={526} y={78 + i * 22} width={[46, 60, 38, 52, 44][i]} height={4} rx={1} className="fill-text-faint/40 stroke-none" />
          <rect x={592} y={78 + i * 22} width={14} height={4} rx={1} className={i === 0 ? "fill-data-green/70 stroke-none" : "fill-copper/40 stroke-none"} />
        </g>
      ))}
    </Frame>
  );
}

/* ------------------------------------------------------------------ 07 */
export function ArtDashboard() {
  const area = useUid("g7");
  const bars = [0.5, 0.75, 0.6, 0.9, 0.7];
  return (
    <Frame label="dashboard">
      <defs>
        <linearGradient id={area} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgb(201 130 91)" stopOpacity="0.35" />
          <stop offset="1" stopColor="rgb(201 130 91)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* wing: KPI card left */}
      <g opacity={0.7}>
        <rect x={34} y={70} width={110} height={100} rx={3} className="fill-bg-elev stroke-line-strong" />
        <rect x={46} y={82} width={36} height={3} rx={1} className="fill-text-faint/60 stroke-none" />
        <rect x={46} y={92} width={56} height={7} rx={1} className="fill-text/70 stroke-none" />
        <path d="M46 150 L60 142 L72 146 L86 130 L100 134 L114 118 L132 112" className="stroke-data-gold" />
        <path d="M46 160 L132 160" className="stroke-line-strong" />
      </g>

      {/* main window */}
      <g transform="translate(320 122) scale(0.9) translate(-320 -122)">
      <rect x={168} y={38} width={304} height={168} rx={4} className="cap-glow fill-bg-elev stroke-line-strong" />
      <path d="M168 54 L472 54" className="stroke-line-strong" />
      {[178, 186, 194].map((x, i) => (
        <circle key={x} cx={x} cy={46} r={2.2} className={i === 0 ? "fill-copper stroke-none" : "fill-line-strong stroke-none"} />
      ))}
      <rect x={290} y={43} width={60} height={6} rx={3} className="fill-line/80 stroke-none" />
      <circle cx={460} cy={46} r={2.4} className="cap-blink fill-data-green stroke-none" />

      {/* KPI row */}
      {[178, 276, 374].map((x, i) => (
        <g key={x}>
          <rect x={x} y={62} width={88} height={30} rx={2} className={i === 0 ? "fill-data-gold/10 stroke-data-gold/70" : "fill-bg/60 stroke-line"} />
          <rect x={x + 8} y={69} width={30} height={3} rx={1} className="fill-text-faint/70 stroke-none" />
          <rect x={x + 8} y={77} width={[46, 38, 42][i]} height={7} rx={1} className="fill-text/80 stroke-none" />
          <path d={`M${x + 72} ${84} L${x + 76} ${77} L${x + 80} ${84} Z`} className={i === 2 ? "fill-data-red/80 stroke-none" : "fill-data-green/80 stroke-none"} transform={i === 2 ? `rotate(180 ${x + 76} 80.5)` : undefined} />
        </g>
      ))}

      {/* line chart */}
      <rect x={178} y={100} width={186} height={98} rx={2} className="fill-bg/60 stroke-line" />
      {[124, 148, 172].map((y) => (
        <line key={y} x1={186} y1={y} x2={356} y2={y} className="stroke-line/80" />
      ))}
      <path d="M186 178 L206 168 L226 172 L248 150 L270 156 L292 132 L314 138 L336 116 L356 112 L356 190 L186 190 Z" fill={`url(#${area})`} stroke="none" />
      <path d="M186 178 L206 168 L226 172 L248 150 L270 156 L292 132 L314 138 L336 116 L356 112" className="cap-draw stroke-copper" strokeWidth={1.75} />
      <Node x={356} y={112} r={3} />

      {/* donut + bars */}
      <rect x={372} y={100} width={90} height={98} rx={2} className="fill-bg/60 stroke-line" />
      <circle cx={417} cy={132} r={20} className="stroke-line-strong" strokeWidth={6} />
      <g className="cap-spin-slow">
        <circle cx={417} cy={132} r={20} className="stroke-data-gold" strokeWidth={6} strokeDasharray="78 200" strokeLinecap="butt" />
        <circle cx={417} cy={132} r={20} className="stroke-copper" strokeWidth={6} strokeDasharray="0 80 26 200" strokeLinecap="butt" />
      </g>
      {bars.map((f, i) => (
        <rect key={i} x={382 + i * 15} y={190 - f * 26} width={9} height={f * 26} className={`cap-grow ${i === 3 ? "fill-data-gold/70" : "fill-steel/40"} stroke-none`} style={cd(i * 0.2)} />
      ))}

      </g>

      {/* wing: alert list right */}
      <g opacity={0.7}>
        <rect x={496} y={70} width={112} height={100} rx={3} className="fill-bg-elev stroke-line-strong" />
        {["fill-data-green", "fill-data-gold", "fill-data-red", "fill-data-green"].map((c, i) => (
          <g key={i}>
            <circle cx={508} cy={86 + i * 22} r={2.6} className={`${c} stroke-none`} />
            <rect x={518} y={84 + i * 22} width={[64, 50, 72, 44][i]} height={4} rx={1} className="fill-text-faint/50 stroke-none" />
          </g>
        ))}
      </g>
    </Frame>
  );
}

export const CAPABILITY_ART = [ArtNetwork, ArtAggregator, ArtGateway, ArtSettlement, ArtEconomics, ArtTokens, ArtDashboard] as const;
