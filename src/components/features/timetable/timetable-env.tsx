"use client";

import { useState, useMemo } from "react";
import { PageShell } from "@/components/layout/v2/page-shell";
import { useStore } from "@/store";
import { DAYS, TIMETABLES, SLOTS } from "@/lib/timetable/data";
import { TimetableSlot, Subject, DayOfWeek } from "@/domain/models";
import { motion, AnimatePresence } from "motion/react";

export function TimetableEnv() {
  const { slots: userSlots, subjects: userSubjects, addSlot, updateSlot, removeSlot, addSubject } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<"personal" | "batch">("personal");
  const [selectedBatch, setSelectedBatch] = useState<string>("G1");

  
  // State for the slot editor modal
  const [activeDay, setActiveDay] = useState<DayOfWeek | null>(null);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);

  // Modal form state
  const [formData, setFormData] = useState({
    subjectId: "",
    startTime: "",
    endTime: "",
    room: "",
    type: "Lecture" as "Lecture" | "Lab" | "Tutorial",
    newSubjectName: "",
    newSubjectCode: ""
  });
  const [isAddingNewSubject, setIsAddingNewSubject] = useState(false);

  const { slots, subjects } = useMemo(() => {
    if (viewMode === "personal") {
      return { slots: userSlots, subjects: userSubjects };
    }
    
    // Parse Batch Timetable
    const batchData = TIMETABLES[selectedBatch];
    if (!batchData) return { slots: [], subjects: [] };

    const batchSlots: TimetableSlot[] = [];
    const batchSubjects: Subject[] = [];
    
    Object.entries(batchData).forEach(([day, entries]) => {
      entries.forEach((entry, idx) => {
        let sub = batchSubjects.find(s => s.code === entry.subject);
        if (!sub) {
          sub = {
            id: `batch-sub-${entry.subject}`,
            code: entry.subject,
            name: entry.subject,
            shortLabel: entry.subject,
            instructor: "TBA",
            credits: 4,
            type: entry.isLab ? "Lab" : "Theory"
          };
          batchSubjects.push(sub);
        }

        const startSlotId = entry.slots[0];
        const endSlotId = entry.slots[entry.slots.length - 1];
        
        const startSlotDef = SLOTS.find(s => s.id === startSlotId);
        const endSlotDef = SLOTS.find(s => s.id === endSlotId);
        
                  if (startSlotDef && endSlotDef) {
            // Split on en-dash (U+2013) — matches the format used in SLOTS
            const [startTime] = startSlotDef.time.split('–');
            const endTimeParts = endSlotDef.time.split('–');
            const endTime = endTimeParts[1] ?? endTimeParts[0];

            const cleanStart = (startTime ?? '').trim().padStart(5, '0');
            const cleanEnd = (endTime ?? '').trim().padStart(5, '0');

          batchSlots.push({
            id: `batch-slot-${day}-${idx}`,
            subjectId: sub.id,
            day: day as DayOfWeek,
            startTime: cleanStart,
            endTime: cleanEnd,
            room: "TBA",
            building: "",
            type: entry.isLab ? "Lab" : "Lecture"
          });
        }
      });
    });

    return { slots: batchSlots, subjects: batchSubjects };
  }, [viewMode, selectedBatch, userSlots, userSubjects]);

  const openAddModal = (day: DayOfWeek, startTime = "09:00", endTime = "10:00") => {
    setActiveDay(day);
    setEditingSlot(null);
    setFormData({ subjectId: subjects[0]?.id || "", startTime, endTime, room: "", type: "Lecture", newSubjectName: "", newSubjectCode: "" });
    setIsAddingNewSubject(subjects.length === 0);
  };

  const openEditModal = (slot: TimetableSlot) => {
    setActiveDay(slot.day);
    setEditingSlot(slot);
    setFormData({
      subjectId: slot.subjectId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room,
      type: slot.type,
      newSubjectName: "",
      newSubjectCode: ""
    });
    setIsAddingNewSubject(false);
  };

  const closeModal = () => {
    setActiveDay(null);
    setEditingSlot(null);
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDay) return;

    let finalSubjectId = formData.subjectId;

    if (isAddingNewSubject && formData.newSubjectName) {
      finalSubjectId = crypto.randomUUID();
      const newSub: Subject = {
        id: finalSubjectId,
        code: formData.newSubjectCode || formData.newSubjectName.substring(0, 3).toUpperCase(),
        name: formData.newSubjectName,
        shortLabel: formData.newSubjectCode || formData.newSubjectName.substring(0, 3).toUpperCase(),
        instructor: "TBA",
        credits: 4,
        type: formData.type === "Lab" ? "Lab" : "Theory"
      };
      addSubject(newSub);
    }

    if (!finalSubjectId) return;

    const newSlot: TimetableSlot = {
      id: editingSlot ? editingSlot.id : crypto.randomUUID(),
      subjectId: finalSubjectId,
      day: activeDay,
      startTime: formData.startTime,
      endTime: formData.endTime,
      room: formData.room,
      building: "",
      type: formData.type
    };

    if (editingSlot) {
      updateSlot(newSlot);
    } else {
      addSlot(newSlot);
    }

    closeModal();
  };

  const handleDeleteSlot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Remove this class from your timetable-")) {
      removeSlot(id);
    }
  };

  const minTime = useMemo(() => slots.length > 0 ? slots.reduce((min, s) => s.startTime < min ? s.startTime : min, "09:00") : "09:00", [slots]);
  const maxTime = useMemo(() => slots.length > 0 ? slots.reduce((max, s) => s.endTime > max ? s.endTime : max, "16:00") : "16:00", [slots]);

  const periods = useMemo(() => {
    let boundariesArray = Array.from(new Set(slots.flatMap(s => [s.startTime, s.endTime]))).sort();
    if (boundariesArray.length < 2) {
      boundariesArray = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
    }
    const p: { start: string, end: string }[] = [];
    for (let i = 0; i < boundariesArray.length - 1; i++) {
      p.push({ start: boundariesArray[i], end: boundariesArray[i+1] });
    }
    return p;
  }, [slots]);

  return (
    <PageShell>
      <div className="flex-1 flex flex-col p-6 md:p-8 bg-bg">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="flex flex-col gap-4">
            <h1 className="text-section-title font-bold uppercase tracking-widest text-ink-v2">
              TIMETABLE
            </h1>
            
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={() => setViewMode("personal")}
                className={`px-4 py-2 text-micro font-bold tracking-[0.1em] uppercase transition-colors ${
                  viewMode === "personal" 
                    ? "bg-presynce text-paper" 
                    : "bg-surface-v2 text-ink-secondary hover:bg-line"
                }`}
              >
                My Timetable
              </button>
              <button 
                onClick={() => setViewMode("batch")}
                className={`px-4 py-2 text-micro font-bold tracking-[0.1em] uppercase transition-colors ${
                  viewMode === "batch" 
                    ? "bg-presynce text-paper" 
                    : "bg-surface-v2 text-ink-secondary hover:bg-line"
                }`}
              >
                View All Batches
              </button>
              
              {viewMode === "batch" && (
                <div className="flex items-center gap-2 ml-4">
                  {Object.keys(TIMETABLES).map(batch => (
                    <button
                      key={batch}
                      onClick={() => setSelectedBatch(batch)}
                      className={`w-10 h-10 flex items-center justify-center text-meta font-bold transition-colors ${
                        selectedBatch === batch 
                          ? "bg-ink-v2 text-paper" 
                          : "bg-surface-v2 text-ink-secondary hover:bg-line border border-line"
                      }`}
                    >
                      {batch}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {viewMode === "personal" && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-6 py-2.5 font-bold tracking-[0.1em] uppercase text-micro transition-colors ${
                  isEditing ? "bg-presynce text-paper" : "border border-line-strong text-ink-v2 hover:bg-surface-v2"
              }`}
            >
              {isEditing ? "Done Editing" : "Edit Timetable"}
            </button>
          )}
        </header>

        <div className="flex-1 overflow-auto border border-line bg-paper">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr>
                <th className="p-4 border-b border-r border-line bg-surface-v2 text-meta font-bold uppercase tracking-widest text-ink-secondary w-32">Day</th>
                <th className="p-4 border-b border-line bg-surface-v2 text-meta font-bold uppercase tracking-widest text-ink-secondary">Schedule</th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map(day => {
                const daySlots = slots.filter(s => s.day === day).sort((a,b) => a.startTime.localeCompare(b.startTime));
                const activeEditing = isEditing && viewMode === "personal";
                
                return (
                  <tr key={day} className="border-b border-line hover:bg-surface/30">
                    <td className="p-4 align-middle border-r border-line text-body-strong font-bold text-ink-v2 w-32">{day}</td>
                    <td className="p-4">
                      {daySlots.length === 0 ? (
                        <div className="flex items-center h-full min-h-[82px]">
                          <span className="text-meta text-ink-tertiary italic">No classes scheduled</span>
                          {activeEditing && (
                            <button 
                              onClick={() => openAddModal(day, "09:00", "10:00")} 
                              className="ml-6 px-4 py-2 border border-dashed border-line text-micro font-bold uppercase tracking-[0.1em] text-presynce hover:bg-presynce-soft transition-colors"
                            >
                              + Add Class
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-nowrap items-stretch gap-3 overflow-x-auto pb-2 -mb-2">
                          {daySlots.map((slot, i) => {
                            const sub = subjects.find(s => s.id === slot.subjectId);
                            const elements = [];
                            
                            // Check for gap before this slot
                            if (i === 0 && slot.startTime > "09:00") {
                              elements.push(
                                <div key={`free-start-${slot.id}`} className="flex shrink-0">
                                  {activeEditing ? (
                                    <button 
                                      onClick={() => openAddModal(day, "09:00", slot.startTime)}
                                      className="flex flex-col items-center justify-center border border-dashed border-line text-presynce hover:bg-presynce-soft hover:border-presynce px-4 min-w-[80px] transition-colors"
                                    >
                                      <span className="text-micro font-bold uppercase tracking-widest">+ Add</span>
                                      <span className="text-[0.65rem] tabular-nums">09:00-{slot.startTime}</span>
                                    </button>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center border border-presynce/30 bg-presynce-soft/30 px-6 min-w-[90px]">
                                      <span className="text-micro font-bold tracking-[0.16em] uppercase text-presynce">{slot.startTime >= "14:00" ? "LUNCH BREAK" : "FREE"}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            } else if (i > 0) {
                              const prev = daySlots[i - 1];
                              if (slot.startTime > prev.endTime) {
                                elements.push(
                                  <div key={`free-${prev.id}-${slot.id}`} className="flex shrink-0">
                                    {activeEditing ? (
                                      <button 
                                        onClick={() => openAddModal(day, prev.endTime, slot.startTime)}
                                        className="flex flex-col items-center justify-center border border-dashed border-line text-presynce hover:bg-presynce-soft hover:border-presynce px-4 min-w-[90px] transition-colors"
                                      >
                                        <span className="text-micro font-bold uppercase tracking-widest">+ Add</span>
                                        <span className="text-[0.65rem] tabular-nums">{prev.endTime}-{slot.startTime}</span>
                                      </button>
                                    ) : (
                                      <div className="flex flex-col items-center justify-center border border-presynce/30 bg-presynce-soft/30 px-6 min-w-[90px]">
                                        <span className="text-micro font-bold tracking-[0.16em] uppercase text-presynce">{prev.endTime <= "13:00" && slot.startTime >= "14:00" ? "LUNCH BREAK" : "FREE"}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            }

                            // The actual class card
                            elements.push(
                              <div 
                                key={slot.id} 
                                onClick={() => activeEditing && openEditModal(slot)}
                                className={`relative flex flex-col p-3 border min-w-[160px] max-w-[220px] shrink-0 transition-colors ${
                                  activeEditing
                                    ? "border-presynce bg-presynce-soft cursor-pointer hover:bg-presynce-field" 
                                    : "border-line bg-paper"
                                }`}
                              >
                                <span className="text-micro font-bold tracking-[0.08em] tabular-nums text-ink-secondary mb-1">
                                  {slot.startTime} - {slot.endTime}
                                </span>
                                
                                <span className="text-body-strong font-bold text-ink-v2 leading-tight break-words whitespace-normal mb-2">
                                  {sub?.name || "Unknown Subject"}
                                </span>
                                
                                <div className="flex items-center justify-between mt-auto pt-2">
                                  <span className="text-[0.7rem] font-bold text-ink-tertiary flex gap-1.5 items-center">
                                    <span>{sub?.shortLabel || sub?.code}</span>
                                    <span aria-hidden>-</span>
                                    <span>{slot.type}</span>
                                  </span>
                                  {slot.room && <span className="text-[0.7rem] text-ink-secondary font-bold">{slot.room}</span>}
                                </div>

                                {activeEditing && (
                                  <button
                                    onClick={(e) => handleDeleteSlot(slot.id, e)}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-danger text-paper rounded-full flex items-center justify-center font-bold shadow-sm z-20 hover:scale-110 transition-transform"
                                    aria-label="Delete slot"
                                  >
                                    x
                                  </button>
                                )}
                              </div>
                            );

                            // At the very end of the day slots, offer an append action in edit mode
                            if (i === daySlots.length - 1 && activeEditing) {
                              elements.push(
                                <div key="append" className="flex shrink-0 pl-1">
                                  <button 
                                    onClick={() => openAddModal(day, slot.endTime, "16:00")}
                                    className="flex items-center justify-center w-12 border border-dashed border-line text-ink-secondary hover:text-presynce hover:border-presynce transition-colors group"
                                    title="Add class after this"
                                  >
                                    <span className="font-bold text-xl group-hover:scale-125 transition-transform">+</span>
                                  </button>
                                </div>
                              );
                            }

                            return elements;
                          })}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {activeDay && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-ink-v2/20 backdrop-blur-sm"
              onClick={closeModal}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="relative bg-paper border border-line shadow-2xl p-6 md:p-8 w-full max-w-lg"
            >
              <h2 className="text-section-title font-bold text-ink-v2 mb-6 uppercase tracking-tight">
                {editingSlot ? "Edit Slot" : "Add Slot"} <span className="text-ink-secondary">— {activeDay}</span>
              </h2>

              <form onSubmit={handleSaveSlot} className="flex flex-col gap-5">
                <div className="flex gap-4">
                  <label className="flex-1 flex flex-col gap-2">
                    <span className="text-meta font-bold text-ink-secondary uppercase tracking-widest">Start Time</span>
                    <input type="time" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="border border-line bg-surface-v2 p-3 font-bold tabular-nums" />
                  </label>
                  <label className="flex-1 flex flex-col gap-2">
                    <span className="text-meta font-bold text-ink-secondary uppercase tracking-widest">End Time</span>
                    <input type="time" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="border border-line bg-surface-v2 p-3 font-bold tabular-nums" />
                  </label>
                </div>

                <div className="flex flex-col gap-2 border-t border-line pt-5">
                  <div className="flex justify-between items-center">
                    <span className="text-meta font-bold text-ink-secondary uppercase tracking-widest">Subject</span>
                    {subjects.length > 0 && (
                      <button type="button" onClick={() => setIsAddingNewSubject(!isAddingNewSubject)} className="text-micro font-bold text-presynce uppercase underline">
                        {isAddingNewSubject ? "Select Existing" : "+ New Subject"}
                      </button>
                    )}
                  </div>
                  
                  {isAddingNewSubject ? (
                    <div className="flex flex-col gap-3 p-4 bg-surface-v2 border border-line">
                      <input type="text" placeholder="Subject Name (e.g. Data Structures)" required value={formData.newSubjectName} onChange={e => setFormData({...formData, newSubjectName: e.target.value})} className="border border-line bg-paper p-3 text-body-strong" />
                      <input type="text" placeholder="Subject Code (optional)" value={formData.newSubjectCode} onChange={e => setFormData({...formData, newSubjectCode: e.target.value})} className="border border-line bg-paper p-3 text-body-strong" />
                    </div>
                  ) : (
                    <select required value={formData.subjectId} onChange={e => setFormData({...formData, subjectId: e.target.value})} className="border border-line bg-surface-v2 p-3 text-body-strong font-bold text-ink-v2">
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                    </select>
                  )}
                </div>

                <div className="flex gap-4 border-t border-line pt-5">
                  <label className="flex-1 flex flex-col gap-2">
                    <span className="text-meta font-bold text-ink-secondary uppercase tracking-widest">Type</span>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="border border-line bg-surface-v2 p-3 font-bold text-ink-v2">
                      <option>Lecture</option>
                      <option>Tutorial</option>
                      <option>Lab</option>
                    </select>
                  </label>
                  <label className="flex-1 flex flex-col gap-2">
                    <span className="text-meta font-bold text-ink-secondary uppercase tracking-widest">Room</span>
                    <input type="text" value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} placeholder="e.g. 101" className="border border-line bg-surface-v2 p-3 font-bold" />
                  </label>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button type="button" onClick={closeModal} className="px-6 py-3 font-bold tracking-[0.1em] uppercase text-micro text-ink-secondary hover:text-ink-v2">
                    Cancel
                  </button>
                  <button type="submit" className="px-6 py-3 bg-ink-v2 text-paper font-bold tracking-[0.1em] uppercase text-micro hover:opacity-90">
                    Save Slot
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}

