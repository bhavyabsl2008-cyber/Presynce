"use client";

import { useState, useMemo } from "react";
import { motion, LayoutGroup } from "motion/react";
import { PageShell } from "@/components/layout/v2/page-shell";
import { useSemesterData } from "@/hooks/useSemesterData";
import { computeAttendanceReading } from "@/domain/attendance";
import { CompactThreshold } from "@/components/ui/v2/compact-threshold";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const EASE = [0.22, 1, 0.36, 1] as const;

export function LeavesEnv() {
  const { subjects, isLoading } = useSemesterData();
  const shouldReduce = useReducedMotion();
  const [leaveDays, setLeaveDays] = useState<number>(0);

  const sectionVariants = {
    hidden: { opacity: 0, y: shouldReduce ? 0 : 10 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: shouldReduce ? { duration: 0.01 } : { delay: i * 0.055, duration: 0.32, ease: EASE },
    }),
  };

  const simulatedImpact = useMemo(() => {
    // Basic simulation: assume 1 day of leave = 1 class missed per subject.
    // In reality, this would query the exact timetable.
    return subjects.map(sub => {
      const currentReading = computeAttendanceReading(sub.snapshot);
      
      const newSnapshot = sub.snapshot ? {
        ...sub.snapshot,
        held: sub.snapshot.held + leaveDays,
        // attended stays the same since they are leaves
      } : null;
      const projectedReading = computeAttendanceReading(newSnapshot);

      return {
        subject: sub,
        currentReading,
        projectedReading,
        snapshot: sub.snapshot
      };
    });
  }, [subjects, leaveDays]);

  if (isLoading) {
    return (
      <PageShell>
        <div className="px-8 lg:px-12 pt-10 pb-8 flex flex-col min-h-[50vh] justify-center items-start">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 text-ink-tertiary">
            <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            <span className="text-micro font-bold tracking-[0.18em] uppercase" style={{ fontFamily: "var(--font-data)" }}>SYNCING PLANNER</span>
          </motion.div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <LayoutGroup>
        
        {/* ══════════════════════════════════════════════════════════════════
            §1  HERO — Leave Planner
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
              LEAVES
            </h1>
            <p className="text-body-v2 text-ink-secondary font-medium leading-relaxed max-w-md">
              Simulate the impact of absences before you take them.
            </p>
          </div>
        </motion.section>

        {/* ══════════════════════════════════════════════════════════════════
            §2  CONTROLS
        ══════════════════════════════════════════════════════════════════ */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={1}
          className="px-8 lg:px-12 py-10 border-b border-line"
        >
          <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-6 block">SIMULATE ABSENCE</span>
          
          <div className="flex flex-wrap gap-4">
             {[0, 1, 2, 3, 5, 7].map(days => (
               <button
                 key={days}
                 onClick={() => setLeaveDays(days)}
                 className={`px-8 py-4 border transition-colors ${leaveDays === days ? 'border-ink-v2 bg-ink-v2 text-paper font-bold' : 'border-line text-ink-secondary hover:border-ink-tertiary'} text-body-strong tracking-wide`}
               >
                 {days === 0 ? "NO LEAVE" : `${days} DAY${days > 1 ? 'S' : ''}`}
               </button>
             ))}
          </div>
        </motion.section>

        {/* ══════════════════════════════════════════════════════════════════
            §3  IMPACT SUMMARY
        ══════════════════════════════════════════════════════════════════ */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={2}
          className="px-8 lg:px-12 py-10"
        >
           <div className="w-full flex flex-col">
            <div className="hidden md:grid grid-cols-[2.5fr_1fr_1.5fr_1fr] gap-4 mb-4 pb-4 border-b border-line">
              <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-secondary">SUBJECT</span>
              <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-secondary text-right">IMPACT</span>
              <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-secondary text-center">MARGIN</span>
              <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-secondary text-right">CONSEQUENCE</span>
            </div>

            <div className="flex flex-col divide-y divide-line">
              {simulatedImpact.map(({ subject, currentReading, projectedReading, snapshot }) => {
                
                const crossesThreshold = snapshot !== null && (currentReading.percentage >= snapshot.threshold && projectedReading.percentage < snapshot.threshold);
                const isUnchanged = leaveDays === 0;

                return (
                  <div key={subject.id} className="py-6 flex flex-col md:grid md:grid-cols-[2.5fr_1fr_1.5fr_1fr] gap-4 md:items-center -mx-4 px-4 rounded-sm">
                    
                    {/* Subject Identity */}
                    <div className="flex flex-col justify-center">
                      <span className="text-body-strong font-bold text-ink-v2 mb-0.5">{subject.name}</span>
                      <div className="flex items-center gap-2 text-meta text-ink-secondary tracking-[0.1em]" style={{ fontFamily: "var(--font-data)" }}>
                        <span>{subject.code}</span>
                      </div>
                    </div>

                    {/* Percentage Drop */}
                    <div className="flex flex-col md:items-end justify-center">
                      <div className="flex items-center gap-2">
                         {!isUnchanged && <span className="text-[1.25rem] font-bold tabular-nums text-ink-tertiary line-through" style={{ fontFamily: "var(--font-data)" }}>
                           {snapshot ? currentReading.percentage.toFixed(1) : "--"}
                         </span>}
                         <span className={`text-[1.5rem] font-bold tabular-nums ${crossesThreshold ? 'text-danger' : 'text-ink-v2'}`} style={{ fontFamily: "var(--font-data)" }}>
                           {snapshot ? `${projectedReading.percentage.toFixed(1)}%` : "--%"}
                         </span>
                      </div>
                    </div>

                    {/* Threshold Rail */}
                    <div className="flex justify-center items-center w-full max-w-[200px] mx-auto">
                      <CompactThreshold 
                        snapshot={snapshot} 
                        hoverAction={leaveDays > 0 ? "skip" : null} 
                      />
                    </div>

                    {/* Consequence */}
                    <div className="flex flex-col md:items-end justify-center">
                       {crossesThreshold ? (
                         <span className="text-micro font-bold tracking-[0.18em] uppercase text-danger">DROPS BELOW TARGET</span>
                       ) : isUnchanged ? (
                         <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary">—</span>
                       ) : (
                         <span className="text-micro font-bold tracking-[0.18em] uppercase text-safe">SAFE</span>
                       )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>

      </LayoutGroup>
    </PageShell>
  );
}
