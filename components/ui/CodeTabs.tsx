"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";

export interface CodeTabsProps {
  label?: string;
  tabs: { lang: string; code: string }[];
  className?: string;
}

export function CodeTabs({ label, tabs, className }: CodeTabsProps) {
  const t = copy.site.codeTabs;
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const uid = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    let next = active;
    if (e.key === "ArrowRight") next = (active + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (active - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    setActive(next);
    refs.current[next]?.focus();
  };

  const doCopy = async () => {
    const tab = tabs[active];
    if (!tab) return;
    try {
      await navigator.clipboard.writeText(tab.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className={cn("relative border border-line bg-bg-elev/80 backdrop-blur-md", className)}>
      <span aria-hidden="true" className="pointer-events-none absolute -left-px -top-px h-2 w-2 border-l border-t border-copper" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-px -right-px h-2 w-2 border-b border-r border-copper" />
      <div className="flex items-center justify-between gap-4 border-b border-line px-3 md:px-4">
        <div role="tablist" aria-label={t.tablistLabel} className="flex">
          {tabs.map((tab, i) => (
            <button
              key={tab.lang}
              ref={(el) => {
                refs.current[i] = el;
              }}
              id={`${uid}-t-${i}`}
              role="tab"
              type="button"
              aria-selected={active === i}
              aria-controls={`${uid}-p-${i}`}
              tabIndex={active === i ? 0 : -1}
              onKeyDown={onKey}
              onClick={() => setActive(i)}
              className={cn(
                "t-label -mb-px border-b px-3 py-3.5 transition-colors duration-200 ease-out",
                active === i ? "border-copper text-text" : "border-transparent text-text-faint hover:text-text-dim",
              )}
            >
              {tab.lang}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <span className="t-label hidden text-[10px] text-copper/80 sm:inline">{label ?? t.label}</span>
          <button type="button" onClick={doCopy} className="t-label text-[11px] text-text-dim hover:text-text">
            <span aria-live="polite">{copied ? t.copied : t.copy}</span>
          </button>
        </div>
      </div>
      {tabs.map((tab, i) => (
        <div
          key={tab.lang}
          id={`${uid}-p-${i}`}
          role="tabpanel"
          aria-labelledby={`${uid}-t-${i}`}
          hidden={active !== i}
          tabIndex={0}
          className="overflow-x-auto p-5"
        >
          <pre className="font-mono text-[13px] leading-relaxed text-text-dim">
            <code>{tab.code}</code>
          </pre>
        </div>
      ))}
    </div>
  );
}
