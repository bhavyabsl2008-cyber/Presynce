"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PrimaryNav } from "./primary-nav";
import { useStore } from "@/store";
import { AnimatePresence, motion } from "motion/react";
import { TRANSITION_PAGE } from "@/lib/motion";
import { useStartupSync } from "@/hooks/useStartupSync";

/**
 * PageShell
 * Root wrapper for all V2 routes (/lab/today, /lab/semester, etc.)
 * Provides: structural grid background, navigation injection,
 * semantic canvas color, mobile bottom nav padding.
 *
 * Grid is rendered at 4% opacity — felt subconsciously,
 * not constantly noticed. 4rem (64px) cell matches Lab A.
 *
 * Do not modify this for page-specific layout needs.
 * Use section padding inside TodayEnv etc. instead.
 */
export function PageShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const student = useStore((state) => state.student);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Automatic Chalkpad sync on startup and window focus resume
  useStartupSync();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsHydrated(true);
    if (!student || !student.isOnboarded) {
      router.replace("/onboarding");
    }
  }, [student, router]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="w-4 h-4 rounded-full border-2 border-ink-v2 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink-v2 font-sans flex flex-col relative overflow-x-hidden">

      {/* Structural Grid — Lab A: 4rem cells, 4% opacity */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-grid, rgba(17,16,15,0.04)) 1px, transparent 1px)," +
            "linear-gradient(to bottom, var(--color-grid, rgba(17,16,15,0.04)) 1px, transparent 1px)",
          backgroundSize: "4rem 4rem",
        }}
      />

      <PrimaryNav />

      {/* Content area — z-10 floats above the grid */}
      {/* pb-20: mobile bottom nav clearance */}
      <main
        id="main-content"
        className="flex-1 w-full relative z-10 flex flex-col pb-20 md:pb-0"
        style={{ maxWidth: "1440px", margin: "0 auto", width: "100%" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, filter: "blur(2px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(2px)" }}
            transition={TRANSITION_PAGE}
            className="flex flex-col flex-1"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
