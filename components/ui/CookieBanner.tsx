"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { copy } from "@/content/copy";
import { Button } from "./Button";

const KEY = "aem.cookie-consent.v1";
type Choice = "essential" | "all";

function read(): Choice | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "essential" || v === "all" ? v : null;
  } catch {
    return null;
  }
}

function write(v: Choice) {
  try {
    window.localStorage.setItem(KEY, v);
  } catch {
    /* storage unavailable: banner simply closes for this page view */
  }
}

/** Essential-only by default. Small bottom-left panel; shown only until a choice is stored. */
export function CookieBanner() {
  const [open, setOpen] = useState(false);
  const c = copy.site.cookieBanner;

  useEffect(() => {
    if (read() === null) setOpen(true);
  }, []);

  if (!open) return null;

  const choose = (v: Choice) => {
    write(v);
    setOpen(false);
  };

  return (
    <div
      role="region"
      aria-label={c.label}
      className="fixed bottom-4 left-4 right-4 z-40 border border-line bg-bg-elev/90 p-5 backdrop-blur-md sm:right-auto sm:max-w-sm"
    >
      <span aria-hidden="true" className="pointer-events-none absolute -left-px -top-px h-2 w-2 border-l border-t border-copper" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-px -right-px h-2 w-2 border-b border-r border-copper" />
      <p className="t-label mb-2 text-[11px] text-copper">{c.label}</p>
      <p className="text-[14px] leading-relaxed text-text-dim">
        {c.body}{" "}
        <Link href={c.policy.href} className="text-text underline decoration-copper/60 underline-offset-4">
          {c.policy.label}
        </Link>
      </p>
      <div className="mt-4 flex gap-3">
        <Button onClick={() => choose("essential")} className="h-10 flex-1 px-4 text-[14px]">
          {c.essential}
        </Button>
        <Button variant="ghost" onClick={() => choose("all")} className="h-10 flex-1 px-4 text-[14px]">
          {c.accept}
        </Button>
      </div>
    </div>
  );
}
