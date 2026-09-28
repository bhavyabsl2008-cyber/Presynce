"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { TRANSITION } from "@/lib/motion";

const NAV_ITEMS_DESKTOP = [
  { label: "TODAY", href: "/today" },
  { label: "TIMETABLE", href: "/timetable" },
  { label: "SEMESTER", href: "/semester" },
  { label: "YOU", href: "/you" },
];

const NAV_ITEMS_MOBILE = [
  { label: "TODAY", href: "/today" },
  { label: "TIMETABLE", href: "/timetable" },
  { label: "SEMESTER", href: "/semester" },
  { label: "YOU", href: "/you" },
];

/**
 * PrimaryNav
 * Desktop: top bar with layoutId-based sliding active indicator.
 * Mobile: bottom tab bar.
 */
export function PrimaryNav() {
  const pathname = usePathname();

  return (
    <>
      {/* â”€â”€â”€ Desktop Top Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <nav
        className="hidden md:flex sticky top-0 z-50 items-center h-14 px-8 lg:px-12 bg-paper border-b border-line"
        aria-label="Primary navigation"
      >
        {/* Left Column: Brand */}
        <div className="flex-1 flex justify-start">
          <Link
            href="/today"
            className="flex items-center gap-2.5 text-ink-v2 hover:text-presynce transition-colors"
            aria-label="Presynce â€” go to Today"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <rect x="0.5" y="0.5" width="17" height="17" stroke="currentColor" strokeWidth="1.5" />
              <rect x="5.5" y="5.5" width="7" height="7" fill="currentColor" />
            </svg>
            <span className="font-bold text-micro tracking-[0.18em] uppercase">
              PRESYNCE
            </span>
          </Link>
        </div>

        {/* Center Column: Nav Links */}
        <div className="flex-none flex items-center h-full gap-6">
          {NAV_ITEMS_DESKTOP.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`relative h-full flex items-center text-micro font-bold tracking-[0.14em] uppercase
                  transition-colors duration-100 ${
                    isActive
                      ? "text-ink-v2"
                      : "text-ink-secondary hover:text-ink-v2"
                  }`}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator-desktop"
                    className="absolute bottom-0 left-0 w-full h-[2px] bg-presynce"
                    transition={TRANSITION.layoutSettle}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right Column: Avatar/Actions */}
        <div className="flex-1 flex justify-end">
          <div
            className="w-7 h-7 border border-line-strong flex items-center justify-center"
            aria-hidden
          >
            <div className="w-3 h-3 bg-ink-v2/30" />
          </div>
        </div>
      </nav>

      {/* â”€â”€â”€ Mobile Bottom Tab Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-v2 border-t border-line"
        aria-label="Primary navigation"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-stretch h-14">
          {NAV_ITEMS_MOBILE.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`relative flex flex-col items-center justify-center flex-1 gap-1
                  transition-colors duration-100 ${
                    isActive ? "text-presynce" : "text-ink-tertiary"
                  }`}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Dot node indicator */}
                <div
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-150 ${
                    isActive ? "bg-presynce scale-125" : "bg-ink-tertiary"
                  }`}
                />
                <span className="text-[0.6rem] font-bold tracking-[0.12em] uppercase">
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator-mobile"
                    className="absolute top-0 left-0 right-0 h-[2px] bg-presynce"
                    transition={TRANSITION.layoutSettle}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

