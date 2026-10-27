"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { Button } from "./Button";
import { Logo } from "./Logo";
import { ScenePoster } from "./ScenePoster";

const n = copy.site.nav;
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const linkCls =
  "relative px-3 py-2 text-[14px] text-text-dim transition-colors duration-200 ease-out hover:text-text aria-[current=page]:text-text";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 10 6"
      aria-hidden="true"
      className={cn("h-1.5 w-2.5 transition-transform duration-300 ease-out", open && "rotate-180")}
    >
      <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function Nav() {
  const pathname = usePathname();
  const uid = useId();
  const megaId = `${uid}-mega`;
  const sheetId = `${uid}-sheet`;

  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const megaBtn = useRef<HTMLButtonElement>(null);
  const megaWrap = useRef<HTMLDivElement>(null);
  const sheetBtn = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number | null>(null);

  // Scroll state
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close everything on route change
  useEffect(() => {
    setMegaOpen(false);
    setSheetOpen(false);
  }, [pathname]);

  // Mega menu: Escape + outside click
  useEffect(() => {
    if (!megaOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMegaOpen(false);
        megaBtn.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (megaWrap.current && !megaWrap.current.contains(e.target as Node)) setMegaOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [megaOpen]);

  // Mobile sheet: body scroll lock, initial focus, Escape
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = sheet.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    document.addEventListener("keydown", onKey);
    const mq = window.matchMedia("(min-width: 1024px)");
    const onMq = () => mq.matches && setSheetOpen(false);
    mq.addEventListener("change", onMq);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetOpen]);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    window.requestAnimationFrame(() => sheetBtn.current?.focus());
  }, []);

  const trapFocus = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !sheet.current) return;
    const items = Array.from(sheet.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const hoverOpen = (open: boolean) => (e: ReactPointerEvent) => {
    if (e.pointerType !== "mouse") return;
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setMegaOpen(open), open ? 80 : 180);
  };

  const isCurrent = (href: string) => (pathname === href ? "page" : undefined);
  const platformActive = pathname?.startsWith("/platform") ?? false;
  const solid = scrolled || megaOpen;

  return (
    <>
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-500 ease-out",
        solid ? "border-line/80 bg-bg/80 backdrop-blur-md [-webkit-backdrop-filter:blur(12px)]" : "border-transparent bg-transparent",
      )}
    >
      <div className="container-site flex h-[72px] items-center justify-between gap-6">
        <Link href="/" aria-label={copy.site.brand.homeLabel} className="flex shrink-0 items-center rounded-btn py-2">
          <Logo decorative priority className="h-8 sm:h-9" />
        </Link>

        {/* Desktop */}
        <nav aria-label={n.ariaLabel} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            <li>
              <div ref={megaWrap} onPointerEnter={hoverOpen(true)} onPointerLeave={hoverOpen(false)} className="relative">
                <button
                  ref={megaBtn}
                  type="button"
                  aria-expanded={megaOpen}
                  aria-controls={megaId}
                  onClick={() => setMegaOpen((o) => !o)}
                  className={cn(linkCls, "flex items-center gap-2", (megaOpen || platformActive) && "text-text")}
                >
                  {n.platform.label}
                  <Chevron open={megaOpen} />
                </button>
                <div
                  id={megaId}
                  hidden={!megaOpen}
                  className="fixed inset-x-0 top-[72px] border-b border-line bg-bg/95 backdrop-blur-md"
                >
                  <div className="container-site py-8">
                    <p className="t-label mb-5 text-text-faint">{n.platform.menuLabel}</p>
                    <ul className="grid grid-cols-3 gap-4 xl:grid-cols-6">
                      {n.platform.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={isCurrent(item.href)}
                            onClick={() => setMegaOpen(false)}
                            className="group flex h-full flex-col gap-3 border border-line bg-bg-elev/60 p-3 transition-colors duration-300 ease-out hover:border-copper/60 aria-[current=page]:border-copper/60"
                          >
                            <span className="relative block aspect-[16/10] overflow-hidden border border-line">
                              <ScenePoster scene={item.scene} className="transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
                            </span>
                            <span className="text-[15px] font-medium text-text">{item.label}</span>
                            <span className="text-[13px] leading-snug text-text-dim">{item.description}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </li>
            {n.links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} aria-current={isCurrent(l.href)} className={linkCls}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <Button href={n.cta.href} className="hidden h-10 px-4 text-[14px] sm:inline-flex">
            {n.cta.label}
          </Button>
          <button
            ref={sheetBtn}
            type="button"
            aria-expanded={sheetOpen}
            aria-controls={sheetId}
            aria-label={sheetOpen ? n.closeMenu : n.openMenu}
            onClick={() => setSheetOpen(true)}
            className="flex h-10 w-10 items-center justify-center border border-line-strong lg:hidden"
          >
            <span aria-hidden="true" className="flex w-4 flex-col gap-[5px]">
              <span className="h-px w-full bg-text" />
              <span className="h-px w-full bg-text" />
              <span className="h-px w-2/3 bg-copper" />
            </span>
          </button>
        </div>
      </div>
    </header>

      {/* Mobile sheet (sibling of header so backdrop-filter does not trap its fixed positioning) */}
      {sheetOpen ? (
        <div
          id={sheetId}
          ref={sheet}
          role="dialog"
          aria-modal="true"
          aria-label={n.mobileMenuLabel}
          onKeyDown={trapFocus}
          className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-bg lg:hidden"
        >
          <div className="container-site flex h-[72px] shrink-0 items-center justify-between border-b border-line">
            <Link href="/" aria-label={copy.site.brand.homeLabel} onClick={() => setSheetOpen(false)} className="flex items-center py-2">
              <Logo decorative className="h-8 sm:h-9" />
            </Link>
            <button
              type="button"
              aria-label={n.closeMenu}
              onClick={closeSheet}
              className="flex h-10 w-10 items-center justify-center border border-line-strong"
            >
              <svg viewBox="0 0 12 12" aria-hidden="true" className="h-3 w-3">
                <path d="M1 1l10 10M11 1 1 11" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </button>
          </div>
          <nav aria-label={n.ariaLabel} className="container-site flex flex-1 flex-col gap-8 py-8">
            <div>
              <p className="t-label mb-3 text-copper">{n.platform.label}</p>
              <ul className="flex flex-col border-t border-line">
                {n.platform.items.map((item) => (
                  <li key={item.href} className="border-b border-line">
                    <Link
                      href={item.href}
                      aria-current={isCurrent(item.href)}
                      onClick={() => setSheetOpen(false)}
                      className="flex flex-col gap-1 py-4"
                    >
                      <span className="text-[17px] text-text">{item.label}</span>
                      <span className="text-[14px] text-text-dim">{item.description}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <ul className="flex flex-col border-t border-line">
              {n.links.map((l) => (
                <li key={l.href} className="border-b border-line">
                  <Link
                    href={l.href}
                    aria-current={isCurrent(l.href)}
                    onClick={() => setSheetOpen(false)}
                    className="font-display block py-4 text-[24px] font-medium text-text aria-[current=page]:text-copper"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-auto flex flex-col gap-4 pb-4">
              <Button href={n.cta.href} className="w-full" onClick={() => setSheetOpen(false)}>
                {n.cta.label}
              </Button>
              <p className="t-label text-center text-text-faint">{copy.site.forLicensedOperators}</p>
            </div>
          </nav>
        </div>
      ) : null}
    </>
  );
}
