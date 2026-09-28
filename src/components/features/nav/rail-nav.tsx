"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { NAV_ITEMS } from "./nav-items";
import { MOTION } from "@/lib/motion";

/**
 * The active indicator slides between items using layoutId — same calm
 * transition as everything else, applied to navigation. Rail and TabBar
 * use separate layoutIds (both are mounted simultaneously, just hidden
 * per breakpoint via CSS, so a shared id would animate against itself).
 */
export function RailNav() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? MOTION.reduced : MOTION.layoutSettle;

  return (
    <nav className="hidden min-h-screen flex-col gap-1 border-r border-border bg-bg px-4 py-7 md:sticky md:top-0 md:flex md:h-screen">
      <div className="mb-8 border-b border-border px-2 pb-5">
        <span className="font-[family-name:var(--font-display)] text-[18px] font-bold tracking-[-0.03em] text-ink">
          Presynce
        </span>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">
          Attendance intelligence
        </p>
      </div>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className="relative flex items-center gap-3 rounded-[var(--radius-sm)] px-2.5 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-accent-wash hover:text-ink aria-[current=page]:text-ink"
          >
            {isActive && (
              <motion.span
                layoutId="rail-nav-active"
                transition={transition}
                className="absolute inset-0 rounded-[var(--radius-sm)] bg-accent-wash"
              />
            )}
            <Icon className="relative h-[18px] w-[18px]" strokeWidth={2} />
            <span className="relative">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
