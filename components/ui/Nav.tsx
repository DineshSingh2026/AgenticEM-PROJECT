"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { copy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { getLenis } from "@/lib/scroll";
import { Logo } from "./Logo";

const n = copy.site.nav;
const NAV_H = 72;
/** Breathing room above a heading target so its eyebrow stays visible below the fixed nav. */
const HEADING_GAP = 80;

/**
 * Scrolls to the element named by a "#id" hash. Section targets land at their top edge (their own
 * padding clears the nav); heading targets land just below the nav. Uses Lenis when active, native
 * scrolling otherwise (Lenis is off under reduced motion). Returns false if the target is missing.
 */
function scrollToHash(hash: string, immediate = false): boolean {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  const el = id ? document.getElementById(id) : null;
  if (!el) return false;
  const offset = /^H[1-6]$/.test(el.tagName) ? -(NAV_H + HEADING_GAP) : 0;
  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(el, { offset, immediate, duration: 1.4 });
  } else {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const top = el.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top, behavior: immediate || reduced ? "auto" : "smooth" });
  }
  return true;
}

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

  // Arriving on "/" with a section hash from another page: SceneRoot resets scroll to the top on
  // route change, so scroll to the section once that (and the new page layout) has settled.
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    if (pathname !== "/" || !window.location.hash) return;
    const hash = window.location.hash;
    // Jump (the route change is already a cut), then re-correct while the new page's layout,
    // fonts and scene bands settle. Stops early once the user scrolls themselves.
    let userScrolled = false;
    const onUser = () => {
      userScrolled = true;
    };
    window.addEventListener("wheel", onUser, { passive: true });
    window.addEventListener("touchstart", onUser, { passive: true });
    window.addEventListener("keydown", onUser);
    const timers = [120, 400, 900, 1600].map((ms) =>
      window.setTimeout(() => {
        if (userScrolled) return;
        getLenis()?.resize();
        scrollToHash(hash, true);
      }, ms),
    );
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("wheel", onUser);
      window.removeEventListener("touchstart", onUser);
      window.removeEventListener("keydown", onUser);
    };
  }, [pathname]);

  /** Section links: smooth-scroll in place on the homepage; elsewhere let <Link> navigate to "/#id". */
  const onSectionClick = (href: string) => (e: ReactMouseEvent<HTMLAnchorElement>) => {
    setMegaOpen(false);
    setSheetOpen(false);
    if (pathname !== "/" || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const hash = href.slice(href.indexOf("#"));
    if (!document.getElementById(decodeURIComponent(hash.slice(1)))) return;
    e.preventDefault();
    if (window.location.hash !== hash) window.history.pushState(window.history.state, "", hash);
    // Wait a frame so the mobile sheet has closed and released its body scroll lock.
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => scrollToHash(hash)));
  };

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
                  className="fixed inset-x-0 top-[72px] border-y border-line bg-bg-elev shadow-[0_24px_48px_-12px_rgb(0_0_0/0.65)]"
                >
                  <div className="container-site grid gap-8 py-7 xl:grid-cols-12 xl:gap-6">
                    {/* Intro column: wide desktop only, so 1024 keeps the full width for the items. */}
                    <div className="hidden flex-col gap-3 border-r border-line pr-6 xl:col-span-3 xl:flex">
                      <p className="t-label text-copper">{n.platform.menuLabel}</p>
                      <p className="font-display text-[24px] font-medium leading-tight text-text">{n.platform.label}</p>
                      <p className="max-w-[30ch] text-[13px] leading-relaxed text-text-dim">{copy.site.brand.mission}</p>
                    </div>
                    <div className="xl:col-span-9">
                      <p className="t-label mb-4 text-text-faint xl:hidden">{n.platform.menuLabel}</p>
                      <ul className="grid grid-cols-3 gap-px border border-line bg-line">
                        {n.platform.items.map((item) => (
                          <li key={item.href} className="bg-bg-elev">
                            <Link
                              href={item.href}
                              scroll={false}
                              onClick={onSectionClick(item.href)}
                              className="group relative flex h-full flex-col gap-1.5 px-5 py-4 transition-colors duration-300 ease-out hover:bg-copper/[0.07] focus-visible:bg-copper/[0.07] focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-copper/70"
                            >
                              <span
                                aria-hidden="true"
                                className="absolute inset-y-0 left-0 w-px origin-top scale-y-0 bg-copper transition-transform duration-300 ease-out group-hover:scale-y-100 group-focus-visible:scale-y-100"
                              />
                              <span className="flex items-baseline gap-3">
                                <span className="t-num w-8 shrink-0 text-[11px] text-copper">{item.index}</span>
                                <span className="min-w-0 flex-1 whitespace-nowrap text-[15px] font-medium text-text transition-colors duration-300 group-hover:text-copper-soft">
                                  {item.label}
                                </span>
                                <svg
                                  viewBox="0 0 12 12"
                                  aria-hidden="true"
                                  className="h-3 w-3 shrink-0 self-center text-text-faint transition-[transform,color] duration-300 ease-out group-hover:translate-x-1 group-hover:text-copper group-focus-visible:translate-x-1 group-focus-visible:text-copper"
                                >
                                  <path d="M2 6h8M6.5 2.5 10 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                                </svg>
                              </span>
                              <span className="line-clamp-2 min-h-[2lh] pl-11 text-[13px] leading-snug text-text-dim">{item.description}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
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
            <li className="ml-3">
              <Link
                href={n.contact.href}
                aria-current={isCurrent(n.contact.href)}
                className="group inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border border-copper/45 px-4 text-[14px] text-text transition-[border-color,background-color,box-shadow,color] duration-300 ease-out hover:border-copper hover:bg-copper/[0.08] hover:shadow-[0_0_14px_rgb(var(--copper-rgb)/0.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper aria-[current=page]:border-copper aria-[current=page]:bg-copper/[0.1] aria-[current=page]:text-copper-soft"
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-copper shadow-[0_0_6px_rgb(var(--copper-rgb)/0.7)] transition-transform duration-300 ease-out group-hover:scale-125"
                />
                {n.contact.label}
              </Link>
            </li>
          </ul>
        </nav>

        <div className="flex items-center gap-3 lg:hidden">
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
                      scroll={false}
                      onClick={onSectionClick(item.href)}
                      className="group flex items-start gap-3 py-3.5"
                    >
                      <span className="t-num w-9 shrink-0 pt-[5px] text-[12px] text-copper">{item.index}</span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-[17px] text-text">{item.label}</span>
                        <span className="text-[14px] leading-snug text-text-dim">{item.description}</span>
                      </span>
                      <svg viewBox="0 0 12 12" aria-hidden="true" className="mt-2 h-3 w-3 shrink-0 text-text-faint group-active:text-copper">
                        <path d="M2 6h8M6.5 2.5 10 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
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
                    className="font-display block py-4 text-[26px] font-medium text-text aria-[current=page]:text-copper"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li className="border-b border-line">
                <Link
                  href={n.contact.href}
                  aria-current={isCurrent(n.contact.href)}
                  onClick={() => setSheetOpen(false)}
                  className="font-display group flex items-center justify-between gap-4 py-4 text-[26px] font-medium text-text aria-[current=page]:text-copper"
                >
                  {n.contact.label}
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-copper/50 text-copper transition-colors duration-300 group-hover:border-copper group-hover:bg-copper/10"
                  >
                    <svg viewBox="0 0 12 12" className="h-3 w-3">
                      <path d="M2 6h8M6.5 2.5 10 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                  </span>
                </Link>
              </li>
            </ul>
            <div className="mt-auto flex flex-col gap-4 pb-4">
              <p className="t-label text-center text-text-faint">{copy.site.forLicensedOperators}</p>
            </div>
          </nav>
        </div>
      ) : null}
    </>
  );
}
