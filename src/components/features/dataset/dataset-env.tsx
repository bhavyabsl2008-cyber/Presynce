"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, LayoutGroup, useSpring, useTransform } from "motion/react";
import { PageShell } from "@/components/layout/v2/page-shell";
import { useStore } from "@/store";
import { Subject } from "@/domain/models";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { TRANSITION_LAYOUT, TRANSITION_PAGE } from "@/lib/motion";
import Link from "next/link";
import { computeAttendanceReading, deriveSnapshot } from "@/domain/attendance";

export function DatasetEnv() {
  const { subjects, student, updateSubject, removeSubject, addSubject, records, slots } = useStore();
  const shouldReduce = useReducedMotion();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const importedSubjects = subjects.filter(s => !!s.baseAttendance);
  const unimportedSubjects = subjects.filter(s => !s.baseAttendance);

  const healthScore = subjects.length === 0 ? 0 : Math.round((importedSubjects.length / subjects.length) * 100);

  // Animated health score
  const healthSpring = useSpring(0, { stiffness: 50, damping: 15, mass: 1 });
  
  useEffect(() => {
    if (!shouldReduce) {
      healthSpring.set(healthScore);
    }
  }, [healthScore, shouldReduce, healthSpring]);

  const animatedHealth = useTransform(healthSpring, Math.round);

  const handleUpdate = (subjectId: string, updates: Partial<Subject>) => {
    const s = subjects.find(x => x.id === subjectId);
    if (s) {
      updateSubject({ ...s, ...updates });
    }
  };

  return (
    <PageShell>
      <LayoutGroup>
        <motion.div 
          className="px-8 lg:px-12 pt-10 pb-8 flex flex-col gap-12"
          initial={{ opacity: 0, y: shouldReduce ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={TRANSITION_PAGE}
        >
          {/* Header & Health */}
          <section className="flex flex-col gap-4">
            <Link href="/semester" className="text-micro font-bold tracking-[0.14em] uppercase text-ink-tertiary hover:text-ink-secondary transition-colors">
              &larr; Back to Semester
            </Link>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-line">
              <div>
                <h1 className="font-bold tracking-tighter text-ink-v2 leading-[0.82] mb-2" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", fontFamily: "var(--font-display)" }}>
                  ACADEMIC DATASET
                </h1>
                <p className="text-body-v2 text-ink-secondary max-w-md">
                  The control center for your academic records. All features across the application read exclusively from this dataset.
                </p>
              </div>

              <div className="flex flex-col items-start md:items-end">
                <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-1">DATASET HEALTH</span>
                <div className={`flex items-baseline gap-1 text-[1.75rem] font-bold tabular-nums leading-none ${healthScore === 100 ? "text-safe" : "text-caution"}`} style={{ fontFamily: "var(--font-data)" }}>
                  <motion.span>{shouldReduce ? healthScore : animatedHealth}</motion.span>
                  <span>% IMPORTED</span>
                </div>
                <span className="text-meta text-ink-secondary mt-1">{importedSubjects.length} of {subjects.length} subjects synchronized</span>
              </div>
            </div>
          </section>

          {/* Dataset List */}
          <section className="flex flex-col gap-4">
             <div className="flex justify-between items-center mb-2">
                <h2 className="text-micro font-bold tracking-[0.18em] uppercase text-ink-secondary">SUBJECT REGISTRY</h2>
                <button 
                  onClick={() => {
                    const newId = `SUBJ-${Date.now()}`;
                    addSubject({
                      id: newId,
                      code: "NEW",
                      name: "New Subject",
                      shortLabel: "NEW",
                      instructor: "",
                      credits: 3,
                      type: "Theory"
                    });
                    setExpandedId(newId);
                  }}
                  className="text-micro font-bold tracking-[0.14em] uppercase text-blue hover:text-blue-hover transition-colors"
                >
                  + Add Manual Entry
                </button>
             </div>

             <div className="flex flex-col divide-y divide-line border-t border-line">
                {subjects.map((sub) => {
                  const isExpanded = expandedId === sub.id;
                  const isImported = !!sub.baseAttendance;
                  
                  // Get records for history
                  const subjectRecords = records
                    .filter(r => r.subjectId === sub.id)
                    .sort((a, b) => b.timestamp - a.timestamp); // newest first

                  return (
                    <motion.div 
                      layout
                      transition={TRANSITION_LAYOUT}
                      key={sub.id} 
          className={`relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${true ? 'hover:bg-surface-v2/40 cursor-pointer' : ''}`}
                      onClick={() => !isExpanded && setExpandedId(sub.id)}
                    >
                      <motion.div layout="position" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex flex-col min-w-0">
                          <span className="text-body-strong font-bold text-ink-v2 truncate">{sub.name}</span>
                          <span className="text-meta text-ink-tertiary tracking-[0.1em] mt-1" style={{ fontFamily: "var(--font-data)" }}>{sub.code}</span>
                        </div>
                        
                        <div className="flex items-center gap-4 shrink-0">
                           {isImported ? (
                             <span className="text-micro font-bold tracking-[0.1em] uppercase text-ink-secondary bg-surface-v2 px-2 py-1 border border-line-strong rounded-sm">
                               {sub.baseAttendance!.source}
                             </span>
                           ) : (
                             <span className="text-micro font-bold tracking-[0.1em] uppercase text-danger border border-danger/20 bg-danger/5 px-2 py-1 rounded-sm">
                               NEEDS DATA
                             </span>
                           )}
                           
                           {isExpanded && (
                             <button 
                               onClick={(e) => { e.stopPropagation(); setExpandedId(null); }}
                               className="text-micro font-bold tracking-[0.14em] uppercase text-ink-tertiary hover:text-ink-secondary"
                             >
                               Close
                             </button>
                           )}
                        </div>
                      </motion.div>

                      {/* Progressive Disclosure Panel */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={TRANSITION_LAYOUT}
                            className="overflow-hidden"
                          >
                            <div className="mt-8 pt-6 border-t border-line grid grid-cols-1 md:grid-cols-2 gap-8">
                               
                               {/* Edit Fields */}
                               <div className="flex flex-col gap-4">
                                  <div className="flex flex-col gap-1">
                                    <label className="text-micro font-bold tracking-[0.1em] uppercase text-ink-tertiary">Subject Name</label>
                                    <input 
                                      type="text" 
                                      value={sub.name} 
                                      onChange={(e) => handleUpdate(sub.id, { name: e.target.value })}
                                      className="bg-transparent border-b border-line py-2 text-body-v2 text-ink-v2 focus:outline-none focus:border-ink-secondary transition-colors"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="text-micro font-bold tracking-[0.1em] uppercase text-ink-tertiary">Faculty (Optional)</label>
                                    <input 
                                      type="text" 
                                      value={sub.instructor || ""} 
                                      onChange={(e) => handleUpdate(sub.id, { instructor: e.target.value })}
                                      className="bg-transparent border-b border-line py-2 text-body-v2 text-ink-v2 focus:outline-none focus:border-ink-secondary transition-colors"
                                      placeholder="e.g. Dr. Smith"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="text-micro font-bold tracking-[0.1em] uppercase text-ink-tertiary">Type</label>
                                    <select 
                                      value={sub.type || "Theory"} 
                                      onChange={(e) => handleUpdate(sub.id, { type: e.target.value as "Theory" | "Lab" })}
                                      className="bg-transparent border-b border-line py-2 text-body-v2 text-ink-v2 focus:outline-none focus:border-ink-secondary transition-colors"
                                    >
                                      <option value="Theory">Theory</option>
                                      <option value="Lab">Lab</option>
                                    </select>
                                  </div>
                               </div>

                               <div className="flex flex-col gap-6 bg-surface-v2 p-6 rounded-sm">
                                  <div className="flex justify-between items-center">
                                    <h3 className="text-micro font-bold tracking-[0.1em] uppercase text-ink-secondary">Baseline Record</h3>
                                    {isImported && <span className="text-meta text-ink-tertiary">Last updated: {new Date(sub.baseAttendance!.lastUpdated).toLocaleDateString()}</span>}
                                  </div>
                                  
                                  <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                      <span className="text-meta text-ink-secondary">Classes Held</span>
                                      <input 
                                        type="number" 
                                        min="0"
                                        value={sub.baseAttendance?.delivered?? ""}
                                        onChange={(e) => handleUpdate(sub.id, {
                                          baseAttendance: {
                                            attended: sub.baseAttendance?.attended || 0,
                                            dl: sub.baseAttendance?.dl?? 0,
                                            delivered: parseInt(e.target.value) || 0,
                                            lastUpdated: new Date().toISOString().split('T')[0],
                                            source: sub.baseAttendance?.source || "Manual"
                                          }
                                        })}
                                        placeholder="0"
                                        className="w-16 bg-transparent border-b border-line py-1 text-body-strong font-bold tabular-nums text-right focus:outline-none focus:border-ink-secondary"
                                        style={{ fontFamily: "var(--font-data)" }}
                                      />
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-meta text-ink-secondary">Classes Attended</span>
                                      <input 
                                        type="number" 
                                        min="0"
                                        value={sub.baseAttendance?.attended?? ""}
                                        onChange={(e) => handleUpdate(sub.id, {
                                          baseAttendance: {
                                            attended: parseInt(e.target.value) || 0,
                                            dl: sub.baseAttendance?.dl?? 0,
                                            delivered: sub.baseAttendance?.delivered || 0,
                                            lastUpdated: new Date().toISOString().split('T')[0],
                                            source: sub.baseAttendance?.source || "Manual"
                                          }
                                        })}
                                        placeholder="0"
                                        className="w-16 bg-transparent border-b border-line py-1 text-body-strong font-bold tabular-nums text-right focus:outline-none focus:border-ink-secondary"
                                        style={{ fontFamily: "var(--font-data)" }}
                                      />
                                    </div>
                                    <div className="flex justify-between items-center pt-4 border-t border-line">
                                      <span className="text-meta text-ink-secondary">Attendance</span>
                                      {(() => {
                                        const snap = deriveSnapshot(sub, records, student?.globalTarget?? 75);
                                        const reading = computeAttendanceReading(snap);
                                        const colorCls =
                                          reading.status === "safe" ? "text-safe"
                                          : reading.status === "warn" ? "text-warn"
                                          : reading.status === "danger" ? "text-danger"
                                          : "text-ink-tertiary";
                                        return (
                                          <span
                                            className={`text-[1.5rem] font-bold tabular-nums ${colorCls}`}
                                            style={{ fontFamily: "var(--font-data)" }}
                                          >
                                            {reading.percentage.toFixed(1)}%
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                  
                                  <div className="flex justify-between items-center pt-4 border-t border-line mt-2">
                                    <button
                                      onClick={() => {
                                        if (confirm("Are you sure you want to delete this subject-")) {
                                          removeSubject(sub.id);
                                        }
                                      }}
                                      className="text-meta font-bold tracking-[0.14em] uppercase text-danger hover:text-danger-hover transition-colors"
                                    >
                                      Remove Subject
                                    </button>
                                  </div>
                               </div>
                             </div>

                             {/* Attendance History */}
                             <div className="mt-8 pt-6 border-t border-line">
                                <h3 className="text-micro font-bold tracking-[0.1em] uppercase text-ink-secondary mb-4">Attendance History</h3>
                                {subjectRecords.length > 0 ? (
                                  <div className="flex flex-col divide-y divide-line">
                                    {subjectRecords.map(record => {
                                      const slot = slots.find(s => s.id === record.slotId);
                                      return (
                                        <div key={record.id} className="flex justify-between items-center py-3">
                                          <div className="flex items-center gap-4">
                                            <span className={`text-micro font-bold tracking-[0.14em] uppercase ${
                                              record.status === "present" ? "text-safe" :
                                              record.status === "absent" ? "text-danger" :
                                              record.status === "dl" ? "text-ink-v2" : "text-ink-tertiary"
                                            }`} style={{ width: "90px" }}>
                                              {record.status === "present" ? "PRESENT" : record.status === "absent" ? "ABSENT" : record.status === "dl" ? "DUTY LEAVE" : "NOT HELD"}
                                            </span>
                                            <span className="text-meta text-ink-secondary tabular-nums" style={{ fontFamily: "var(--font-data)" }}>
                                              {record.date} {slot ? `A ${slot.startTime}` : ""}
                                            </span>
                                          </div>
                                          <span className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary">
                                            SYSTEM
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-body-v2 text-ink-secondary">No records logged for this subject yet.</p>
                                )}
                             </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
             </div>
          </section>
        </motion.div>
      </LayoutGroup>
    </PageShell>
  );
}
