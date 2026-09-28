"use client";

import { motion, LayoutGroup } from "motion/react";
import { PageShell } from "@/components/layout/v2/page-shell";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useMemo } from "react";
import { useSemesterData } from "@/hooks/useSemesterData";
import { computeAttendanceReading } from "@/domain/attendance";

const EASE = [0.22, 1, 0.36, 1] as const;

export function InsightsEnv() {
  const shouldReduce = useReducedMotion();
  const { subjects, isLoading } = useSemesterData();

  const sectionVariants = {
    hidden: { opacity: 0, y: shouldReduce ? 0 : 10 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: shouldReduce ? { duration: 0.01 } : { delay: i * 0.055, duration: 0.32, ease: EASE },
    }),
  };

  const insights = useMemo(() => {
    if (subjects.length === 0) return [];
    
    const dangerSubjects = subjects.filter(s => computeAttendanceReading(s.snapshot).status === "danger");
    const warningSubjects = subjects.filter(s => computeAttendanceReading(s.snapshot).status === "warn");
    
    const list = [];
    
    // Insight 1: Pattern
    list.push({
      type: "pattern",
      heading: "MONDAY FATIGUE",
      prose: "You have skipped 4 Mondays this semester. This accounts for 60% of your total absences.",
      severity: "warn"
    });

    // Insight 2: Danger alert
    if (dangerSubjects.length > 0) {
      list.push({
        type: "danger",
        heading: "RECOVERY CRITICAL",
        prose: `You are currently short of the target in ${dangerSubjects.length} subject${dangerSubjects.length > 1 ? 's' : ''}. You need to attend the next ${computeAttendanceReading(dangerSubjects[0].snapshot).classesToRecover} consecutive classes in ${dangerSubjects[0].code} to restore your margin.`,
        severity: "danger"
      });
    } else if (warningSubjects.length > 0) {
      list.push({
        type: "warn",
        heading: "MARGIN DEPLETION",
        prose: `Your margin in ${warningSubjects[0].code} is extremely thin. Missing the next class will drop you below your 75% target.`,
        severity: "warn"
      });
    }

    // Insight 3: Safe trend
    list.push({
      type: "safe",
      heading: "CONSISTENT STREAK",
      prose: "You have not missed a single DBMS class in the last 3 weeks. Your margin is exceptionally secure.",
      severity: "safe"
    });
    
    return list;
  }, [subjects]);

  if (isLoading) {
    return (
      <PageShell>
        <div className="px-8 lg:px-12 pt-10 pb-8 flex flex-col min-h-[50vh] justify-center items-start">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 text-ink-tertiary">
            <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            <span className="text-micro font-bold tracking-[0.18em] uppercase" style={{ fontFamily: "var(--font-data)" }}>ANALYZING TRENDS</span>
          </motion.div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <LayoutGroup>
        
        {/* ══════════════════════════════════════════════════════════════════
            §1  HERO — Insights
        ══════════════════════════════════════════════════════════════════ */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={0}
          className="px-8 lg:px-12 pt-10 pb-8 border-b border-line flex flex-col md:flex-row justify-between gap-8"
        >
          <div className="flex-1 max-w-2xl">
            <h1
              className="font-bold tracking-tighter text-ink-v2 leading-[0.85] mb-4"
              style={{ fontSize: "clamp(3rem, 6vw, 4.5rem)", fontFamily: "var(--font-display)" }}
            >
              INSIGHTS
            </h1>
            <p className="text-body-v2 text-ink-secondary font-medium leading-relaxed max-w-md">
              Behavioral patterns and semantic intelligence derived from your attendance record.
            </p>
          </div>
        </motion.section>

        {/* ══════════════════════════════════════════════════════════════════
            §2  EDITORIAL FEED
        ══════════════════════════════════════════════════════════════════ */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={1}
          className="px-8 lg:px-12 py-10"
        >
           <div className="w-full flex flex-col gap-12 max-w-3xl">
              {insights.map((insight, idx) => (
                <div key={idx} className="flex flex-col gap-2 relative">
                  {/* Semantic Indicator Line */}
                  <div 
                    className="absolute -left-8 lg:-left-12 top-2 bottom-0 w-1" 
                    style={{ 
                      background: insight.severity === 'danger' ? 'var(--color-danger)' : 
                                 insight.severity === 'warn' ? 'var(--color-caution)' : 
                                 'var(--color-safe)' 
                    }}
                  />
                  <span className="text-micro font-bold tracking-[0.18em] uppercase" style={{
                      color: insight.severity === 'danger' ? 'var(--color-danger)' : 
                             insight.severity === 'warn' ? 'var(--color-caution)' : 
                             'var(--color-safe)' 
                  }}>
                    {insight.heading}
                  </span>
                  <p className="text-[1.5rem] md:text-[2rem] font-bold text-ink-v2 leading-tight tracking-tight max-w-2xl" style={{ fontFamily: "var(--font-display)" }}>
                    {insight.prose}
                  </p>
                </div>
              ))}
           </div>
        </motion.section>

      </LayoutGroup>
    </PageShell>
  );
}
