import type { CSSProperties, ReactNode } from "react";
import type { ProductCategoryKey, ProductFeatureKey } from "@/content/copy/products";

/*
 * Bespoke line art for /products. Same system as CapabilityArt: hairline strokes, structure =
 * line-strong, primary = copper, highlight = data-gold, secondary = steel. Motion reuses the shared
 * .cap-* classes in globals.css (deterministic CSS, disabled under prefers-reduced-motion).
 * Everything is computed from constants, so SSR output is stable.
 */

const cd = (s: number) => ({ "--cd": `${s}s` }) as CSSProperties;

/* ------------------------------------------------------------------ feature icons (48×48) */

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 48 48"
      className="h-11 w-11"
      fill="none"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const FEATURE_ICONS: Record<ProductFeatureKey, () => ReactNode> = {
  api: () => (
    <Icon>
      {[10, 24, 38].map((y, i) => (
        <g key={y}>
          <rect x={3} y={y - 3} width={8} height={6} rx={1} className="stroke-line-strong" />
          <path d={`M11 ${y} C 17 ${y}, 17 24, 22 24`} className="cap-flow stroke-copper" style={cd(i * 0.3)} />
        </g>
      ))}
      <rect x={22} y={17} width={14} height={14} rx={1.5} className="stroke-copper" />
      <path d="M26 21 h6 M26 24 h6 M26 27 h4" className="stroke-text-dim" />
      <path d="M36 24 H44" className="stroke-data-gold" />
      <circle cx={44} cy={24} r={1.6} className="fill-data-gold stroke-none" />
    </Icon>
  ),
  catalogue: () => (
    <Icon>
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) => {
          const hot = r === 1 && c === 2;
          return (
            <rect
              key={`${r}${c}`}
              x={6 + c * 13}
              y={6 + r * 13}
              width={10}
              height={10}
              rx={1}
              className={hot ? "cap-pulse fill-data-gold/20 stroke-data-gold" : r === 0 ? "stroke-copper" : "stroke-line-strong"}
            />
          );
        }),
      )}
    </Icon>
  ),
  session: () => (
    <Icon>
      <circle cx={13} cy={17} r={4.5} className="stroke-copper" />
      <path d="M5 33 C 5 26, 21 26, 21 33" className="stroke-copper" />
      <rect x={29} y={12} width={11} height={10} rx={2} className="stroke-steel" />
      <path d="M32.5 17 h0.01 M36.5 17 h0.01" className="stroke-steel" strokeWidth={2.2} />
      <path d="M34.5 12 V9" className="stroke-steel" />
      <path d="M27 33 C 27 27, 42 27, 42 33" className="stroke-steel" />
      <path d="M8 40 H40" className="cap-flow stroke-data-gold" />
      <circle cx={24} cy={40} r={1.8} className="fill-data-gold stroke-none" />
    </Icon>
  ),
  wallet: () => (
    <Icon>
      <path d="M7 15 H37 a3 3 0 0 1 3 3 V37 a3 3 0 0 1 -3 3 H10 a3 3 0 0 1 -3 -3 Z" className="stroke-copper" />
      <path d="M7 15 L31 8 L33 15" className="stroke-line-strong" />
      <rect x={30} y={23} width={13} height={9} rx={1.5} className="stroke-copper" />
      <circle cx={35} cy={27.5} r={1.6} className="cap-blink fill-data-gold stroke-none" />
      <path d="M12 27 l3 3 l5 -6" className="stroke-data-green" />
    </Icon>
  ),
  agent: () => (
    <Icon>
      <rect x={14} y={14} width={20} height={20} rx={2} className="stroke-copper" />
      {[19, 24, 29].map((v) => (
        <g key={v}>
          <path d={`M${v} 14 V9 M${v} 34 V39 M14 ${v} H9 M34 ${v} H39`} className="stroke-line-strong" />
        </g>
      ))}
      <path d="M18 27 L22 22 L26 25 L30 19" className="stroke-data-gold" />
      <circle cx={30} cy={19} r={1.6} className="fill-data-gold stroke-none" />
    </Icon>
  ),
  analytics: () => (
    <Icon>
      <path d="M6 41 H42 M6 41 V7" className="stroke-line-strong" />
      {[
        [11, 30],
        [19, 24],
        [27, 27],
        [35, 16],
      ].map(([x, y], i) => (
        <rect key={x} x={x} y={y} width={5} height={41 - y - 1} className="cap-grow stroke-copper" style={cd(i * 0.25)} />
      ))}
      <path d="M10 24 L20 17 L28 20 L40 9" className="stroke-data-gold" />
      <circle cx={40} cy={9} r={1.8} className="fill-data-gold stroke-none" />
    </Icon>
  ),
};

export function FeatureIcon({ name }: { name: ProductFeatureKey }) {
  return FEATURE_ICONS[name]();
}

/* ------------------------------------------------------------------ category motifs (640×240, slice) */

function Frame({ children }: { children: ReactNode }) {
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
    >
      {children}
    </svg>
  );
}

/** Die face (square + pips), drawn at (x, y) with side s. */
function Die({ x, y, s, n, className = "stroke-copper", rotate = 0 }: { x: number; y: number; s: number; n: 1 | 2 | 3 | 4 | 5 | 6; className?: string; rotate?: number }) {
  const q = s / 4;
  const P: Record<number, [number, number][]> = {
    1: [[2, 2]],
    2: [[1, 1], [3, 3]],
    3: [[1, 1], [2, 2], [3, 3]],
    4: [[1, 1], [3, 1], [1, 3], [3, 3]],
    5: [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]],
    6: [[1, 1], [3, 1], [1, 2], [3, 2], [1, 3], [3, 3]],
  };
  return (
    <g transform={`rotate(${rotate} ${x + s / 2} ${y + s / 2})`}>
      <rect x={x} y={y} width={s} height={s} rx={s * 0.14} className={`fill-bg-elev ${className}`} />
      {P[n]!.map(([px, py]) => (
        <circle key={`${px}${py}`} cx={x + px * q} cy={y + py * q} r={s * 0.065} className="fill-data-gold stroke-none" />
      ))}
    </g>
  );
}

function Glow({ cx, cy, r = 130 }: { cx: number; cy: number; r?: number }) {
  return <circle cx={cx} cy={cy} r={r} className="fill-copper/[0.06] stroke-none" />;
}

function ArtBoard() {
  const x0 = 250;
  const y0 = 50;
  const s = 140;
  const u = s / 15;
  const homes: [number, number, string][] = [
    [0, 0, "stroke-copper"],
    [9, 0, "stroke-steel"],
    [0, 9, "stroke-steel"],
    [9, 9, "stroke-copper"],
  ];
  return (
    <Frame>
      <Glow cx={320} cy={120} />
      {/* ladder (left wing) */}
      <path d="M86 196 L150 44 M110 204 L174 52" className="stroke-line-strong" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const t = 0.1 + i * 0.16;
        return <path key={i} d={`M${86 + 64 * t} ${196 - 152 * t} L${110 + 64 * t} ${204 - 152 * t}`} className="stroke-copper/60" />;
      })}
      {/* ludo board */}
      <rect x={x0} y={y0} width={s} height={s} className="fill-bg/60 stroke-line-strong" />
      {homes.map(([cx, cy, cls]) => (
        <g key={`${cx}${cy}`}>
          <rect x={x0 + cx * u} y={y0 + cy * u} width={6 * u} height={6 * u} className={cls} />
          <circle cx={x0 + (cx + 3) * u} cy={y0 + (cy + 3) * u} r={1.6 * u} className="stroke-line-strong" />
        </g>
      ))}
      {[7, 8].map((k) => (
        <path key={k} d={`M${x0 + 6 * u} ${y0 + (k - 1) * u} H${x0 + 9 * u} M${x0 + (k - 1) * u} ${y0 + 6 * u} V${y0 + 9 * u}`} className="stroke-line" />
      ))}
      <path d={`M${x0 + 6 * u} ${y0 + 6 * u} L${x0 + 7.5 * u} ${y0 + 7.5 * u} L${x0 + 9 * u} ${y0 + 6 * u} M${x0 + 6 * u} ${y0 + 9 * u} L${x0 + 7.5 * u} ${y0 + 7.5 * u} L${x0 + 9 * u} ${y0 + 9 * u}`} className="stroke-copper/80" />
      <circle cx={x0 + 7.5 * u} cy={y0 + 7.5 * u} r={3} className="cap-blink fill-data-gold stroke-none" />
      {/* track arrows */}
      <path d={`M${x0 + 7.5 * u} ${y0 + 1 * u} V${y0 + 5 * u}`} className="cap-flow stroke-data-gold/70" />
      <path d={`M${x0 + 14 * u} ${y0 + 7.5 * u} H${x0 + 10 * u}`} className="cap-flow stroke-data-gold/70" style={cd(0.5)} />
      {/* dice */}
      <g className="cap-float" style={cd(0)}>
        <Die x={414} y={70} s={42} n={5} rotate={-12} />
      </g>
      <g className="cap-float" style={cd(1.2)}>
        <Die x={446} y={132} s={34} n={3} rotate={14} className="stroke-steel" />
      </g>
      {/* domino (right wing) */}
      <g transform="rotate(18 540 120)">
        <rect x={520} y={74} width={40} height={84} rx={4} className="fill-bg-elev stroke-line-strong" />
        <path d="M526 116 H554" className="stroke-line-strong" />
        {[[532, 88], [548, 102], [532, 130], [548, 130], [532, 144], [548, 144]].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r={2.4} className="fill-copper/80 stroke-none" />
        ))}
      </g>
    </Frame>
  );
}

function Card({ x, y, rot, rank, suit, red, hot }: { x: number; y: number; rot: number; rank: string; suit: string; red?: boolean; hot?: boolean }) {
  const w = 82;
  const h = 118;
  return (
    <g transform={`rotate(${rot} ${x + w / 2} ${y + h})`}>
      <rect x={x} y={y} width={w} height={h} rx={6} className={hot ? "fill-bg-elev-2 stroke-data-gold" : "fill-bg-elev stroke-line-strong"} />
      <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx={3} className="stroke-line" />
      <text x={x + 12} y={y + 26} fontSize={18} fontWeight={500} className={`font-display ${red ? "fill-copper" : "fill-text"}`} stroke="none">
        {rank}
      </text>
      <text x={x + w / 2} y={y + h / 2 + 12} fontSize={34} textAnchor="middle" className={red ? "fill-copper" : "fill-text-dim"} stroke="none">
        {suit}
      </text>
    </g>
  );
}

function ArtCards() {
  return (
    <Frame>
      <Glow cx={320} cy={130} />
      {/* chip stacks (wings) */}
      {[[130, 0], [176, 1]].map(([x, k]) => (
        <g key={x}>
          {[0, 1, 2, 3, 4].slice(0, 5 - k).map((i) => (
            <ellipse key={i} cx={x} cy={178 - i * 9} rx={26} ry={8} className={i === 4 - k ? "fill-bg-elev stroke-copper" : "fill-bg-elev stroke-line-strong"} />
          ))}
        </g>
      ))}
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx={500} cy={178 - i * 9} rx={26} ry={8} className={i === 2 ? "fill-bg-elev stroke-steel" : "fill-bg-elev stroke-line-strong"} />
      ))}
      <path d="M520 60 h60 M520 76 h40" className="stroke-line-strong" />
      <circle cx={590} cy={60} r={2.5} className="cap-blink fill-data-gold stroke-none" />
      {/* fanned hand */}
      <Card x={238} y={60} rot={-16} rank="K" suit="♣" />
      <Card x={279} y={50} rot={0} rank="A" suit="♠" hot />
      <Card x={320} y={60} rot={16} rank="Q" suit="♥" red />
      <path d="M248 214 H392" className="cap-flow stroke-copper/60" />
    </Frame>
  );
}

function ArtRoulette() {
  const cx = 320;
  const cy = 120;
  const pockets = 37;
  return (
    <Frame>
      <Glow cx={cx} cy={cy} r={140} />
      {/* table layout (wings) */}
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <rect key={`l${r}${c}`} x={40 + c * 26} y={72 + r * 34} width={22} height={30} className={(r + c) % 2 ? "stroke-copper/50" : "stroke-line-strong"} />
        )),
      )}
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <rect key={`r${r}${c}`} x={496 + c * 26} y={72 + r * 34} width={22} height={30} className={(r + c) % 2 ? "stroke-line-strong" : "stroke-copper/50"} />
        )),
      )}
      <circle cx={549} cy={123} r={9} className="fill-bg-elev stroke-data-gold" />
      {/* wheel */}
      <circle cx={cx} cy={cy} r={98} className="fill-bg/70 stroke-line-strong" />
      <circle cx={cx} cy={cy} r={90} className="cap-orbit stroke-copper/50" />
      <g className="cap-spin-slow">
        <circle cx={cx} cy={cy} r={78} className="stroke-copper" />
        <circle cx={cx} cy={cy} r={58} className="stroke-line-strong" />
        {Array.from({ length: pockets }, (_, i) => {
          const a = (i / pockets) * Math.PI * 2;
          const x1 = (cx + Math.cos(a) * 58).toFixed(2);
          const y1 = (cy + Math.sin(a) * 58).toFixed(2);
          const x2 = (cx + Math.cos(a) * 78).toFixed(2);
          const y2 = (cy + Math.sin(a) * 78).toFixed(2);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className={i === 0 ? "stroke-data-green" : i % 2 ? "stroke-copper/60" : "stroke-line-strong"} />;
        })}
        <circle cx={cx} cy={cy} r={30} className="fill-bg-elev stroke-copper/70" />
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={(cx + Math.cos(a) * 8).toFixed(2)}
              y1={(cy + Math.sin(a) * 8).toFixed(2)}
              x2={(cx + Math.cos(a) * 26).toFixed(2)}
              y2={(cy + Math.sin(a) * 26).toFixed(2)}
              className="stroke-copper-soft"
            />
          );
        })}
        <circle cx={cx} cy={cy} r={5} className="fill-copper stroke-none" />
      </g>
      <circle cx={cx + 62} cy={cy - 62} r={5} className="fill-ivory stroke-none" />
      <circle cx={cx + 62} cy={cy - 62} r={12} className="cap-ping stroke-data-gold/50" />
    </Frame>
  );
}

function ArtInstant() {
  const ox = 210;
  const oy = 196;
  // y = oy - k(e^(t) - 1), sampled deterministically
  const pts = Array.from({ length: 25 }, (_, i) => {
    const t = i / 24;
    const x = ox + t * 220;
    const y = oy - (Math.exp(t * 2.6) - 1) * (150 / (Math.exp(2.6) - 1));
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  const curve = `M${pts.join(" L")}`;
  return (
    <Frame>
      <Glow cx={330} cy={120} />
      {/* plinko pegs (left wing) */}
      {[0, 1, 2, 3, 4, 5].map((r) =>
        Array.from({ length: r + 1 }, (_, c) => (
          <circle key={`${r}${c}`} cx={100 - r * 11 + c * 22} cy={78 + r * 22} r={2.2} className={r === 5 ? "fill-copper/80 stroke-none" : "fill-text-faint stroke-none"} />
        )),
      )}
      <circle cx={100} cy={62} r={4} className="cap-float fill-data-gold stroke-none" />
      {/* chart axes + grid */}
      <path d={`M${ox} 40 V${oy} H${ox + 236}`} className="stroke-line-strong" />
      {[1, 2, 3].map((i) => (
        <path key={i} d={`M${ox} ${oy - i * 40} H${ox + 236}`} className="stroke-line" strokeDasharray="2 6" />
      ))}
      <path d={`${curve} L${ox + 220} ${oy} Z`} className="fill-copper/[0.08] stroke-none" />
      <path d={curve} className="cap-draw stroke-data-gold" strokeWidth={1.75} />
      <circle cx={ox + 220} cy={oy - 150} r={4} className="fill-data-gold stroke-none" />
      <circle cx={ox + 220} cy={oy - 150} r={11} className="cap-ping stroke-data-gold/60" />
      {/* dice + coin (right wing) */}
      <g className="cap-float" style={cd(0.6)}>
        <Die x={478} y={64} s={40} n={6} rotate={10} />
      </g>
      <g className="cap-float" style={cd(1.6)}>
        <circle cx={540} cy={160} r={22} className="fill-bg-elev stroke-copper" />
        <circle cx={540} cy={160} r={16} className="stroke-line-strong" />
        <path d="M534 160 h12 M540 154 v12" className="stroke-data-gold" />
      </g>
    </Frame>
  );
}

function ArtArcade() {
  const x0 = 214;
  const y0 = 58;
  const w = 212;
  const h = 124;
  const pockets: [number, number][] = [
    [x0, y0], [x0 + w / 2, y0], [x0 + w, y0], [x0, y0 + h], [x0 + w / 2, y0 + h], [x0 + w, y0 + h],
  ];
  const rack: [number, number][] = [];
  for (let col = 0; col < 4; col++) {
    for (let r = 0; r <= col; r++) rack.push([352 + col * 13, 120 - col * 7.5 + r * 15]);
  }
  return (
    <Frame>
      <Glow cx={320} cy={120} />
      {/* joystick (left wing) */}
      <rect x={70} y={150} width={92} height={36} rx={6} className="fill-bg-elev stroke-line-strong" />
      <path d="M100 150 L110 92" className="stroke-copper" />
      <circle cx={111} cy={86} r={11} className="fill-bg-elev stroke-copper" />
      <circle cx={140} cy={168} r={6} className="cap-blink stroke-data-gold" />
      {/* pool table */}
      <rect x={x0 - 12} y={y0 - 12} width={w + 24} height={h + 24} rx={8} className="fill-bg-elev stroke-line-strong" />
      <rect x={x0} y={y0} width={w} height={h} className="fill-bg/70 stroke-copper/70" />
      <path d={`M${x0 + w * 0.25} ${y0} V${y0 + h}`} className="stroke-line" strokeDasharray="2 5" />
      {pockets.map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={6} className="fill-bg stroke-line-strong" />
      ))}
      {rack.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={6.5} className={i === 4 ? "fill-text/90 stroke-none" : i % 2 ? "stroke-copper" : "stroke-steel"} />
      ))}
      <text x={rack[4]![0]} y={rack[4]![1] + 3} fontSize={7.5} textAnchor="middle" className="fill-bg font-mono" stroke="none">
        8
      </text>
      <circle cx={x0 + w * 0.25} cy={120} r={6.5} className="fill-ivory stroke-none" />
      <path d={`M${x0 + w * 0.25 + 9} 120 H${352 - 9}`} className="cap-flow stroke-data-gold/70" />
      <path d={`M${x0 - 30} 128 L${x0 + w * 0.25 - 10} 121`} className="stroke-copper-soft" strokeWidth={2} />
      {/* drill / score (right wing) */}
      <path d="M520 70 h80 M520 90 h56 M520 110 h68" className="stroke-line-strong" />
      <path d="M520 150 l20 20 l20 -20 l20 20 l20 -20" className="cap-flow stroke-copper/70" />
    </Frame>
  );
}

function Gem({ x, y, s, className }: { x: number; y: number; s: number; className: string }) {
  return (
    <g>
      <path d={`M${x - s} ${y - s * 0.35} L${x - s * 0.55} ${y - s} H${x + s * 0.55} L${x + s} ${y - s * 0.35} L${x} ${y + s} Z`} className={className} />
      <path d={`M${x - s} ${y - s * 0.35} H${x + s} M${x - s * 0.55} ${y - s} L${x - s * 0.3} ${y - s * 0.35} L${x} ${y + s} L${x + s * 0.3} ${y - s * 0.35} L${x + s * 0.55} ${y - s}`} className="stroke-line-strong" />
    </g>
  );
}

function ArtSlots() {
  const x0 = 214;
  const y0 = 54;
  const rw = 64;
  const gap = 10;
  const h = 132;
  return (
    <Frame>
      <Glow cx={320} cy={120} />
      {/* floating gems (wings) */}
      <g className="cap-float" style={cd(0)}>
        <Gem x={120} y={88} s={20} className="fill-copper/10 stroke-copper" />
      </g>
      <g className="cap-float" style={cd(1.1)}>
        <Gem x={160} y={168} s={13} className="fill-steel/10 stroke-steel" />
      </g>
      <g className="cap-float" style={cd(0.5)}>
        <Gem x={516} y={80} s={15} className="fill-data-gold/10 stroke-data-gold" />
      </g>
      <g className="cap-float" style={cd(1.7)}>
        <Gem x={540} y={164} s={21} className="fill-copper/10 stroke-copper" />
      </g>
      {/* cabinet */}
      <rect x={x0 - 14} y={y0 - 14} width={3 * rw + 2 * gap + 28} height={h + 28} rx={6} className="fill-bg-elev stroke-line-strong" />
      {[0, 1, 2].map((i) => {
        const x = x0 + i * (rw + gap);
        const cx = x + rw / 2;
        return (
          <g key={i}>
            <rect x={x} y={y0} width={rw} height={h} className="fill-bg/70 stroke-copper/60" />
            {/* top symbol (faded) */}
            <circle cx={cx} cy={y0 + 22} r={8} className="stroke-line-strong" />
            {/* payline symbol */}
            <Gem x={cx} y={y0 + h / 2} s={14} className={i === 1 ? "fill-data-gold/15 stroke-data-gold" : "fill-copper/10 stroke-copper"} />
            {/* bottom symbol (faded) */}
            <text x={cx} y={y0 + h - 14} fontSize={23} fontWeight={500} textAnchor="middle" className="fill-text-faint font-display" stroke="none">
              7
            </text>
          </g>
        );
      })}
      <path d={`M${x0 - 24} ${y0 + h / 2} H${x0 + 3 * rw + 2 * gap + 24}`} className="cap-flow stroke-data-gold/80" />
      <circle cx={x0 - 24} cy={y0 + h / 2} r={3} className="cap-blink fill-data-gold stroke-none" />
      <circle cx={x0 + 3 * rw + 2 * gap + 24} cy={y0 + h / 2} r={3} className="cap-blink fill-data-gold stroke-none" style={cd(0.6)} />
    </Frame>
  );
}

const CATEGORY_ART: Record<ProductCategoryKey, () => ReactNode> = {
  board: ArtBoard,
  cards: ArtCards,
  roulette: ArtRoulette,
  instant: ArtInstant,
  arcade: ArtArcade,
  slots: ArtSlots,
};

export function CategoryArt({ name }: { name: ProductCategoryKey }) {
  const Art = CATEGORY_ART[name];
  return <Art />;
}
