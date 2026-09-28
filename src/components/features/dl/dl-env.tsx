"use client";

import { useState, useMemo } from "react";
import { PageShell } from "@/components/layout/v2/page-shell";
import { useStore } from "@/store";
import { getScheduledSlotsForDate } from "@/lib/timetable/calendar";
import { format, parseISO, addDays, isAfter, isBefore, isEqual, startOfDay } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TimetableSlot } from "@/domain/models";

interface PreviewDay {
  dateStr: string;
  displayDate: string;
  slots: TimetableSlot[];
}

export function DlEnv() {
  const router = useRouter();
  const { slots, subjects, logAttendance, records } = useStore();
  
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [coverage, setCoverage] = useState<"all" | "time">("all");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");
  const [previewData, setPreviewData] = useState<PreviewDay[] | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const handlePreview = () => {
    let start = parseISO(startDate);
    let end = parseISO(endDate);
    
    if (isAfter(start, end)) {
      const temp = start;
      start = end;
      end = temp;
      setStartDate(format(start, "yyyy-MM-dd"));
      setEndDate(format(end, "yyyy-MM-dd"));
    }

    const newPreview: PreviewDay[] = [];
    let current = start;

    while (isBefore(current, end) || isEqual(current, end)) {
      const dateStr = format(current, "yyyy-MM-dd");
      let daySlots = getScheduledSlotsForDate(dateStr, slots, subjects);
      if (coverage === "time") {
        daySlots = daySlots.filter(s => s.startTime >= startTime && s.endTime <= endTime);
      }
      
      if (daySlots.length > 0) {
        newPreview.push({
          dateStr,
          displayDate: format(current, "EEE, dd MMM yyyy"),
          slots: daySlots
        });
      }
      
      current = addDays(current, 1);
    }

    setPreviewData(newPreview);
    setConfirmReplace(false);
  };

  const handleApply = () => {
    if (!previewData) return;
    setIsApplying(true);
    
    // Simulate slight delay for interaction quality
    setTimeout(() => {
      previewData.forEach(day => {
        day.slots.forEach(slot => {
          logAttendance({
            id: crypto.randomUUID(),
            slotId: slot.id,
            subjectId: slot.subjectId,
            date: day.dateStr,
            status: "dl",
            timestamp: Date.now()
          });
        });
      });
      
      router.push("/semester");
    }, 400);
  };

  let totalClasses = 0;
  let replaceCount = 0;
  let dlCount = 0;

  if (previewData) {
    previewData.forEach(day => {
      day.slots.forEach(slot => {
        totalClasses++;
        const existing = records.find(r => r.slotId === slot.id && r.date === day.dateStr);
        if (existing) {
          if (existing.status === "dl") {
            dlCount++;
          } else if (existing.status === "present" || existing.status === "absent") {
            replaceCount++;
          }
        }
      });
    });
  }

  const needsConfirmation = replaceCount > 0;
  const canApply = !needsConfirmation || confirmReplace;

  return (
    <PageShell>
      <div className="flex-1 flex flex-col p-6 md:p-8 bg-bg max-w-4xl mx-auto w-full">
        <header className="mb-10">
          <Link href="/semester" className="inline-flex items-center gap-2 text-micro font-bold tracking-[0.14em] uppercase text-ink-secondary hover:text-ink-v2 transition-colors mb-6">
            <span aria-hidden>&larr;</span>
            <span>Back to Semester</span>
          </Link>
          <h1 className="text-section-title font-bold uppercase tracking-widest text-ink-v2">
            LOG DUTY LEAVE
          </h1>
          <p className="text-body-v2 text-ink-secondary mt-2">
            Apply bulk duty leave (DL) across a date range. Only scheduled classes will be affected.
          </p>
        </header>

        <section className="bg-paper border border-line p-6 md:p-8 mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row gap-6 mb-8">
            <label className="flex-1 flex flex-col gap-2">
              <span className="text-meta font-bold text-ink-secondary uppercase tracking-widest">Start Date</span>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-line bg-surface-v2 p-4 font-bold tabular-nums text-ink-v2 outline-none focus:border-presynce" 
              />
            </label>
            <label className="flex-1 flex flex-col gap-2">
              <span className="text-meta font-bold text-ink-secondary uppercase tracking-widest">End Date</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-line bg-surface-v2 p-4 font-bold tabular-nums text-ink-v2 outline-none focus:border-presynce" 
              />
            </label>
          </div>
          <div className="flex flex-col gap-6 mb-8 border-t border-line pt-6">
            <span className="text-meta font-bold text-ink-secondary uppercase tracking-widest">Coverage</span>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="coverage" value="all" checked={coverage === "all"} onChange={() => setCoverage("all")} className="w-4 h-4 accent-presynce" />
                <span className="text-body-strong font-bold text-ink-v2">ALL DAY</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="coverage" value="time" checked={coverage === "time"} onChange={() => setCoverage("time")} className="w-4 h-4 accent-presynce" />
                <span className="text-body-strong font-bold text-ink-v2">TIME RANGE</span>
              </label>
            </div>
            
            {coverage === "time" && (
              <div className="flex flex-col md:flex-row gap-6 mt-2">
                <label className="flex-1 flex flex-col gap-2">
                  <span className="text-meta font-bold text-ink-secondary uppercase tracking-widest">From Time</span>
                  <input 
                    type="time" 
                    value={startTime} 
                    onChange={(e) => setStartTime(e.target.value)}
                    className="border border-line bg-surface-v2 p-4 font-bold tabular-nums text-ink-v2 outline-none focus:border-presynce" 
                  />
                </label>
                <label className="flex-1 flex flex-col gap-2">
                  <span className="text-meta font-bold text-ink-secondary uppercase tracking-widest">To Time</span>
                  <input 
                    type="time" 
                    value={endTime} 
                    onChange={(e) => setEndTime(e.target.value)}
                    className="border border-line bg-surface-v2 p-4 font-bold tabular-nums text-ink-v2 outline-none focus:border-presynce" 
                  />
                </label>
              </div>
            )}
          </div>
          
          <button
            onClick={handlePreview}
            className="w-full py-4 bg-ink-v2 text-paper font-bold tracking-[0.14em] uppercase text-micro hover:opacity-90 transition-opacity"
          >
            Preview Affected Classes
          </button>
        </section>

        <AnimatePresence>
          {previewData && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6"
            >
              <div className="flex items-center justify-between border-b border-line pb-4">
                <h2 className="text-micro font-bold tracking-[0.18em] uppercase text-ink-v2">
                  Preview & Confirm
                </h2>
                <div className="flex items-center gap-3">
                  {replaceCount > 0 && (
                    <span className="text-meta font-bold tracking-[0.1em] uppercase text-danger bg-danger-soft px-3 py-1 rounded-full">
                      {replaceCount} to replace
                    </span>
                  )}
                  <span className="text-meta font-bold tracking-[0.1em] uppercase text-presynce bg-presynce-soft px-3 py-1 rounded-full">
                    {totalClasses} Affected
                  </span>
                </div>
              </div>

              {previewData.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-line bg-surface-v2">
                  <p className="text-body-strong font-bold text-ink-tertiary">No classes scheduled in this range.</p>
                  <p className="text-meta text-ink-tertiary mt-2">Holidays and weekends without timetabled classes are safely skipped.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {previewData.map(day => (
                    <div key={day.dateStr} className="border border-line bg-paper">
                      <div className="bg-surface-v2 px-5 py-3 border-b border-line">
                        <span className="text-meta font-bold tracking-[0.14em] uppercase text-ink-secondary">
                          {day.displayDate}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        {day.slots.map((slot, i) => {
                          const sub = subjects.find(s => s.id === slot.subjectId);
                          const existing = records.find(r => r.slotId === slot.id && r.date === day.dateStr);
                          
                          let statusNode = null;
                          if (!existing || existing.status === "cancelled") {
                            statusNode = <span className="text-micro font-bold tracking-[0.1em] uppercase text-safe">+ DL</span>;
                          } else if (existing.status === "dl") {
                            statusNode = <span className="text-micro font-bold tracking-[0.1em] uppercase text-ink-tertiary">Already DL</span>;
                          } else {
                            statusNode = <span className="text-micro font-bold tracking-[0.1em] uppercase text-danger">Will replace {existing.status}</span>;
                          }
                          
                          return (
                            <div key={slot.id} className={`flex items-center justify-between px-5 py-4 ${i !== day.slots.length - 1 ? 'border-b border-line' : ''}`}>
                              <div className="flex items-center gap-4">
                                <span className="text-meta font-bold tabular-nums text-ink-secondary w-28">
                                  {slot.startTime} - {slot.endTime}
                                </span>
                                <span className="text-body-strong font-bold text-ink-v2">
                                  {sub?.name || "Unknown"}
                                </span>
                              </div>
                              {statusNode}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {previewData.length > 0 && (
                <div className="mt-4 flex flex-col items-end gap-4 border-t border-line pt-6">
                  {needsConfirmation && (
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={confirmReplace} 
                        onChange={(e) => setConfirmReplace(e.target.checked)}
                        className="w-5 h-5 accent-danger border-line-strong cursor-pointer"
                      />
                      <span className="text-meta font-bold uppercase tracking-widest text-ink-secondary group-hover:text-danger transition-colors">
                        I acknowledge this will overwrite {replaceCount} existing {replaceCount === 1 ? 'record' : 'records'}
                      </span>
                    </label>
                  )}
                  <button
                    onClick={handleApply}
                    disabled={isApplying || !canApply}
                    className="px-8 py-4 bg-presynce text-paper font-bold tracking-[0.14em] uppercase text-micro hover:opacity-90 transition-opacity disabled:opacity-50 disabled:grayscale"
                  >
                    {isApplying ? "APPLYING..." : "CONFIRM & LOG DUTY LEAVE"}
                  </button>
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}
