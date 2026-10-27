import { BracketPanel } from "@/components/ui";
import { cn } from "@/lib/cn";

export interface SpecTableProps {
  /** Mono label above the table; also used as the table caption. */
  label: string;
  columns: readonly string[];
  rows: readonly (readonly string[])[];
  /** Cells equal to this value are highlighted as pending confirmation. */
  pendingValue?: string;
  className?: string;
}

/** Plain, accessible data table inside a BracketPanel. First column is a row header. */
export function SpecTable({ label, columns, rows, pendingValue = "TO CONFIRM", className }: SpecTableProps) {
  return (
    <BracketPanel className={cn("p-0", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <caption className="t-label px-6 pb-2 pt-6 text-left text-text-faint">{label}</caption>
          <thead>
            <tr className="border-b border-line">
              {columns.map((c) => (
                <th key={c} scope="col" className="t-label px-6 py-4 font-normal text-text-dim">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={`${row[0]}-${ri}`} className="border-b border-line last:border-b-0">
                {row.map((cell, ci) => {
                  const pending = cell.includes(pendingValue);
                  const cls = cn(
                    "px-6 py-4 align-top text-[15px]",
                    ci === 0 ? "font-medium text-text" : "text-text-dim",
                    ci === 1 && "t-num text-text",
                    pending && "t-label text-copper",
                  );
                  return ci === 0 ? (
                    <th key={ci} scope="row" className={cls}>
                      {cell}
                    </th>
                  ) : (
                    <td key={ci} className={cls}>
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BracketPanel>
  );
}
