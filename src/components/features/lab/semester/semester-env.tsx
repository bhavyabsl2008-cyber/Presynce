"use client";

import { useState, useMemo } from "react";
import { motion, LayoutGroup } from "motion/react";
import { PageShell } from "@/components/layout/v2/page-shell";
import { useSemesterData } from "@/hooks/useSemesterData";
import { useStore } from "@/store";
import { computeAttendanceReading, AttendanceReading } from "@/domain/attendance";
import { SemanticStatus } from "@/components/ui/v2/semantic-status";
import { CompactThreshold } from "@/components/ui/v2/compact-threshold";
import { SemesterSubject } from "@/domain/types";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SubjectCard } from "./subject-card";
import Link from "next/link";

const EASE = [0.22, 1, 0.36, 1] as const;

export function SemesterEnv() {
  const { subjects, isLoading } = useSemesterData();
  const student = useStore((state) => state.student);
  const syncMeta = useStore((state) => state.syncMeta);
  const shouldReduce = useReducedMotion();
  
  const [filter, setFilter] = useState<"all" | "safe" | "warn" | "danger">("all");
  const [sortBy, setSortBy] = useState<"name" | "attendance" | "risk">("risk");

  // Entrance stagger variants
  const sectionVariants = {
    hidden: { opacity: 0, y: shouldReduce ? 0 : 10 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: shouldReduce ? { duration: 0.01 }
        : { delay: i * 0.055, duration: 0.32, ease: EASE },
    }),
  };

  const overview = useMemo(() => {
    let safe = 0;
    let warn = 0;
    let danger = 0;
    
    subjects.forEach((s) => {
      const r = computeAttendanceReading(s.snapshot, s.remainingClasses || 0);
      if (r.status === "safe") safe++;
      else if (r.status === "warn") warn++;
      else danger++;
    });

    return { safe, warn, danger, total: subjects.length };
  }, [subjects]);

  const processedSubjects = useMemo(() => {
    let result = [...subjects];
    
    // Filter
    if (filter !== "all") {
      result = result.filter(s => computeAttendanceReading(s.snapshot, s.remainingClasses || 0).status === filter);
    }
    
    // Sort
    result.sort((a, b) => {
      const readingA = computeAttendanceReading(a.snapshot, a.remainingClasses || 0);
      const readingB = computeAttendanceReading(b.snapshot, b.remainingClasses || 0);
      
      if (sortBy === "attendance") {
        return readingA.percentage - readingB.percentage;
      }
      if (sortBy === "risk") {
        // Higher risk = lower margin
        const marginA = a.snapshot ? readingA.percentage - a.snapshot.threshold : Infinity;
        const marginB = b.snapshot ? readingB.percentage - b.snapshot.threshold : Infinity;
        return marginA - marginB;
      }
      // Name
      return a.name.localeCompare(b.name);
    });
    
    return result;
  }, [subjects, filter, sortBy]);

  if (isLoading) {
    return (
      <PageShell>
        <div className="px-8 lg:px-12 pt-10 pb-8 flex flex-col min-h-[50vh] justify-center items-start">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-4 text-ink-tertiary"
          >
            <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            <span className="text-micro font-bold tracking-[0.18em] uppercase" style={{ fontFamily: "var(--font-data)" }}>SYNCING SEMESTER</span>
          </motion.div>
        </div>
      </PageShell>
    );
  }

  if (subjects.length === 0) {
    return (
      <PageShell>
        <div className="px-8 lg:px-12 pt-10 pb-8 flex flex-col min-h-[50vh] justify-center items-start">
          <h1 className="font-bold tracking-tighter text-ink-v2 leading-[0.82] mb-4" style={{ fontSize: "clamp(3.75rem, 8vw, 6.5rem)", fontFamily: "var(--font-display)" }}>
            SEMESTER
          </h1>
          <p className="text-body-v2 text-ink-secondary font-medium leading-relaxed max-w-md">
            No subjects found for this semester.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <LayoutGroup>
        {/* -�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�
            �1  HERO � Semester overview
        -�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-� */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={0}
          className="px-8 lg:px-12 pt-10 pb-8 border-b border-line
            flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div>
            <h1
              className="font-bold tracking-tighter text-ink-v2 leading-[0.82]"
              style={{
                fontSize: "clamp(3.75rem, 8vw, 6.5rem)",
                fontFamily: "var(--font-display)",
              }}
            >
              SEMESTER
            </h1>
            <p className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mt-2"
              style={{ fontFamily: "var(--font-data)" }}>
              {student?.semester || "CURRENT SEMESTER"} - {overview.total} SUBJECTS
            </p>
            <div className="mt-6 flex items-center gap-4">
              <Link href="/semester/dataset" className="inline-flex items-center gap-2 text-micro font-bold tracking-[0.14em] uppercase text-blue hover:text-blue-hover transition-colors">
                <span>Manage Dataset</span>
                <span aria-hidden>-</span>
              </Link>
              
              <Link href="/semester/dl" className="inline-flex items-center gap-2 text-micro font-bold tracking-[0.14em] uppercase text-presynce hover:opacity-80 transition-colors">
                <span>Log Duty Leave</span>
                <span aria-hidden>-</span>
              </Link>
              
              <Link href="/semester/ml" className="inline-flex items-center gap-2 text-micro font-bold tracking-[0.14em] uppercase text-presynce hover:opacity-80 transition-colors"><span>Medical Leave</span></Link><div className="w-px h-4 bg-line" />
              
              <div className="flex items-center gap-3">
                {syncMeta.status === "synced" && (
                  <span className="text-micro font-bold tracking-[0.18em] uppercase text-safe">
                    CHALKPAD - SYNCED {new Date(syncMeta.lastSyncedAt!).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {syncMeta.updatedSubjectIds.length} UPDATED
                  </span>
                )}
                {syncMeta.status === "error" && (
                  <span className="text-micro font-bold tracking-[0.18em] uppercase text-danger">
                    CHALKPAD - SYNC ERROR
                  </span>
                )}
                {syncMeta.status === "syncing" && (
                  <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-secondary">
                    CHALKPAD - SYNCING...
                  </span>
                )}

              </div>
            </div>
          </div>

          <div className="flex gap-8">
             <div className="flex flex-col">
               <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-1">SAFE</span>
               <span className="text-[1.75rem] font-bold tabular-nums text-safe leading-none" style={{ fontFamily: "var(--font-data)" }}>{overview.safe}</span>
             </div>
             <div className="flex flex-col">
               <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-1">WARNING</span>
               <span className="text-[1.75rem] font-bold tabular-nums text-caution leading-none" style={{ fontFamily: "var(--font-data)" }}>{overview.warn}</span>
             </div>
             <div className="flex flex-col">
               <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-1">DANGER</span>
               <span className="text-[1.75rem] font-bold tabular-nums text-danger leading-none" style={{ fontFamily: "var(--font-data)" }}>{overview.danger}</span>
             </div>
          </div>
        </motion.section>

        {/* -�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�
            �2  EDITORIAL TABLE & CONTROLS
        -�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-� */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={1}
          className="px-8 lg:px-12 py-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-8 gap-6 md:gap-4">
             <div className="flex items-center gap-6 w-full md:w-auto">
                <div className="flex flex-col gap-2 w-full md:w-auto">
                  <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary">FILTER</span>
                  <div className="flex flex-row overflow-x-auto no-scrollbar gap-4 md:gap-4 md:flex-wrap">
                     {(["all", "safe", "warn", "danger"] as const).map(f => (
                       <button 
                         key={f}
                         onClick={() => setFilter(f)}
                         className={`text-micro font-bold tracking-[0.14em] uppercase transition-colors ${filter === f ? 'text-ink-v2' : 'text-ink-tertiary hover:text-ink-secondary'}`}
                       >
                         {f}
                       </button>
                     ))}
                  </div>
                </div>
             </div>
             
             <div className="flex flex-col gap-2 md:items-end w-full md:w-auto">
                <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary">SORT BY</span>
                <div className="flex flex-row overflow-x-auto no-scrollbar gap-4 md:gap-4 md:flex-wrap">
                   {(["risk", "attendance", "name"] as const).map(s => (
                     <button 
                       key={s}
                       onClick={() => setSortBy(s)}
                       className={`text-micro font-bold tracking-[0.14em] uppercase transition-colors ${sortBy === s ? 'text-ink-v2' : 'text-ink-tertiary hover:text-ink-secondary'}`}
                     >
                       {s}
                     </button>
                   ))}
                </div>
             </div>
          </div>

          <div className="w-full flex flex-col">
            <div className="flex flex-col gap-4">
              {processedSubjects.map((sub) => (
                <SubjectCard key={sub.id} subject={sub} />
              ))}
              {processedSubjects.length === 0 && (
                 <div className="py-12 text-center text-ink-tertiary text-meta font-bold tracking-[0.1em] uppercase">
                   No subjects match this filter.
                 </div>
              )}
            </div>
          </div>
        </motion.section>
      </LayoutGroup>
    </PageShell>
  );
}



