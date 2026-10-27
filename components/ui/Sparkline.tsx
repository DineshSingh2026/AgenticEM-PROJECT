import { cn } from "@/lib/cn";

export interface SparklineProps {
  data: number[];
  className?: string;
  color?: string;
}

const W = 100;
const H = 28;

export function Sparkline({ data, className, color = "var(--copper)" }: SparklineProps) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - 2 - ((v - min) / span) * (H - 4);
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" className={cn("h-7 w-24 overflow-visible", className)}>
      <polyline points={`0,${H} ${line} ${W},${H}`} fill={color} fillOpacity={0.08} stroke="none" />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={1.25}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {last ? <circle cx={last[0]} cy={last[1]} r={1.6} fill={color} /> : null}
    </svg>
  );
}
