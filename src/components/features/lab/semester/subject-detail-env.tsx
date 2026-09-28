"use client";

import { useMemo, useState } from "react";
import { motion, LayoutGroup } from "motion/react";
import { PageShell } from "@/components/layout/v2/page-shell";
import { useSemesterData } from "@/hooks/useSemesterData";
import { computeAttendanceReading } from "@/domain/attendance";
import { SemanticStatus } from "@/components/ui/v2/semantic-status";
import { CompactThreshold } from "@/components/ui/v2/compact-threshold";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import Link from "next/link";

const EASE = [0.22, 1, 0.36, 1] as const;

export function SubjectDetailEnv({ subjectId }: { subjectId: string }) {
  const { subjects, isLoading } = useSemesterData();
  const shouldReduce = useReducedMotion();
  const [simMode, setSimMode] = useState<"attend" | "skip">("attend");
  const [simCount, setSimCount] = useState<number>(1);

  const subject = useMemo(() => subjects.find(s => s.id === subjectId), [subjects, subjectId]);
  const reading = useMemo(() => subject && subject.snapshot ? computeAttendanceReading(subject.snapshot, subject.remainingClasses || 0) : null, [subject]);

  const projectedReading = useMemo(() => {
    if (!subject || !subject.snapshot) return null;
    const { effectiveAttended, held, threshold } = subject.snapshot;
    const pAttended = simMode === "attend" ? effectiveAttended + simCount : effectiveAttended;
    const pHeld = held + simCount;
    return computeAttendanceReading({ effectiveAttended: pAttended, held: pHeld, threshold, ordinaryAttended: 0, dl: 0, ml: 0 }, Math.max(0, (subject.remainingClasses || 0) - simCount));
  }, [subject, simMode, simCount]);

  const targetFeedback = useMemo(() => {
    if (!subject || !subject.snapshot) return "";
    const { effectiveAttended: a, held: h, threshold: t } = subject.snapshot;
    if (h === 0) return `ATTEND 1 CLASS TO ESTABLISH ${t}% TARGET`;
    
    const currentPercentage = (a / h) * 100;
    
    if (currentPercentage < t) {
      const required = Math.ceil(( (t/100) * h - a ) / (1 - (t/100)));
      return `YOU NEED TO ATTEND ${required} CONSECUTIVE CLASS${required === 1 ? '' : 'ES'} TO REACH ${t}%`;
    } else {
      const canSkip = Math.floor((a - (t/100)*h) / (t/100));
      if (canSkip === 0) {
        return `ON TARGET. MISSING THE NEXT CLASS WILL DROP YOU BELOW ${t}%.`;
      }
      return `YOU CAN STILL MISS ${canSkip} CLASS${canSkip === 1 ? '' : 'ES'} WHILE MAINTAINING ${t}%.`;
    }
  }, [subject]);

  const sectionVariants = {
    hidden: { opacity: 0, y: shouldReduce ? 0 : 10 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: shouldReduce ? { duration: 0.01 } : { delay: i * 0.055, duration: 0.32, ease: EASE },
    }),
  };

  if (isLoading) {
    return (
      <PageShell>
        <div className="px-8 lg:px-12 pt-10 pb-8 flex flex-col min-h-[50vh] justify-center items-start">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 text-ink-tertiary">
            <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            <span className="text-micro font-bold tracking-[0.18em] uppercase" style={{ fontFamily: "var(--font-data)" }}>LOADING SUBJECT</span>
          </motion.div>
        </div>
      </PageShell>
    );
  }

  if (!subject || !reading) {
    return (
      <PageShell>
        <div className="px-8 lg:px-12 pt-10 pb-8">
          <h1 className="text-[2rem] font-bold text-ink-v2">Subject not found</h1>
          <Link href="/semester" className="text-presynce underline mt-4 inline-block">Return to Semester</Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <LayoutGroup>
        
        {/* Navigation / Breadcrumb */}
        <div className="px-8 lg:px-12 pt-8 pb-2 flex items-center gap-2 text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary">
          <Link href="/semester" className="hover:text-ink-v2 transition-colors">SEMESTER</Link>
          <span>/</span>
          <span className="text-ink-v2">{subject.code}</span>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            §1  HERO — Identity & Margin
        ══════════════════════════════════════════════════════════════════ */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={0}
          className="px-8 lg:px-12 pt-4 pb-8 border-b border-line flex flex-col md:flex-row md:items-end justify-between gap-8"
        >
          <div className="flex-1 max-w-2xl">
            <h1
              className="font-bold tracking-tighter text-ink-v2 leading-[0.85] mb-4"
              style={{ fontSize: "clamp(3rem, 6vw, 4.5rem)", fontFamily: "var(--font-display)" }}
            >
              {subject.name}
            </h1>
            <div className="flex gap-6 text-meta font-bold tracking-[0.1em] uppercase text-ink-secondary" style={{ fontFamily: "var(--font-data)" }}>
              <span>{subject.code}</span>
              {subject.instructor && (
                <>
                  <span aria-hidden>A</span>
                  <span>{subject.instructor}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end min-w-[200px]">
            <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-2">CURRENT STANDING</span>
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-[3.5rem] font-bold tabular-nums text-ink-v2 leading-none" style={{ fontFamily: "var(--font-data)" }}>
                {reading.percentage.toFixed(1)}%
              </span>
            </div>
            {(() => {
              if (!subject.snapshot) return null;

              const { ordinaryAttended, dl, ml, held } = subject.snapshot;
              if (held === 0) return null;
              return (
                <div className="flex flex-col items-end gap-0.5 mb-3">
                  <span className="text-meta font-bold tracking-[0.1em] uppercase text-ink-secondary" style={{ fontFamily: "var(--font-data)" }}>
                    {ordinaryAttended} ATTENDED
                    {dl > 0 && <> + <span className="text-presynce">{dl} DL</span></>}
                    {ml > 0 && <> + <span className="text-presynce">{ml} ML</span></>}
                  </span>
                  <span className="text-meta tracking-[0.1em] uppercase text-ink-tertiary" style={{ fontFamily: "var(--font-data)" }}>
                    / {held} DELIVERED
                  </span>
                </div>
              );
            })()}  <div className="mt-2 w-full flex justify-start md:justify-end">
    <SemanticStatus reading={reading} />
  </div>
</div>
        </motion.section>
        {/* ══════════════════════════════════════════════════════════════════
            §2  PROJECTION INSTRUMENT
        ══════════════════════════════════════════════════════════════════ */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={1}
          className="px-8 lg:px-12 py-10 border-b border-line"
        >
          <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-6 block">PROJECTION SYSTEM</span>
          
          <div className="border border-line flex flex-col max-w-3xl">
            {/* Visualization Axis */}
            <div className="px-8 pt-8 pb-4 border-b border-line bg-paper relative z-10">
              <CompactThreshold 
                 snapshot={subject.snapshot} 
                 hoverAction={simMode} 
                 simulationCount={simCount} 
              />
            </div>
            
            {/* Interactive Control Panel */}
            <div className="flex flex-col sm:flex-row bg-ink-v2/[0.02]">
              {/* Mode Toggle */}
              <div className="flex border-r border-line">
                <button 
                  onClick={() => setSimMode("attend")} 
                  className={`px-6 py-5 text-micro font-bold tracking-[0.14em] uppercase transition-colors ${simMode === 'attend' ? 'bg-ink-v2 text-paper' : 'hover:bg-ink-v2/5 text-ink-secondary'}`}
                >
                  ATTEND
                </button>
                <button 
                  onClick={() => setSimMode("skip")} 
                  className={`px-6 py-5 text-micro font-bold tracking-[0.14em] uppercase transition-colors ${simMode === 'skip' ? 'bg-ink-v2 text-paper' : 'hover:bg-ink-v2/5 text-ink-secondary'}`}
                >
                  SKIP
                </button>
              </div>

              {/* Multiplier / Stepper */}
              <div className="flex items-center flex-1 border-r border-line justify-between px-6">
                 <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary hidden md:block">NEXT</span>
                 <div className="flex items-center">
                   <button onClick={() => setSimCount(Math.max(1, simCount - 1))} className="w-10 h-10 flex items-center justify-center border border-line rounded-full hover:border-ink-v2 hover:text-ink-v2 text-ink-tertiary transition-colors text-lg" aria-label="Decrease classes">-</button>
                   <span className="w-16 text-center text-xl font-bold tabular-nums text-ink-v2" style={{ fontFamily: "var(--font-data)" }}>{simCount}</span>
                   <button onClick={() => setSimCount(simCount + 1)} className="w-10 h-10 flex items-center justify-center border border-line rounded-full hover:border-ink-v2 hover:text-ink-v2 text-ink-tertiary transition-colors text-lg" aria-label="Increase classes">+</button>
                 </div>
                 <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary hidden md:block">CLASSES</span>
              </div>

              {/* Output Result */}
              <div className="px-6 py-4 flex flex-col justify-center items-end min-w-[140px] bg-paper">
                 <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-ink-tertiary mb-1">PROJECTION</span>
                 <span className={`text-[1.75rem] font-bold tabular-nums leading-none ${projectedReading?.status === "danger" ? "text-danger" : projectedReading?.status === "warn" ? "text-caution" : "text-safe"}`} style={{ fontFamily: "var(--font-data)" }}>
                   {projectedReading ? projectedReading.percentage.toFixed(1) : "0.0"}%
                 </span>
              </div>
            </div>
            
            {/* Mathematical Feedback */}
            <div className="px-6 py-4 border-t border-line bg-paper">
              <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-secondary">
                {targetFeedback}
              </span>
            </div>
          </div>
        </motion.section>

        {/* ══════════════════════════════════════════════════════════════════
            §3  ATTENDANCE HISTORY (Mock structural blocks)
        ══════════════════════════════════════════════════════════════════ */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={2}
          className="px-8 lg:px-12 py-10"
        >
           <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-6 block">RECENT HISTORY</span>
           <div className="flex gap-2 overflow-hidden max-w-3xl">
             {/* Mocking a heatmap/timeline blocks */}
             {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="flex-1 aspect-square max-w-[40px] rounded-sm flex items-center justify-center border border-line-strong"
                     style={{ background: i % 5 === 0 ? 'var(--color-danger-soft)' : i % 3 === 0 ? 'var(--color-paper)' : 'var(--color-safe-soft)' }}>
                  <span className="text-[10px] font-bold text-ink-v2/30" style={{ fontFamily: "var(--font-data)" }}>{14 - i}</span>
                </div>
             ))}
           </div>
        </motion.section>

      </LayoutGroup>
    </PageShell>
  );
}







