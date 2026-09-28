"use client";

import { useState, useMemo } from "react";
import { SemesterSubject } from "@/domain/types";
import { computeAttendanceReading } from "@/domain/attendance";
import { SemanticStatus, getStatusColor } from "@/components/ui/v2/semantic-status";
import { CompactThreshold } from "@/components/ui/v2/compact-threshold";
import Link from "next/link";
import { useStore } from "@/store";
import { format, parseISO } from "date-fns";

export function SubjectCard({ subject }: { subject: SemesterSubject }) {
  const { student, events, records } = useStore();
  const [showLeaves, setShowLeaves] = useState(false);
  
  const subjectRecords = useMemo(() => {
    return records.filter(r => r.subjectId === subject.id && r.status === "dl").sort((a,b) => b.date.localeCompare(a.date));
  }, [records, subject.id]);

  const mlRecords = subjectRecords.filter(r => r.sourceEventId && events.some(e => e.id === r.sourceEventId && e.type === "medical_leave"));
  const dlRecords = subjectRecords.filter(r => !mlRecords.includes(r));
  const [simMode, setSimMode] = useState<"attend" | "skip">("attend");
  const [simCount, setSimCount] = useState<number>(0);

  const reading = computeAttendanceReading(subject.snapshot, subject.remainingClasses || 0);

  const projectedReading = useMemo(() => {
    if (!subject.snapshot) return null;
    const { effectiveAttended, held, threshold } = subject.snapshot;
    if (simCount === 0) return reading;
    
    const pAttended = simMode === "attend" ? effectiveAttended + simCount : effectiveAttended;
    const pHeld = held + simCount;
    return computeAttendanceReading({ effectiveAttended: pAttended, held: pHeld, threshold, ordinaryAttended: 0, dl: 0, ml: 0 }, Math.max(0, (subject.remainingClasses || 0) - simCount));
  }, [subject.snapshot, simMode, simCount, reading]);

  const projectedColor = projectedReading ? getStatusColor(projectedReading) : "text-ink-v2";

  return (
    <div className="border border-line bg-paper flex flex-col mb-8 relative">
      {/* Header */}
      <div className="p-6 md:p-8 flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-body-strong font-bold text-ink-v2 mb-1" style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontFamily: "var(--font-display)" }}>
            {subject.name}
          </h2>
          <div className="flex gap-4 text-meta font-bold tracking-[0.1em] uppercase text-ink-secondary" style={{ fontFamily: "var(--font-data)" }}>
            <span>{subject.code}</span>
            {subject.instructor && (
              <>
                <span aria-hidden>-</span>
                <span>{subject.instructor}</span>
              </>
            )}
          </div>
        </div>
        <Link 
          href={`/semester/${subject.id}`} 
          className="inline-flex items-center gap-2 text-micro font-bold tracking-[0.14em] uppercase text-ink-secondary hover:text-ink-v2 transition-colors border border-line px-4 py-2 hover:bg-surface-v2 shrink-0 self-start"
        >
          <span>EDIT / VIEW</span>
        </Link>
      </div>

      {/* Main Stats */}
      <div className="px-6 md:px-8 pb-8 flex flex-col md:flex-row md:items-end gap-8 border-b border-line">
        <div className="flex-1">
          <div className="flex justify-between items-baseline mb-4">
            <span className="text-[3rem] md:text-[4rem] font-bold tabular-nums text-ink-v2 leading-none" style={{ fontFamily: "var(--font-data)" }}>
              {reading.percentage.toFixed(1)}%
            </span>
            <div className="text-right flex flex-col items-end">
              <SemanticStatus reading={reading} className="text-body-strong" />
              <span className="text-meta font-bold tracking-[0.1em] uppercase text-ink-tertiary mt-1" style={{ fontFamily: "var(--font-data)" }}>
                  {(() => {
                    if (!subject.snapshot) return "";
                    const { ordinaryAttended, dl, ml, held } = subject.snapshot;
                    let text = `${ordinaryAttended} ATTENDED`;
                    if (dl > 0) text += ` + ${dl} DL`;
                    if (ml > 0) text += ` + ${ml} ML`;
                    return `${text} / ${held} DELIVERED`;
                  })()}{subjectRecords.length > 0 && (
                    <>
                      {' \u00B7 '}
                      <button 
                        onClick={() => setShowLeaves(!showLeaves)}
                        className="text-presynce hover:underline inline-flex items-center gap-1"
                      >
                        {dlRecords.length > 0 && `${dlRecords.length} DL`}
                        {dlRecords.length > 0 && mlRecords.length > 0 && ' \u00B7 '}
                        {mlRecords.length > 0 && `${mlRecords.length} ML`}
                        <span className="text-[10px]">▼</span>
                      </button>
                    </>
                  )}
              </span>
            </div>
          </div>
          <div className="w-full">
            <CompactThreshold snapshot={subject.snapshot} hoverAction={null} />
          </div>
        </div>

        {/* Immediate actionable numbers */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 shrink-0 min-w-[200px]">
          <div className="flex flex-col border-l-2 border-safe pl-4">
            <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-1">CAN STILL MISS</span>
            <span className="text-[1.75rem] font-bold tabular-nums text-ink-v2 leading-none" style={{ fontFamily: "var(--font-data)" }}>
              {reading.canStillMiss}
            </span>
          </div>
          <div className="flex flex-col border-l-2 border-danger pl-4">
            <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-1">TO REACH {subject.snapshot?.threshold || (student?.globalTarget?? 75)}%</span>
            <div className="flex items-baseline gap-2">
              <span className="text-[1.75rem] font-bold tabular-nums text-ink-v2 leading-none" style={{ fontFamily: "var(--font-data)" }}>
                {reading.classesToRecover}
              </span>
              <span className="text-meta font-bold tracking-[0.1em] uppercase text-ink-secondary">NEEDS</span>
            </div>
          </div>
        </div>
      </div>

            {showLeaves && subjectRecords.length > 0 && (
        <div className="bg-surface-v2 border-b border-line p-6 flex flex-col gap-4">
          <h3 className="text-micro font-bold tracking-[0.14em] uppercase text-ink-secondary border-b border-line pb-2">Leave History Audit</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjectRecords.map(r => {
              const ev = r.sourceEventId ? events.find(e => e.id === r.sourceEventId) : null;
              return (
                <div key={r.id} className="flex flex-col bg-paper border border-line p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-body-strong font-bold text-ink-v2">{format(parseISO(r.date), "EEE, d MMM yyyy")}</span>
                    <span className={`text-micro font-bold tracking-[0.1em] uppercase px-2 py-0.5 ${ev?.type === 'medical_leave' ? 'bg-danger-soft text-danger' : 'bg-presynce-soft text-presynce'}`}>
                      {ev?.type === 'medical_leave' ? 'MEDICAL LEAVE' : 'DUTY LEAVE'}
                    </span>
                  </div>
                  <span className="text-meta text-ink-secondary">{r.status.toUpperCase()} recorded for slot {r.slotId.substring(0, 8)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Projection Area */}
      <div className="bg-surface-v2/30 flex flex-col sm:flex-row border-b border-line">
        <div className="flex border-r border-line sm:border-b-0 border-b">
          <button 
            onClick={() => setSimMode("attend")} 
            className={`px-6 py-4 md:py-5 text-micro font-bold tracking-[0.14em] uppercase transition-colors flex-1 sm:flex-none ${simMode === 'attend' ? 'bg-ink-v2 text-paper' : 'hover:bg-ink-v2/5 text-ink-secondary'}`}
          >
            ATTEND NEXT
          </button>
          <button 
            onClick={() => setSimMode("skip")} 
            className={`px-6 py-4 md:py-5 text-micro font-bold tracking-[0.14em] uppercase transition-colors flex-1 sm:flex-none ${simMode === 'skip' ? 'bg-ink-v2 text-paper' : 'hover:bg-ink-v2/5 text-ink-secondary'}`}
          >
            SKIP NEXT
          </button>
        </div>

        <div className="flex items-center flex-1 justify-between px-6 py-4 border-b sm:border-b-0 border-line sm:border-r">
           <div className="flex items-center gap-4">
             <button 
                onClick={() => setSimCount(Math.max(0, simCount - 1))} 
                className="w-10 h-10 flex items-center justify-center border border-line rounded-full hover:border-ink-v2 hover:text-ink-v2 text-ink-tertiary transition-colors text-lg" 
                aria-label="Decrease classes"
             >-</button>
             <span className="w-12 text-center text-xl font-bold tabular-nums text-ink-v2" style={{ fontFamily: "var(--font-data)" }}>{simCount}</span>
             <button 
                onClick={() => setSimCount(simCount + 1)} 
                className="w-10 h-10 flex items-center justify-center border border-line rounded-full hover:border-ink-v2 hover:text-ink-v2 text-ink-tertiary transition-colors text-lg" 
                aria-label="Increase classes"
             >+</button>
           </div>
           <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary">CLASSES</span>
        </div>

        <div className="px-6 py-4 flex flex-col justify-center items-end min-w-[160px] bg-paper shrink-0">
           <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-ink-tertiary mb-1">PROJECTED</span>
           <div className="flex items-baseline gap-2">
             <span className={`text-[1.75rem] font-bold tabular-nums leading-none ${projectedColor}`} style={{ fontFamily: "var(--font-data)" }}>
               {projectedReading ? projectedReading.percentage.toFixed(1) : "0.0"}%
             </span>
           </div>
        </div>
      </div>

      {/* Best / Worst Case Outcomes */}
      <div className="bg-paper flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-line">
        <div className="flex-1 p-6 flex flex-col">
          <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-2">WORST CASE</span>
          {subject.remainingClasses !== null && subject.remainingClasses !== undefined ? (
             <div className="flex justify-between items-baseline">
                <span className="text-meta text-ink-secondary">If you skip all {subject.remainingClasses} remaining</span>
                <span className="text-xl font-bold tabular-nums text-danger" style={{ fontFamily: "var(--font-data)" }}>
                  {subject.snapshot ? (
                    subject.snapshot.held + subject.remainingClasses > 0 
                                  ? ((subject.snapshot.effectiveAttended / (subject.snapshot.held + subject.remainingClasses)) * 100).toFixed(1)
                      : "0.0"
                  ) : "0.0"}%
                </span>
             </div>
          ) : (
             <span className="text-meta text-ink-tertiary italic">Remaining timetable cannot be determined</span>
          )}
        </div>
        <div className="flex-1 p-6 flex flex-col">
          <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-2">BEST CASE</span>
          {subject.remainingClasses !== null && subject.remainingClasses !== undefined ? (
             <div className="flex justify-between items-baseline">
                <span className="text-meta text-ink-secondary">If you attend all {subject.remainingClasses} remaining</span>
                <span className="text-xl font-bold tabular-nums text-safe" style={{ fontFamily: "var(--font-data)" }}>
                  {subject.snapshot ? (
                    subject.snapshot.held + subject.remainingClasses > 0 
                                  ? (((subject.snapshot.effectiveAttended + subject.remainingClasses) / (subject.snapshot.held + subject.remainingClasses)) * 100).toFixed(1)
                      : "0.0"
                  ) : "0.0"}%
                </span>
             </div>
          ) : (
             <span className="text-meta text-ink-tertiary italic">Remaining timetable cannot be determined</span>
          )}
        </div>
      </div>
      {/* Projection Disclaimer */}
      {subject.remainingClasses !== null && subject.remainingClasses !== undefined && (
        <div className="bg-surface-v2/30 px-6 py-3 border-t border-line text-meta text-ink-tertiary flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>Based on current timetable & academic calendar</span>
          {(subject.exceptionsApplied?? 0) > 0 && (
            <span className="text-ink-secondary font-bold">
              Includes {subject.exceptionsApplied} schedule change{(subject.exceptionsApplied?? 0) === 1 ? '' : 's'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}








