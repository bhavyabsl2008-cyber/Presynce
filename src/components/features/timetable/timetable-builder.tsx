"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useStore } from "@/store";
import { Subject, TimetableSlot, DayOfWeek } from "@/domain/models";

const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function TimetableBuilder() {
  const { subjects, slots, addSubject, removeSubject, addSlot, removeSlot } = useStore();
  
  const [newSubject, setNewSubject] = useState({ name: "", shortLabel: "", code: "", instructor: "", credits: 3 });
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [newSlot, setNewSlot] = useState({ day: "Monday" as DayOfWeek, startTime: "09:00", endTime: "10:00", room: "", type: "Lecture" as const });

  const handleAddSubject = () => {
    if (!newSubject.name || !newSubject.shortLabel) return;
    const s: Subject = {
      id: crypto.randomUUID(),
      ...newSubject
    };
    addSubject(s);
    setNewSubject({ name: "", shortLabel: "", code: "", instructor: "", credits: 3 });
  };

  const handleAddSlot = () => {
    if (!selectedSubjectId || !newSlot.room) return;
    const s: TimetableSlot = {
      id: crypto.randomUUID(),
      subjectId: selectedSubjectId,
      building: "Main", // Default for now
      ...newSlot
    };
    addSlot(s);
  };

  return (
    <div className="flex flex-col gap-12 w-full max-w-3xl mx-auto">
      {/* 1. Subjects Manager */}
      <section className="flex flex-col gap-6">
        <h2 className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary border-b border-line pb-4">
          1. ADD SUBJECTS
        </h2>
        
        <div className="flex flex-col gap-4">
          {subjects.map(s => (
            <div key={s.id} className="flex items-center justify-between p-4 bg-surface-v2 border border-line">
              <div>
                <div className="font-bold text-ink-v2">{s.name} ({s.shortLabel})</div>
                <div className="text-micro text-ink-tertiary">{s.instructor}</div>
              </div>
              <button onClick={() => removeSubject(s.id)} className="text-danger-v2 text-micro hover:underline">
                REMOVE
              </button>
            </div>
          ))}
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
            <input 
              type="text" placeholder="Full Name (e.g. Databases)" 
              value={newSubject.name} onChange={e => setNewSubject(d => ({ ...d, name: e.target.value }))}
              className="px-3 py-2 bg-paper border border-line outline-none text-ink-v2 text-body-v2 col-span-2"
            />
            <input 
              type="text" placeholder="Short (DBMS)" 
              value={newSubject.shortLabel} onChange={e => setNewSubject(d => ({ ...d, shortLabel: e.target.value }))}
              className="px-3 py-2 bg-paper border border-line outline-none text-ink-v2 text-body-v2"
            />
            <button onClick={handleAddSubject} disabled={!newSubject.name || !newSubject.shortLabel} className="bg-ink-v2 text-paper text-micro font-bold disabled:opacity-50">
              ADD
            </button>
          </div>
        </div>
      </section>

      {/* 2. Schedule Manager */}
      <section className="flex flex-col gap-6">
        <h2 className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary border-b border-line pb-4">
          2. SCHEDULE CLASSES
        </h2>
        
        {subjects.length === 0 ? (
          <p className="text-body-v2 text-ink-secondary">Add a subject first.</p>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="flex flex-wrap gap-2">
              {subjects.map(s => (
                <button 
                  key={s.id} 
                  onClick={() => setSelectedSubjectId(s.id)}
                  className={`px-4 py-2 text-micro font-bold border transition-colors ${selectedSubjectId === s.id ? 'bg-ink-v2 text-paper border-ink-v2' : 'bg-surface-v2 text-ink-v2 border-line hover:border-ink-secondary'}`}
                >
                  {s.shortLabel}
                </button>
              ))}
            </div>

            {selectedSubjectId && (
              <div className="flex flex-col gap-4 p-4 border border-line bg-surface-v2">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <select 
                    value={newSlot.day} onChange={e => setNewSlot(d => ({ ...d, day: e.target.value as DayOfWeek }))}
                    className="px-3 py-2 bg-paper border border-line outline-none text-ink-v2 text-body-v2"
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <input 
                    type="time" 
                    value={newSlot.startTime} onChange={e => setNewSlot(d => ({ ...d, startTime: e.target.value }))}
                    className="px-3 py-2 bg-paper border border-line outline-none text-ink-v2 text-body-v2"
                  />
                  <input 
                    type="time" 
                    value={newSlot.endTime} onChange={e => setNewSlot(d => ({ ...d, endTime: e.target.value }))}
                    className="px-3 py-2 bg-paper border border-line outline-none text-ink-v2 text-body-v2"
                  />
                  <input 
                    type="text" placeholder="Room"
                    value={newSlot.room} onChange={e => setNewSlot(d => ({ ...d, room: e.target.value }))}
                    className="px-3 py-2 bg-paper border border-line outline-none text-ink-v2 text-body-v2"
                  />
                  <button onClick={handleAddSlot} disabled={!newSlot.room} className="bg-ink-v2 text-paper text-micro font-bold disabled:opacity-50">
                    ADD SLOT
                  </button>
                </div>
                
                {/* Slots for this subject */}
                <div className="flex flex-col gap-2 mt-4">
                  <span className="text-micro font-bold text-ink-secondary uppercase">Scheduled Slots</span>
                  {slots.filter(s => s.subjectId === selectedSubjectId).map(slot => (
                    <div key={slot.id} className="flex justify-between items-center p-3 bg-paper border border-line">
                      <div className="flex gap-4 items-center">
                        <span className="font-bold text-ink-v2 w-24">{slot.day}</span>
                        <span className="text-body-v2 tabular-nums text-ink-secondary">{slot.startTime} - {slot.endTime}</span>
                        <span className="text-body-v2 text-ink-secondary">| {slot.room}</span>
                      </div>
                      <button onClick={() => removeSlot(slot.id)} className="text-danger-v2 text-micro hover:underline">
                        REMOVE
                      </button>
                    </div>
                  ))}
                  {slots.filter(s => s.subjectId === selectedSubjectId).length === 0 && (
                    <p className="text-micro text-ink-tertiary">No slots scheduled yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
