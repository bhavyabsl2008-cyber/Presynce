"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { NAV_ITEMS } from "./nav-items";
import { MOTION } from "@/lib/motion";

export function TabBar() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? MOTION.reduced : MOTION.layoutSettle;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around border-t border-border bg-surface/95 backdrop-blur px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className="relative flex flex-1 flex-col items-center gap-1 rounded-[var(--radius-sm)] py-1.5 text-muted transition-colors aria-[current=page]:text-accent"
          >
            {isActive && (
              <motion.span
                layoutId="tab-bar-active"
                transition={transition}
                className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-accent"
              />
            )}
            <Icon className="relative h-5 w-5" strokeWidth={2} />
            <span className="relative text-[11px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
