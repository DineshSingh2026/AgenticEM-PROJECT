import { cn } from "@/lib/cn";

export interface CompareTableProps {
  columns: [string, string, string];
  rows: { label: string; a: string; b: string }[];
  className?: string;
}

/** Three-column comparison. The last column (b) is the Agentium OS side and is accented in copper. */
export function CompareTable({ columns, rows, className }: CompareTableProps) {
  return (
    <div className={cn("relative border border-line bg-bg-elev/70 backdrop-blur-md", className)}>
      <span aria-hidden="true" className="pointer-events-none absolute -left-px -top-px h-2 w-2 border-l border-t border-copper" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-px -right-px h-2 w-2 border-b border-r border-copper" />
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-line">
            {columns.map((c, i) => (
              <th
                key={c}
                scope="col"
                className={cn(
                  "t-label px-2 py-4 sm:px-3 font-normal md:px-6",
                  i === 0 ? "w-[28%] text-text-faint" : i === 2 ? "text-copper" : "text-text-dim",
                )}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-line last:border-b-0">
              <th scope="row" className="t-label px-2 py-4 sm:px-3 align-top font-normal text-text-faint md:px-6">
                {r.label}
              </th>
              <td className="px-2 py-4 sm:px-3 align-top text-[13px] text-text-dim sm:text-[14px] md:px-6 md:text-[15px]">{r.a}</td>
              <td className="relative px-2 py-4 sm:px-3 align-top text-[13px] text-text sm:text-[14px] md:px-6 md:text-[15px]">
                <span aria-hidden="true" className="absolute inset-y-3 left-0 w-px bg-copper/50" />
                {r.b}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
